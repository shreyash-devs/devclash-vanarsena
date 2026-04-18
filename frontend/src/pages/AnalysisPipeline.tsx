import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import IDELayout from '../components/IDE/IDELayout';
import { useStore } from '../store/useStore';

const STAGES = [
  { id: 0, title: 'Cloning', activeText: 'Receiving objects', doneText: '1.2GB received' },
  { id: 1, title: 'Parsing', activeText: 'Processing files', doneText: '8,421 files processed' },
  { id: 2, title: 'Building Graph', activeText: 'Mapping edges', doneText: '42,903 edges mapped' },
  { id: 3, title: 'Generating Summaries', activeText: 'Running LLM', doneText: 'Summaries ready' },
  { id: 4, title: 'Indexing', activeText: 'Building search index', doneText: 'Indexed' },
];

import ArchitectureGraph3D from '../components/Visualization/ArchitectureGraph3D';
import { API_BASE } from '../lib/api';

export default function AnalysisPipeline() {
  const navigate = useNavigate();
  const { analysisStage, analysisProgress, nodeCount, edgeCount, startAnalysis, abortProcess, repoUrl, repoId, analysisError } = useStore();
  const [timeLeft] = useState('04:22');
  const hasStartedRef = useRef(false);

  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);

  useEffect(() => {
    if (repoUrl && !hasStartedRef.current) {
      hasStartedRef.current = true;
      startAnalysis(repoUrl);
    }
  }, [repoUrl, startAnalysis]);

  // Only auto-navigate when analysis actually completed AND there's no error
  useEffect(() => {
    if (analysisStage === 4 && analysisProgress >= 100 && !analysisError) {
      setTimeout(() => navigate('/explorer'), 2000);
    }
  }, [analysisStage, analysisProgress, analysisError, navigate]);

  useEffect(() => {
    if (!repoId) return;
    fetch(`${API_BASE}/graph/${repoId}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.nodes) {
          setNodes(data.nodes);
          setEdges(data.edges || []);
        }
      })
      .catch(console.error);
  }, [repoId]);

  // Logic to show nodes appearing based on progress
  const visibleNodes = useMemo(() => {
    const totalNodes = nodes.length;
    if (totalNodes === 0) return [];
    const countToShow = Math.floor((analysisProgress / 100) * (totalNodes + 2)); 
    return nodes.slice(0, Math.min(countToShow, totalNodes));
  }, [analysisProgress, nodes]);

  const visibleEdges = useMemo(() => {
    return edges.filter(edge => 
      visibleNodes.some(n => n.id === edge.source) && 
      visibleNodes.some(n => n.id === edge.target)
    );
  }, [visibleNodes, edges]);

  const topbarCenter = (
    <div className="font-sans text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">
      ETA: <span className="text-accent">{timeLeft}</span>
    </div>
  );

  return (
    <IDELayout topbarCenter={topbarCenter}>
      <div className="h-full w-full flex bg-transparent relative overflow-hidden">
        
        {/* Error Banner */}
        {analysisError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-[min(640px,94vw)] max-h-[70vh] overflow-y-auto bg-red-950/80 backdrop-blur-md border border-red-500/30 rounded-2xl p-4 flex items-start gap-4 shadow-2xl">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0 text-red-400 font-bold text-lg">!</div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-1">Analysis Failed</div>
              <p className="text-xs text-white/80 font-mono whitespace-pre-wrap break-words leading-relaxed">{analysisError}</p>
            </div>
            <button onClick={() => navigate('/onboarding')} className="shrink-0 text-xs text-red-400 hover:text-white border border-red-500/30 hover:border-white/20 px-3 py-1.5 rounded-lg transition-all">
              Retry
            </button>
          </div>
        )}

        {/* Live 3D Build Animation Area */}
        <div className="flex-1 relative">
           <div className="absolute top-8 left-8 z-10">
              <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/5 py-2 px-4 rounded-full">
                 <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
                 <span className="text-[10px] font-bold tracking-[0.2em] text-white/80 uppercase">Live Synthesis Rendering</span>
              </div>
           </div>
           
           <ArchitectureGraph3D 
              nodes={visibleNodes as any} 
              edges={visibleEdges as any} 
              selectedId={null} 
              onSelect={() => {}} 
           />
        </div>

        {/* Right Panel - The Dashboard */}
        <div className="w-[400px] h-full bg-indigo-950/20 backdrop-blur-3xl border-l border-indigo-500/20 flex flex-col pt-8 font-sans shrink-0 z-20 relative overflow-hidden">
          {/* Nebula Sheen Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent pointer-events-none" />
          
          <div className="px-8 mb-10 relative z-10">
            <h2 className="text-xl font-bold text-white mb-2">Analysis Engine</h2>
            <p className="text-xs text-white/40 font-medium tracking-tight">Processing architectural patterns and dependency maps.</p>
          </div>
          
          <div className="flex-1 overflow-y-auto px-8 flex flex-col gap-8 custom-scrollbar">
            {STAGES.map((stage) => {
              const isDone = analysisStage > stage.id;
              const isActive = analysisStage === stage.id;
              const isQueued = analysisStage < stage.id;

              return (
                <div key={stage.id} className="flex gap-5 relative group">
                  {/* Vertical Connector */}
                  {stage.id < STAGES.length - 1 && (
                    <div className="absolute left-[13px] top-8 bottom-[-32px] w-[1px] bg-white/5 group-hover:bg-accent/20 transition-colors" />
                  )}

                  <div className="shrink-0 relative z-10">
                    {isDone ? (
                      <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                        <Check size={14} />
                      </div>
                    ) : isActive ? (
                      <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent flex items-center justify-center text-accent animate-pulse shadow-[0_0_20px_rgba(99,102,241,0.5)]">
                        <Loader2 size={14} className="animate-spin" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col flex-1 pb-2">
                    <div className={`text-sm font-bold tracking-tight ${isQueued ? 'text-white/20' : 'text-white/80'}`}>
                      {stage.title}
                    </div>
                    {(isActive || isDone) && (
                      <div className="mt-1.5 flex flex-col">
                        <span className={`text-[11px] font-medium ${isActive ? 'text-accent' : 'text-white/40'}`}>
                          {isActive ? stage.activeText : stage.doneText}
                        </span>
                        
                        {isActive && (
                          <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(analysisProgress % 20) * 5}%` }}
                              className="h-full bg-accent shadow-[0_0_10px_#6366f1]"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Real-time Counters */}
          <div className="p-8 bg-black/40 border-t border-white/5 flex gap-8">
             <div className="flex-1">
               <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Nodes Discovered</div>
               <div className="text-xl font-bold text-white/90 font-mono tracking-tighter">{nodeCount.toLocaleString()}</div>
             </div>
             <div className="flex-1">
               <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Dependency Edges</div>
               <div className="text-xl font-bold text-white/90 font-mono tracking-tighter">{edgeCount.toLocaleString()}</div>
             </div>
          </div>

          <div className="p-8 mt-auto shrink-0">
            <button 
              onClick={() => { abortProcess(); navigate('/onboarding'); }}
              className="w-full py-4 text-[10px] font-bold tracking-[0.2em] text-[#e11d48] border border-[#e11d48]/20 rounded-xl hover:bg-[#e11d48]/10 transition-all uppercase"
            >
              Terminate Process
            </button>
          </div>
        </div>
      </div>
    </IDELayout>
  );
}
