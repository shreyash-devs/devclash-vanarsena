import { useEffect, useState } from 'react';
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

export default function AnalysisPipeline() {
  const navigate = useNavigate();
  const { analysisStage, analysisProgress, nodeCount, edgeCount, startAnalysis, abortProcess } = useStore();
  const [timeLeft] = useState('04:22');

  useEffect(() => {
    startAnalysis();
    return () => {
      // Don't abort on unmount to keep state if navigated, or we can reset
    };
  }, [startAnalysis]);

  useEffect(() => {
    if (analysisStage === 4) {
      setTimeout(() => navigate('/explorer'), 1000); // Wait 1s then go to explorer
    }
  }, [analysisStage, navigate]);

  const topbarCenter = (
    <div className="font-mono text-xs text-text-secondary">
      EST. REMAINING: <span className="text-text-primary">{timeLeft}</span>
    </div>
  );

  const topbarRight = (
    <div className="w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-text-secondary">
      <UserIcon size={14} />
    </div>
  );

  return (
    <IDELayout topbarCenter={topbarCenter} topbarRight={topbarRight}>
      <div className="h-full w-full flex bg-background relative">
        {/* Main Content Area empty with a faint grid/pattern for aesthetics */}
        <div className="flex-1 border-r border-border pattern-grid-lg opacity-20" />

        {/* Right Panel */}
        <div className="w-[380px] h-full bg-surface-flat flex flex-col pt-6 font-sans border-l border-border shrink-0 z-10">
          <div className="px-6 mb-8 text-accent font-semibold tracking-wide">Analysis Pipeline</div>
          
          <div className="flex-1 overflow-y-auto px-6 flex flex-col gap-6">
            {STAGES.map((stage) => {
              const isDone = analysisStage > stage.id;
              const isActive = analysisStage === stage.id;
              const isQueued = analysisStage < stage.id;

              return (
                <div key={stage.id} className="flex gap-4 relative">
                  {/* Vertical Line for Stepper */}
                  {stage.id < STAGES.length - 1 && (
                    <div className="absolute left-3.5 top-8 bottom-[-24px] w-[2px] bg-border" />
                  )}

                  <div className="shrink-0 relative z-10 mt-1">
                    {isDone ? (
                      <div className="w-7 h-7 rounded-full bg-green-500/20 border border-green-500 flex items-center justify-center text-green-400">
                        <Check size={14} />
                      </div>
                    ) : isActive ? (
                      <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent flex items-center justify-center text-accent">
                        <Loader2 size={14} className="animate-spin" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-surface border border-border flex items-center justify-center text-text-secondary">
                        <div className="w-2 h-2 rounded-full bg-text-secondary" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col flex-1">
                    <div className={`font-medium ${isQueued ? 'text-text-secondary' : 'text-text-primary'}`}>
                      {stage.title}
                    </div>
                    {(isActive || isDone) && (
                      <div className="mt-1 flex items-center gap-2">
                        {isActive && (
                          <span className="px-2 py-0.5 rounded border border-accent/30 bg-accent/10 text-xs font-mono text-accent animate-pulse">
                            {stage.id === 2 ? `Mapping ${edgeCount} edges` : stage.activeText}
                          </span>
                        )}
                        {isDone && (
                          <span className="text-xs font-mono text-text-secondary">
                            {stage.doneText}
                          </span>
                        )}
                      </div>
                    )}

                    {isActive && (
                      <div className="mt-4 h-1.5 w-full bg-surface rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-accent transition-all duration-150 ease-linear"
                          style={{ width: `${(analysisProgress % 20) * 5}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-6 border-t border-border mt-auto">
            <button 
              onClick={() => { abortProcess(); navigate('/'); }}
              className="w-full py-3 bg-[#e11d48]/10 text-[#e11d48] border border-[#e11d48]/50 rounded font-mono text-sm hover:bg-[#e11d48]/20 transition-colors"
            >
              ABORT PROCESS
            </button>
          </div>
        </div>

        {/* Counter floating card bottom right of MAIN canvas (not right panel) */}
        {!analysisStage !== undefined && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-6 right-[404px] bg-surface border border-border p-4 rounded-md shadow-lg font-mono text-sm flex gap-6"
          >
           <div>
             <div className="text-text-secondary text-xs mb-1">NODES</div>
             <div className="text-accent text-lg">{nodeCount.toLocaleString()}</div>
           </div>
           <div>
             <div className="text-text-secondary text-xs mb-1">EDGES</div>
             <div className="text-accent text-lg">{edgeCount.toLocaleString()}</div>
           </div>
          </motion.div>
        )}
      </div>
    </IDELayout>
  );
}
