import { create } from 'zustand';
import { API_BASE } from '../lib/api';

function formatAnalysisError(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err);
  const isNetwork =
    m === 'Failed to fetch' ||
    m === 'Load failed' ||
    (err instanceof TypeError && m.includes('fetch'));
  if (isNetwork) {
    return [
      'Could not reach the backend API.',
      '1) Start FastAPI: cd backend && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000',
      '2) Start Docker Desktop, then: docker compose up -d (Postgres, Redis, Neo4j)',
      '3) Start Celery: cd backend && celery -A app.worker:celery_app worker --loglevel=info',
      '4) Open the app from Vite (npm run dev) so /api is proxied.',
    ].join(' ');
  }
  return m || 'Unknown error occurred.';
}
let isStartingAnalysis = false;

const deriveRepoId = (url: string): string => {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].toLowerCase()}-${parts[1].replace('.git', '').toLowerCase()}`;
    }
    if (parts.length === 1) {
      return parts[0].replace('.git', '').toLowerCase();
    }
  } catch {
    const fallback = url.split('/').pop() ?? 'unknown-repo';
    return fallback.replace('.git', '').toLowerCase();
  }
  return 'unknown-repo';
};

interface AppState {
  // Active repo context shared across pages
  repoUrl: string;
  jobId: string | null;
  repoId: string | null;
  setRepoUrl: (url: string) => void;

  // Screen 2 related state
  analysisProgress: number;
  analysisStage: number;
  nodeCount: number;
  edgeCount: number;
  analysisError: string | null;
  abortProcess: () => void;
  startAnalysis: (url: string) => void;

  // Screen 3 related state
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  repoUrl: '',
  jobId: null,
  repoId: null,
  analysisProgress: 0,
  analysisStage: 0,
  nodeCount: 0,
  edgeCount: 0,
  analysisError: null,
  selectedNodeId: null,
  searchQuery: '',

  setRepoUrl: (url) => set({ repoUrl: url }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  abortProcess: () => set({ analysisStage: 0, analysisProgress: 0, nodeCount: 0, edgeCount: 0, jobId: null, repoId: null, analysisError: null }),

  startAnalysis: async (url: string) => {
    if (isStartingAnalysis) {
      return;
    }
    const current = get();
    if (current.jobId && current.analysisProgress > 0 && current.analysisProgress < 100) {
      return;
    }

    isStartingAnalysis = true;
    set({ repoUrl: url, analysisProgress: 5, analysisStage: 0, analysisError: null });

    const derivedRepoId = deriveRepoId(url);

    try {
      // ── STEP 0: Check if Neo4j already has data for this repo ──────────────
      // If yes, skip the full analysis and navigate directly to the explorer
      const checkRes = await fetch(`${API_BASE}/graph/check/${derivedRepoId}`);
      if (checkRes.ok) {
        const { exists, node_count } = await checkRes.json();
        if (exists && node_count > 0) {
          console.info(`[startAnalysis] Neo4j already has ${node_count} nodes for ${derivedRepoId} — skipping re-analysis`);
          set({
            repoId: derivedRepoId,
            analysisProgress: 100,
            analysisStage: 4,
            nodeCount: node_count,
            edgeCount: Math.floor(node_count * 0.8),
          });
          return; // AnalysisPipeline's useEffect will navigate to /explorer
        }
      }

      // ── STEP 1: POST to backend to trigger Celery job ──────────────────────
      const res = await fetch(`${API_BASE}/repos/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: url }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Backend error ${res.status}: ${text}`);
      }
      const { job_id, repo_id } = await res.json();
      const activeRepoId = repo_id || derivedRepoId;
      set({ jobId: job_id, repoId: activeRepoId, analysisProgress: 10 });

      // ── STEP 2: Status → Stage + Progress maps ─────────────────────────────
      const STEP_MAP: Record<string, number> = {
        queued: 0, pending: 0,
        running: 0, cloning: 0, clone: 0, init: 0,
        extract: 1, parsing: 1,
        build_dep_graph: 2, classify_tiers: 2, score_impact: 2, detect_orphans: 2,
        generate_summaries: 3, embed_summaries: 3,
        store_in_neo4j: 4, generate_onboarding: 4, complete: 4, completed: 4,
      };
      const PROGRESS_MAP: Record<string, number> = {
        queued: 5, pending: 5,
        running: 10, cloning: 15, clone: 18, init: 8,
        extract: 25, parsing: 35,
        build_dep_graph: 50, classify_tiers: 55, score_impact: 60, detect_orphans: 65,
        generate_summaries: 70, embed_summaries: 82,
        store_in_neo4j: 90, generate_onboarding: 95, complete: 100, completed: 100,
      };

      // ── STEP 3: Poll until done or failed ──────────────────────────────────
      await new Promise<void>((resolve, reject) => {
        if ((window as any).activePoll) clearInterval((window as any).activePoll);
        const poll = setInterval(async () => {
          try {
            const statusRes = await fetch(`${API_BASE}/repos/analyze/${job_id}`);
            if (!statusRes.ok) return;
            const data = await statusRes.json();
            const s = (data.status || 'pending').toLowerCase();
            const processed = data.files_processed || 0;
            const total = data.total_files || 0;
            const currentRepoId = data.repo_id || get().repoId || activeRepoId;

            let stage = STEP_MAP[s] ?? get().analysisStage;
            let progress = PROGRESS_MAP[s] ?? get().analysisProgress;

            // Smooth interpolation within file-processing stages
            if (total > 0 && (s === 'parsing' || s === 'generate_summaries' || s === 'embed_summaries')) {
              const ratio = processed / total;
              const stageStart = s === 'parsing' ? 30 : 70;
              const stageWeight = s === 'parsing' ? 20 : 15;
              progress = Math.min(stageStart + (ratio * stageWeight), stageStart + stageWeight);
            }

            // ENFORCE STRICT FORWARD-ONLY PROGRESS
            const finalProgress = Math.max(get().analysisProgress, progress);
            const finalStage = Math.max(get().analysisStage, stage);

            set({
              repoId: currentRepoId,
              analysisStage: finalStage,
              analysisProgress: finalProgress,
              nodeCount: processed,
              edgeCount: Math.floor(processed * 1.5),
            });

            if (s === 'completed' || s === 'complete' || s === 'success') {
              clearInterval(poll);
              let graphNodeCount = processed;
              let graphEdgeCount = Math.floor(processed * 1.5);
              try {
                const graphRes = await fetch(`${API_BASE}/graph/${currentRepoId}`);
                if (graphRes.ok) {
                  const graph = await graphRes.json();
                  graphNodeCount = Array.isArray(graph?.nodes) ? graph.nodes.length : graphNodeCount;
                  graphEdgeCount = Array.isArray(graph?.edges) ? graph.edges.length : graphEdgeCount;
                }
              } catch (graphErr) {
                console.warn('[poll] failed to fetch final graph metrics', graphErr);
              }

              set({
                repoId: currentRepoId,
                analysisProgress: 100,
                analysisStage: 4,
                nodeCount: graphNodeCount,
                edgeCount: graphEdgeCount,
              });
              resolve();
            } else if (s === 'failed' || s === 'failure') {
              clearInterval(poll);
              reject(new Error('Analysis job failed on the server.'));
            }
          } catch (e) {
            console.warn('[poll] transient error, retrying...', e);
          }
        }, 2000);
        (window as any).activePoll = poll;
      });

    } catch (err: unknown) {
      console.error('[startAnalysis] fatal error:', err);
      set({ analysisError: formatAnalysisError(err) });
    } finally {
      isStartingAnalysis = false;
    }
  },
}));

