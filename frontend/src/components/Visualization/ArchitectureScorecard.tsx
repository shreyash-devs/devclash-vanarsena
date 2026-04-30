import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  X, 
  Activity, 
  ShieldCheck, 
  TrendingUp,
  Cpu,
  Layers
} from 'lucide-react';

interface ScorecardProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: {
    nodes: any[];
    edges: any[];
  };
}

const GradeBadge = ({ grade }: { grade: string }) => {
  const colors: Record<string, string> = {
    'A': 'from-emerald-400 to-teal-500 shadow-emerald-500/20',
    'B': 'from-blue-400 to-indigo-500 shadow-blue-500/20',
    'C': 'from-amber-400 to-orange-500 shadow-amber-500/20',
    'D': 'from-orange-400 to-red-500 shadow-orange-500/20',
    'F': 'from-red-500 to-rose-700 shadow-red-500/40',
  };

  return (
    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colors[grade] || colors['C']} flex items-center justify-center text-3xl font-black text-white shadow-2xl`}>
      {grade}
    </div>
  );
};

export default function ArchitectureScorecard({ isOpen, onClose, metrics }: ScorecardProps) {
  const { nodes, edges } = metrics;
  
  // Logic Calculations
  const fileNodes = nodes.filter(n => n.type !== 'dir');
  const totalFiles = fileNodes.length || 1;
  const totalConnections = edges.length;
  
  // 1. Coupling Grade
  const avgCoupling = (totalConnections * 2) / totalFiles;
  let couplingGrade = 'A';
  if (avgCoupling > 10) couplingGrade = 'F';
  else if (avgCoupling > 7) couplingGrade = 'D';
  else if (avgCoupling > 4) couplingGrade = 'C';
  else if (avgCoupling > 2) couplingGrade = 'B';

  // 2. Complexity Grade (Functions per file)
  const totalFunctions = fileNodes.reduce((acc, n) => acc + (n.function_count || 0), 0);
  const avgComplexity = totalFunctions / totalFiles;
  let complexityGrade = 'A';
  if (avgComplexity > 30) complexityGrade = 'F';
  else if (avgComplexity > 20) complexityGrade = 'D';
  else if (avgComplexity > 10) complexityGrade = 'C';
  else if (avgComplexity > 5) complexityGrade = 'B';

  // 3. Stability Grade (Orphan ratio)
  const connectedNodes = new Set();
  edges.forEach(e => { connectedNodes.add(e.source); connectedNodes.add(e.target); });
  const connectedRatio = connectedNodes.size / totalFiles;
  let stabilityGrade = 'A';
  if (connectedRatio < 0.5) stabilityGrade = 'F';
  else if (connectedRatio < 0.7) stabilityGrade = 'D';
  else if (connectedRatio < 0.85) stabilityGrade = 'C';
  else if (connectedRatio < 0.95) stabilityGrade = 'B';

  const overallScore = (
    (couplingGrade === 'A' ? 4 : couplingGrade === 'B' ? 3 : couplingGrade === 'C' ? 2 : 1) +
    (complexityGrade === 'A' ? 4 : complexityGrade === 'B' ? 3 : complexityGrade === 'C' ? 2 : 1) +
    (stabilityGrade === 'A' ? 4 : stabilityGrade === 'B' ? 3 : stabilityGrade === 'C' ? 2 : 1)
  ) / 3;
  
  const overallGrade = overallScore > 3.5 ? 'A' : overallScore > 2.5 ? 'B' : overallScore > 1.5 ? 'C' : 'D';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 pointer-events-none">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-auto"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl bg-[#0f111a]/90 backdrop-blur-2xl border border-white/10 rounded-[40px] shadow-[0_32px_64px_rgba(0,0,0,0.5)] overflow-hidden pointer-events-auto"
          >
            {/* Header */}
            <div className="px-10 pt-10 pb-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-accent/20 text-accent">
                  <Trophy size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Architectural Scorecard</h2>
                  <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Repository Health Audit</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Main Score */}
            <div className="px-10 py-6 border-y border-white/5 bg-white/[0.02] flex items-center gap-8">
              <GradeBadge grade={overallGrade} />
              <div className="flex-1">
                <div className="text-sm font-bold text-white/80 mb-1">Overall System Integrity</div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(overallScore / 4) * 100}%` }}
                    className="h-full bg-gradient-to-r from-accent to-indigo-400"
                  />
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <div className="text-[10px] text-white/30 uppercase font-black">Score: {overallScore.toFixed(1)}/4.0</div>
                  <div className="text-[10px] text-emerald-400 uppercase font-black flex items-center gap-1">
                    <TrendingUp size={10} /> Optimal Range
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Metrics */}
            <div className="p-10 grid grid-cols-3 gap-6">
              <MetricCard 
                icon={Layers}
                label="Coupling" 
                value={avgCoupling.toFixed(1)}
                desc="Avg Links/File"
                grade={couplingGrade}
              />
              <MetricCard 
                icon={Cpu}
                label="Complexity" 
                value={avgComplexity.toFixed(0)}
                desc="Fn/File"
                grade={complexityGrade}
              />
              <MetricCard 
                icon={ShieldCheck}
                label="Stability" 
                value={`${(connectedRatio * 100).toFixed(0)}%`}
                desc="Active Code"
                grade={stabilityGrade}
              />
            </div>

            {/* Footer / AI Insight */}
            <div className="px-10 pb-10">
              <div className="p-6 rounded-3xl bg-accent/5 border border-accent/10 flex gap-4">
                <Activity size={20} className="text-accent shrink-0 mt-1" />
                <div>
                  <h4 className="text-sm font-bold text-accent mb-1 uppercase tracking-wider">AI Recommendation</h4>
                  <p className="text-xs text-white/60 leading-relaxed">
                    {overallGrade === 'A' 
                      ? "Your architecture is highly modular and stable. Maintain current documentation patterns."
                      : overallGrade === 'B' 
                      ? "System health is good. Consider reviewing tightly coupled utilities in the core modules."
                      : "Critical technical debt detected. Focus on decoupling 'God Files' and removing orphaned modules."}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function MetricCard({ icon: Icon, label, value, desc, grade }: any) {
  const gradeColors: Record<string, string> = {
    'A': 'text-emerald-400',
    'B': 'text-blue-400',
    'C': 'text-amber-400',
    'D': 'text-orange-400',
    'F': 'text-red-400',
  };

  return (
    <div className="flex flex-col gap-3 p-5 rounded-[24px] bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors group">
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-lg bg-white/5 text-white/60 group-hover:text-accent transition-colors">
          <Icon size={16} />
        </div>
        <span className={`text-sm font-black ${gradeColors[grade]}`}>{grade}</span>
      </div>
      <div>
        <div className="text-[10px] text-white/30 uppercase font-black mb-0.5">{label}</div>
        <div className="text-xl font-black text-white">{value}</div>
        <div className="text-[9px] text-white/20 font-bold uppercase">{desc}</div>
      </div>
    </div>
  );
}
