import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Loader2, User as UserIcon } from 'lucide-react';
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

const MOCK_NODES = [
  { id: '1', label: 'main.py', position: [0, 3, 0] as [number, number, number], role: 'entry' },
  { id: '2', label: 'api/router.py', position: [2, 1.5, 0] as [number, number, number], role: 'core' },
  { id: '3', label: 'core/security.py', position: [-2, 1.5, 0] as [number, number, number], role: 'core' },
  { id: '4', label: 'db/session.py', position: [0, -1, 0] as [number, number, number], role: 'core' },
  { id: '5', label: 'models/user.py', position: [2, -3, 1] as [number, number, number], role: 'core' },
  { id: '6', label: 'models/item.py', position: [3, -3, -1] as [number, number, number], role: 'core' },
  { id: '7', label: 'crud/user.py', position: [4, -1, 2] as [number, number, number], role: 'util' },
  { id: '8', label: 'crud/item.py', position: [5, -1, -2] as [number, number, number], role: 'util' },
  { id: '9', label: 'schemas/user.py', position: [-3, -3, 1] as [number, number, number], role: 'util' },
  { id: '10', label: 'schemas/item.py', position: [-4, -3, -1] as [number, number, number], role: 'util' },
  { id: '11', label: 'core/config.py', position: [-4, 1.5, 2] as [number, number, number], role: 'util' },
  { id: '12', label: 'utils/logger.py', position: [-5, 0, -3] as [number, number, number], role: 'util' },
  { id: '13', label: 'tests/test_api.py', position: [0, 5, -2] as [number, number, number], role: 'util' },
];

const MOCK_EDGES = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e1-3', source: '1', target: '3' },
  { id: 'e2-5', source: '2', target: '5' },
  { id: 'e2-6', source: '2', target: '6' },
  { id: 'e3-4', source: '3', target: '4' },
  { id: 'e4-5', source: '4', target: '5' },
  { id: 'e4-6', source: '4', target: '6' },
  { id: 'e5-7', source: '5', target: '7' },
  { id: 'e6-8', source: '6', target: '8' },
];

export default function AnalysisPipeline() {
  const navigate = useNavigate();
  const { analysisStage, analysisProgress, nodeCount, edgeCount, startAnalysis, abortProcess } = useStore();
  const [timeLeft] = useState('04:22');

  useEffect(() => {
    startAnalysis();
  }, [startAnalysis]);

  useEffect(() => {
    if (analysisStage === 4 && analysisProgress >= 100) {
      setTimeout(() => navigate('/explorer'), 2000);
    }
  }, [analysisStage, analysisProgress, navigate]);

  // Logic to show nodes appearing based on progress
  const visibleNodes = useMemo(() => {
    const totalNodes = MOCK_NODES.length;
    const countToShow = Math.floor((analysisProgress / 100) * (totalNodes + 2)); 
    return MOCK_NODES.slice(0, Math.min(countToShow, totalNodes));
  }, [analysisProgress]);

  const visibleEdges = useMemo(() => {
    return MOCK_EDGES.filter(edge => 
      visibleNodes.some(n => n.id === edge.source) && 
      visibleNodes.some(n => n.id === edge.target)
    );
  }, [visibleNodes]);

  const topbarCenter = (
    <div className="font-sans text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">
      ETA: <span className="text-accent">{timeLeft}</span>
    </div>
  );

  return (
    <IDELayout topbarCenter={topbarCenter}>
      <div className="h-full w-full flex bg-transparent relative overflow-hidden">
        
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
