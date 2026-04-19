import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, FileCode2, ChevronRight, Search, Sparkles, FolderOpen, ArrowUpRight, PenLine, Terminal } from 'lucide-react';
import IDELayout from '../components/IDE/IDELayout';
import { useStore } from '../store/useStore';
import ArchitectureGraph3D from '../components/Visualization/ArchitectureGraph3D';
import { API_BASE } from '../lib/api';
import {
  coerceCount,
  evaluateCouplingTier,
  evaluateImpactSpread,
  impactSpreadBarClass,
  totalCouplingEdges,
} from '../lib/explorerNodeVitals';

const initialNodes3D: any[] = [];
const initialEdges3D: any[] = [];

type IntelAccent = 'risk' | 'structure' | 'stable' | 'neutral';

function intelCardClasses(accent: IntelAccent) {
  switch (accent) {
    case 'risk':
      return 'border-red-500/35 bg-red-500/[0.06]';
    case 'structure':
      return 'border-sky-500/35 bg-sky-500/[0.06]';
    case 'stable':
      return 'border-emerald-500/30 bg-emerald-500/[0.05]';
    default:
      return 'border-white/5 bg-white/[0.03]';
  }
}

function metricAccent(metricId: string, numericValue: number): IntelAccent {
  if (metricId === 'churn') {
    if (numericValue >= 14) return 'risk';
    if (numericValue >= 5) return 'structure';
    return 'stable';
  }
  if (metricId === 'structure') return 'structure';
  return 'neutral';
}

const FileItem = ({ file, selectedId, onSelect }: { file: any, selectedId: string | null, onSelect: (id: string | null) => void }) => (
  <div 
    className={`flex items-center justify-between px-6 py-2.5 cursor-pointer group transition-all duration-300 relative
      ${selectedId === file.id ? 'bg-white/10' : 'hover:bg-white/5'}
    `}
    onClick={() => onSelect(file.id)}
  >
    {selectedId === file.id && (
      <motion.div 
        layoutId="activeFileGlow"
        className="absolute left-0 top-2 bottom-2 w-[3px] bg-accent rounded-r-full shadow-[0_0_15px_#6366f1]" 
      />
    )}
    <div className="flex items-center text-white/50 group-hover:text-white transition-colors relative z-10">
      <FileCode2 size={18} className={`mr-3 transition-all ${selectedId === file.id ? 'text-accent scale-110' : 'opacity-40'}`} />
      <span className={`truncate max-w-[130px] font-medium tracking-tight ${selectedId === file.id ? 'text-white font-bold' : ''}`}>
        {file.name.split('/').pop()}
      </span>
    </div>
    <span className={`text-[8px] font-black px-2 py-0.5 rounded-[5px] border uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity
      ${file.color === 'indigo' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : ''}
      ${file.color === 'blue' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : ''}
      ${file.color === 'gray' ? 'bg-white/10 text-white/60 border-white/20' : ''}
    `}>
      {file.role}
    </span>
  </div>
);

