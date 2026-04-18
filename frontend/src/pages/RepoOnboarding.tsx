import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Link2, Sparkles, Zap, Shield, GitBranch, History, TrendingUp, ChevronRight, Terminal } from 'lucide-react';
import IDELayout from '../components/IDE/IDELayout';
import { useStore } from '../store/useStore';

export default function RepoOnboarding() {
  const navigate = useNavigate();
  const { setRepoUrl } = useStore();
  const [inputUrl, setInputUrl] = useState('');
  const [branch, setBranch] = useState('main');

  const handleStartAnalysis = () => {
    if (!inputUrl.trim()) return;
    // Save the URL into global store so AnalysisPipeline picks it up
    setRepoUrl(inputUrl.trim());
    navigate('/pipeline');
  };

  const recentRepos = [
    'shreyash-devs/vanarsena',
    'facebook/react',
    'tailwindlabs/tailwindcss'
  ];

  const popularRepos = [
    'vercel/next.js',
    'microsoft/vscode',
    'anthropic/claude-ai'
  ];

  return (
    <IDELayout>
      <div className="w-full h-full flex flex-col items-center justify-center p-8 relative overflow-hidden bg-transparent">
        
        {/* Central Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xl z-10"
        >
          <div className="flex flex-col items-center mb-10 text-center">
             <div className="w-16 h-16 bg-accent/20 border border-accent/40 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                <Sparkles size={32} className="text-accent" />
             </div>
             <h1 className="text-4xl font-bold tracking-tight text-white mb-4">Analyze Your Codebase</h1>
             <p className="text-white/50 text-lg">Enter a GitHub URL to begin the architectural analysis.</p>
          </div>

          <div className="bg-indigo-950/20 backdrop-blur-3xl border border-indigo-500/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
             {/* Nebula Sheen Overlay */}
             <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent pointer-events-none" />
             
             <div className="flex flex-col gap-5 relative z-10">
                {/* URL Input */}
                <div className="relative group">
                   <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-white/30 group-focus-within:text-accent transition-colors">
                      <Link2 size={18} />
                   </div>
                   <input 
                      type="text" 
                      placeholder="https://github.com/owner/repository"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white placeholder:text-white/20 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all font-mono text-sm"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleStartAnalysis()}
                   />
                </div>

                <div className="flex gap-3">
                   {/* Branch Selector */}
                   <div className="flex-1 relative group">
                      <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-white/30 group-focus-within:text-accent transition-colors">
                         <GitBranch size={18} />
                      </div>
                      <select 
                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white appearance-none focus:outline-none focus:border-accent/50 transition-all font-mono text-sm"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                      >
                         <option value="main">main</option>
                         <option value="master">master</option>
                         <option value="develop">develop</option>
                      </select>
                   </div>

                   {/* Start Button */}
                   <button 
                      onClick={handleStartAnalysis}
                      disabled={!inputUrl.trim()}
                      className="flex-[1.2] bg-accent hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-2xl px-8 transition-all shadow-[0_4px_20px_rgba(99,102,241,0.4)] hover:shadow-[0_6px_25px_rgba(99,102,241,0.6)] flex items-center justify-center gap-2 group whitespace-nowrap"
                   >
                      Start Analysis
                      <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                   </button>
                </div>
             </div>

             {/* Features Tags */}
             <div className="flex flex-wrap justify-center gap-3 mt-8">
                {[
                  { icon: Zap, label: 'Fast Cloning', color: 'text-amber-400' },
                  { icon: Shield, label: 'Private Analytics', color: 'text-emerald-400' },
                  { icon: Terminal, label: 'Unified Graph', color: 'text-indigo-400' }
                ].map((tag, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-white/40">
                     <tag.icon size={12} className={tag.color} />
                     {tag.label}
                  </div>
                ))}
             </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-12 w-full">
             {/* Recent */}
             <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">
                   <History size={14} />
                   Recent Repositories
                </div>
                {recentRepos.map((repo, i) => (
                  <button 
                    key={i} 
                    className="text-left py-2 px-1 text-sm text-white/60 hover:text-white transition-colors border-b border-white/5 font-mono truncate"
                    onClick={() => setInputUrl(`https://github.com/${repo}`)}
                  >
                    {repo}
                  </button>
                ))}
             </div>

             {/* Popular */}
             <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">
                   <TrendingUp size={14} />
                   Popular Now
                </div>
                {popularRepos.map((repo, i) => (
                   <button 
                    key={i} 
                    className="text-left py-2 px-1 text-sm text-white/60 hover:text-white transition-colors border-b border-white/5 font-mono truncate"
                    onClick={() => setInputUrl(`https://github.com/${repo}`)}
                  >
                    {repo}
                  </button>
                ))}
             </div>
          </div>
        </motion.div>
      </div>
    </IDELayout>
  );
}