export default function MainExplorer() {
  const { selectedNodeId, setSelectedNodeId, repoId } = useStore();
  const [nodes, setNodes] = useState<any[]>(initialNodes3D);
  const [edges, setEdges] = useState<any[]>(initialEdges3D);
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch live graph data from Neo4j with retries.
  // Neo4j writes may complete slightly after navigation to this page,
  // so we poll up to 10 times before declaring failure.
  useEffect(() => {
    if (!repoId) return;
    setLoadError(false);
    setIsLoading(true);

    let attempts = 0;
    const MAX_ATTEMPTS = 10;
    const INTERVAL_MS = 2000;

    const tryFetch = async () => {
      try {
        const res = await fetch(`${API_BASE}/graph/${repoId}`);
        const data = await res.json();
        if (data && Array.isArray(data.nodes) && data.nodes.length > 0) {
          setNodes(data.nodes);
          setEdges(data.edges || []);
          setLoadError(false);
          setIsLoading(false);
          return true; // success
        }
      } catch (err) {
        console.error(`[MainExplorer] graph fetch attempt ${attempts + 1} failed:`, err);
      }
      return false; // not ready yet
    };

    const poll = setInterval(async () => {
      attempts++;
      const success = await tryFetch();
      if (success || attempts >= MAX_ATTEMPTS) {
        clearInterval(poll);
        if (!success) {
          setLoadError(true);
          setIsLoading(false);
        }
      }
    }, INTERVAL_MS);

    // Run immediately on mount too, don't wait for first interval
    tryFetch().then(success => {
      if (success) clearInterval(poll);
    });

    return () => clearInterval(poll);
  }, [repoId]);
  const [expandedFolders, setExpandedFolders] = useState<string[]>(['root']);
  const [activeInfoTab, setActiveInfoTab] = useState<'details' | 'code' | 'chat'>('details');
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'assistant', content: string}[]>([]);
  const [fileSearch, setFileSearch] = useState('');

  // Clear chat history when selecting a new node
  useEffect(() => {
    setChatHistory([]);
  }, [selectedNodeId]);

  const handleSendChat = async () => {
    if (!chatInput.trim() || !activeNode || isChatLoading) return;
    
    const query = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, {role: 'user', content: query}]);
    setIsChatLoading(true);

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/chat/node`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_id: activeNode.id,
          node_code: activeNode.code,
          node_summary: activeNode.summary,
          query: query,
          history: chatHistory
        })
      });

      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      setChatHistory(prev => [...prev, {role: 'assistant', content: data.response}]);
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, {role: 'assistant', content: 'Neural link disrupted. Communication with Groq failed.'}]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const toggleFolder = (folder: string) => {
    setExpandedFolders(prev => 
      prev.includes(folder) ? prev.filter(f => f !== folder) : [...prev, folder]
    );
  };

  // Filter nodes for the sidebar
  const displayedNodes = nodes.filter(node => 
    (node.id || '').toLowerCase().includes(fileSearch.toLowerCase()) || 
    (node.label || '').toLowerCase().includes(fileSearch.toLowerCase())
  );

  // Dynamically group files
  const filesByFolder: Record<string, any[]> = { 'root': [] };
  displayedNodes.forEach(node => {
     if (node.type === 'dir') return;
     const relativePath = (node.path || (node.id.includes(':') ? node.id.split(':').slice(1).join(':') : node.id)) as string;
     const parts = relativePath.split('/');
     const folderName = parts.length > 1 ? parts[0] : 'root';
     if (!filesByFolder[folderName]) filesByFolder[folderName] = [];
     filesByFolder[folderName].push({
        id: node.id,
        name: relativePath,
        role: node.role,
        color: node.role === 'Entry' ? 'indigo' : node.role === 'Core' ? 'blue' : 'gray'
     });
  });

  const rootFiles = filesByFolder['root'] || [];
  const subFolders = Object.keys(filesByFolder).filter(k => k !== 'root').map(k => ({
     id: k, name: k, files: filesByFolder[k]
  }));

  const topbarCenter = null;

  const topbarRight = null;

  const sidebarContent = (
    <div className="flex flex-col font-sans text-[14px] select-none bg-transparent h-full">
      {/* File Search Bar */}
      <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
        <div className="relative group">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-accent transition-colors" />
          <input 
            type="text"
            placeholder="Filter files..."
            value={fileSearch}
            onChange={(e) => setFileSearch(e.target.value)}
            className="w-full bg-black/40 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-accent/40 focus:bg-black/60 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar py-2">

      {/* Root Folder */}
      <div 
        className="flex items-center px-6 py-3 hover:bg-white/5 cursor-pointer text-white group transition-all"
        onClick={() => toggleFolder('root')}
      >
        <motion.div
          animate={{ rotate: expandedFolders.includes('root') ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight size={14} className="mr-3 opacity-40 group-hover:opacity-100" />
        </motion.div>
        <FolderOpen size={18} className="text-accent mr-3 shadow-[0_0_15px_rgba(99,102,241,0.4)]" />
        <span className="font-bold tracking-tight text-[15px]">RepoSensei</span>
      </div>

      <AnimatePresence initial={false}>
        {expandedFolders.includes('root') && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {/* Direct Files under root */}
            {rootFiles.map((file) => (
               <FileItem key={file.id} file={file} selectedId={selectedNodeId} onSelect={setSelectedNodeId} />
            ))}

            {/* Sub-Folders */}
            {subFolders.map((folder) => (
              <div key={folder.id} className="flex flex-col">
                <div 
                  className={`flex items-center px-6 py-2.5 hover:bg-white/5 cursor-pointer transition-all pl-10 group
                    ${expandedFolders.includes(folder.id) ? 'text-white' : 'text-white/40'}
                  `}
                  onClick={() => toggleFolder(folder.id)}
                >
                  <motion.div
                    animate={{ rotate: expandedFolders.includes(folder.id) ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight size={14} className="mr-3 opacity-30 group-hover:opacity-100" />
                  </motion.div>
                  <Folder size={18} className={`mr-3 transition-opacity ${expandedFolders.includes(folder.id) ? 'opacity-80' : 'opacity-30'}`} />
                  <span className="font-bold text-[13px] tracking-tight">{folder.name}</span>
                </div>

                <AnimatePresence>
                  {expandedFolders.includes(folder.id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden pl-6 border-l border-white/5 ml-12"
                    >
                      {folder.files.map(file => (
                        <FileItem key={file.id} file={file} selectedId={selectedNodeId} onSelect={setSelectedNodeId} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );

  const activeNode = nodes.find(n => n.id === selectedNodeId);
  const fanIn = coerceCount(activeNode?.in_degree);
  const fanOut = coerceCount(activeNode?.out_degree);
  const couplingCount = totalCouplingEdges(activeNode?.in_degree, activeNode?.out_degree);
  const couplingTier = evaluateCouplingTier(activeNode?.in_degree, activeNode?.out_degree);
  const impactSpread = evaluateImpactSpread(activeNode?.impact_score);

  const formatLastTouched = (iso?: string) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return iso;
    }
  };

  const HudMetric = ({
    label,
    value,
    accent = 'neutral',
  }: {
    label: string;
    value: string | number;
    accent?: IntelAccent;
  }) => (
    <div className={`p-3 rounded-xl border flex flex-col gap-0.5 min-w-0 ${intelCardClasses(accent)}`}>
      <span className="text-[8px] font-bold text-white/25 uppercase tracking-widest truncate">{label}</span>
      <span className="text-sm font-semibold text-white/90 tracking-tight truncate" title={String(value)}>{value}</span>
    </div>
  );

  return (
    <IDELayout topbarCenter={topbarCenter} topbarRight={topbarRight} sidebarContent={sidebarContent}>
      <div className="w-full h-full relative overflow-hidden">
        {isLoading && nodes.length === 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-xl border border-indigo-500/30 bg-indigo-950/60 text-indigo-300 text-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            Connecting to graph database...
          </div>
        )}
        {!isLoading && loadError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-xl border border-red-500/30 bg-red-950/60 text-red-300 text-sm">
            Unable to load graph data. Ensure Docker & Neo4j are running.
          </div>
        )}

        <ArchitectureGraph3D 
          nodes={nodes} 
          edges={edges} 
          selectedId={selectedNodeId} 
          onSelect={setSelectedNodeId} 
        />

        <AnimatePresence>
          {selectedNodeId && (
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              className="absolute top-4 right-4 bottom-4 w-[400px] bg-indigo-950/20 backdrop-blur-3xl border border-indigo-500/20 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col font-sans z-30 overflow-hidden"
            >
              {/* Nebula Sheen Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent pointer-events-none" />
              
              <div className="flex items-center justify-between px-8 border-b border-white/5 h-16 shrink-0 bg-white/5 relative z-10">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <Sparkles size={12} className="text-accent animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/30">Intelligence HUD</span>
                  </div>
                  <span className="font-bold text-white text-lg tracking-tight">
                    {activeInfoTab === 'details' && 'Node Metrics'}
                    {activeInfoTab === 'code' && 'Source Protocol'}
                    {activeInfoTab === 'chat' && 'Neural Link'}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedNodeId(null)} 
                  className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-white/10 text-white/40 hover:text-white transition-all border border-transparent hover:border-white/10"
                >
                  <span className="text-2xl font-light">&times;</span>
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex px-8 border-b border-white/5 bg-white/[0.01] shrink-0 relative z-10">
                {['details', 'code', 'chat'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveInfoTab(tab as any)}
                    className={`flex-1 py-3 text-[10px] font-black tracking-[0.2em] uppercase transition-all relative
                      ${activeInfoTab === tab ? 'text-accent' : 'text-white/30 hover:text-white/50'}
                    `}
                  >
                    {tab}
                    {activeInfoTab === tab && (
                      <motion.div layoutId="activeInfoTabLine" className="absolute bottom-0 left-4 right-4 h-0.5 bg-accent shadow-[0_0_10px_#6366f1]" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-10 no-scrollbar relative z-10">
                <AnimatePresence mode="wait">
                  {activeInfoTab === 'details' && (
                    <motion.div
                      key="details"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col gap-10"
                    >
                      {/* AI Briefing */}
                      <section className="relative">
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-[10px] font-bold tracking-[0.2em] text-accent uppercase">Architectural Brief</div>
                          <div className="px-2 py-0.5 rounded bg-accent/10 border border-accent/20 text-[9px] font-bold text-accent">AI GENERATED</div>
                        </div>
                        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl relative group overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-accent shadow-[0_0_15px_#6366f1]" />
                          <p className="text-white/70 italic text-sm leading-relaxed max-h-48 overflow-y-auto no-scrollbar">
                            {activeNode?.type === 'dir'
                              ? `Directory “${activeNode.path || activeNode.label}” — folder metrics below aggregate every analyzed file under this path (see 3D contains edges).`
                              : `"${activeNode?.summary || 'File structure identified. Awaiting complete neural analysis parsing...'}"`}
                          </p>
                        </div>
                      </section>

                      {/* Tactical Metrics */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-5 rounded-2xl border border-white/5 flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Couplings</span>
                          <span className="text-2xl font-bold text-white tracking-tighter tabular-nums">{couplingCount}</span>
                          <span className="text-[10px] text-white/35 mt-0.5 tabular-nums">
                            fan-in {fanIn} · fan-out {fanOut}
                          </span>
                        </div>
                        <div
                          className="bg-white/5 p-5 rounded-2xl border border-white/5 flex flex-col gap-1"
                          title={couplingTier.description}
                        >
                          <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Coupling tier</span>
                          <span className="text-2xl font-bold text-indigo-400 tracking-tighter underline decoration-indigo-500/30 decoration-dotted underline-offset-4">
                            {couplingTier.code}
                            <span className="text-[10px] font-medium text-white/35 tracking-normal ml-1.5 font-sans">
                              {couplingTier.severity}
                            </span>
                          </span>
                        </div>
                      </div>

                      <section className="flex flex-col gap-4">
                          <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                            <div className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">Intelligence metrics</div>
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              {(() => {
                                const s = (activeNode?.intel_signal || 'stable') as 'risk' | 'structure' | 'stable';
                                const pill =
                                  s === 'risk'
                                    ? 'bg-red-500/20 text-red-200 border-red-500/45'
                                    : s === 'structure'
                                      ? 'bg-sky-500/20 text-sky-100 border-sky-500/45'
                                      : 'bg-emerald-500/15 text-emerald-100 border-emerald-500/40';
                                const label =
                                  s === 'risk' ? 'Risk (churn / coupling)' : s === 'structure' ? 'Structure (density)' : 'Stable baseline';
                                return (
                                  <span
                                    className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${pill}`}
                                    title="Derived from AST + git history: red = hot or fragile, blue = structurally dense, green = calmer baseline."
                                  >
                                    {label}
                                  </span>
                                );
                              })()}
                              {activeNode?.circular_dep && (
                                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-500/40">
                                  Circular import
                                </span>
                              )}
                              {activeNode?.type === 'dir' && (
                                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-white/10 text-white/60 border border-white/15">
                                  Folder aggregate
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <HudMetric label="line_count" value={Number(activeNode?.line_count ?? 0)} accent="neutral" />
                            <HudMetric label="function_count" value={Number(activeNode?.function_count ?? 0)} accent="structure" />
                            <HudMetric label="class_count" value={Number(activeNode?.class_count ?? 0)} accent="structure" />
                            <HudMetric label="export_count" value={Number(activeNode?.export_count ?? 0)} accent="structure" />
                            <HudMetric label="language" value={(activeNode?.language || '—').toString()} />
                            <HudMetric
                              label="commits touching (90d)"
                              value={Number(activeNode?.change_frequency ?? 0)}
                              accent={metricAccent('churn', Number(activeNode?.change_frequency ?? 0))}
                            />
                          </div>
                          <div className="grid grid-cols-1 gap-3">
                            <HudMetric label="last_modified" value={formatLastTouched(activeNode?.last_modified)} />
                            <HudMetric label="primary_author" value={(activeNode?.primary_author || '—').toString()} />
                          </div>
                          <div>
                            <div className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-2">external_deps</div>
                            <div className="flex flex-wrap gap-1.5">
                              {(Array.isArray(activeNode?.external_deps) && activeNode.external_deps.length > 0)
                                ? activeNode.external_deps.map((p: string) => (
                                    <span key={p} className="text-[10px] px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-200 border border-indigo-500/25 font-mono">
                                      {p}
                                    </span>
                                  ))
                                : <span className="text-xs text-white/35">None detected</span>}
                            </div>
                          </div>
                          <div>
                            <div className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-2">co_changed_with</div>
                            <ul className="text-xs text-white/60 space-y-1 max-h-28 overflow-y-auto custom-scrollbar font-mono">
                              {(Array.isArray(activeNode?.co_changed_with) && activeNode.co_changed_with.length > 0)
                                ? activeNode.co_changed_with.map((rel: string) => (
                                    <li key={rel} className="truncate" title={rel}>{rel.split('/').pop() || rel}</li>
                                  ))
                                : <li className="text-white/35">No co-change signal in sampled history</li>}
                            </ul>
                          </div>
                        </section>

                      <section>
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">Impact spread</div>
                          <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                            PageRank · {impactSpread.band}
                          </div>
                        </div>
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/5 relative overflow-hidden">
                          <div className="flex items-end justify-between mb-2 gap-3">
                            <span className="text-sm font-bold text-white/80 tracking-tight">Graph influence</span>
                            <span className="text-xs font-bold text-accent tabular-nums shrink-0">{impactSpread.percent}%</span>
                          </div>
                          <p className="text-[11px] text-white/45 leading-snug mb-4">{impactSpread.caption}</p>
                          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${impactSpread.percent}%` }}
                              transition={{ delay: 0.5, duration: 1 }}
                              className={`h-full ${impactSpreadBarClass(impactSpread.band)}`}
                            />
                          </div>
                        </div>
                      </section>
                    </motion.div>
                  )}

                  {activeInfoTab === 'code' && (
                    <motion.div
                      key="code"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="h-full"
                    >
                      <div className="bg-black/40 border border-white/10 rounded-2xl p-6 font-mono text-xs text-white/60 leading-relaxed overflow-hidden relative max-h-[420px] overflow-y-auto no-scrollbar">
                         <div className="absolute top-0 right-0 p-2 opacity-20"><Terminal size={40} /></div>
                         {activeNode?.type === 'dir' ? (
                           <p className="text-white/50 whitespace-pre-wrap">Select a file node to view source. This is a folder in the repo tree.</p>
                         ) : (
                           <pre className="whitespace-pre-wrap break-words text-left m-0">
                             {activeNode?.code || 'No source captured for this file.'}
                           </pre>
                         )}
                      </div>
                      <div className="mt-6 flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
                         <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Language</span>
                         <span className="text-xs font-bold text-accent px-2 py-1 bg-accent/10 rounded-lg uppercase">{(activeNode?.language || activeNode?.label.split('.').pop() || 'UNKNOWN').toString()}</span>
                      </div>
                    </motion.div>
                  )}

                  {activeInfoTab === 'chat' && (
                    <motion.div
                      key="chat"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="flex flex-col h-full gap-6"
                    >
                      <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar pr-2 pb-4">
                         {chatHistory.length === 0 && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center shrink-0">
                                  <Sparkles size={14} className="text-accent" />
                                </div>
                                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-none text-sm text-white/80 leading-relaxed">
                                  System linked to {activeNode?.label || 'node'}. I have access to the file's code and structural role. What architectural insights do you need?
                                </div>
                            </div>
                         )}
                         {chatHistory.map((msg, i) => (
                           <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                              {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center shrink-0 mt-1">
                                  <Sparkles size={14} className="text-accent" />
                                </div>
                              )}
                              <div className={`${msg.role === 'user' ? 'bg-accent/20 border border-accent/40 rounded-tr-none text-white/90' : 'bg-white/5 border border-white/10 rounded-tl-none text-white/80'} p-4 rounded-2xl text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap`}>
                                 {msg.content}
                              </div>
                           </div>
                         ))}
                         {isChatLoading && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center shrink-0">
                                  <div className="w-3 h-3 rounded-full bg-accent animate-ping" />
                                </div>
                                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-none text-sm text-white/50 italic">
                                  Computing neural response...
                                </div>
                            </div>
                         )}
                      </div>
                      <div className="mt-auto relative shrink-0">
                         <input 
                           type="text" 
                           value={chatInput}
                           onChange={(e) => setChatInput(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                           disabled={isChatLoading}
                           placeholder="Type a neural query..."
                           className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-6 pr-14 text-sm text-white focus:outline-none focus:border-accent/50 transition-all disabled:opacity-50"
                         />
                         <button 
                           onClick={handleSendChat}
                           disabled={isChatLoading || !chatInput.trim()}
                           className="absolute right-4 top-1/2 -translate-y-1/2 text-accent p-2 hover:bg-accent/10 rounded-xl transition-all disabled:opacity-50"
                         >
                            <ArrowUpRight size={20} />
                         </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {activeInfoTab !== 'chat' && (
                <div className="p-8 mt-auto shrink-0 bg-white/5 border-t border-white/5 relative z-10">
                  <button className="w-full flex items-center justify-center gap-3 py-4 bg-accent text-white rounded-2xl font-bold text-sm hover:translate-y-[-2px] active:translate-y-[0px] transition-all shadow-[0_10px_30px_rgba(99,102,241,0.3)] hover:shadow-[0_15px_40px_rgba(99,102,241,0.5)] group">
                    <PenLine size={18} className="group-hover:rotate-12 transition-transform" />
                    Initiate AI Refactor
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </IDELayout>
  );
}
