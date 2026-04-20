import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Shield, Terminal, ArrowLeft, ArrowRight, Cpu } from 'lucide-react';
import { useStore } from '../store/useStore';
import Plasma from '../components/Visualization/Plasma';

export default function RepoOnboarding() {
  const navigate = useNavigate();
  const { setRepoUrl } = useStore();
  const [inputUrl, setInputUrl] = useState('');

  const handleStartAnalysis = () => {
    if (!inputUrl.trim()) return;
    // Save the URL into global store so AnalysisPipeline picks it up
    setRepoUrl(inputUrl.trim());
    navigate('/pipeline');
  };


  return (
    <div className="w-screen h-screen flex flex-col relative overflow-hidden bg-black font-sans">
      
      {/* Custom Glassmorphic Navbar (Matching Landing.tsx) */}
      <nav className="fixed top-0 left-0 w-full z-[100] h-20 backdrop-blur-xl bg-black/20 flex items-center px-8 md:px-16 border-b border-white/5 gap-6">
        <button 
          onClick={() => navigate('/')} 
          className="text-white/50 hover:text-white transition-colors p-2 -ml-2 rounded-full hover:bg-white/5"
          title="Back to Home"
        >
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-transparent border border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.6)]">
            <Zap size={20} className="text-indigo-400" fill="currentColor" />
          </div>
          <span className="font-bold text-2xl italic tracking-tight text-white">RepoSensei</span>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 w-full h-full flex flex-col items-start justify-start px-8 pt-32 md:pt-48 relative overflow-y-auto bg-transparent">
        
        {/* Container to enforce max width and centered horizontal layout */}
        <div className="w-full h-full flex flex-col items-center">
          
        {/* Plasma Background Layer */}
        <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }}>
          <Plasma 
            color="#ff6b35"
            speed={0.6}
            direction="forward"
            scale={1.1}
            opacity={0.8}
            mouseInteractive={true}
          />
        </div>

        {/* Central Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl z-10 pointer-events-auto"
        >
          <div className="flex flex-col items-center mb-12 text-center pointer-events-none">
             <h1 className="text-5xl md:text-6xl font-bold tracking-tighter text-white mb-6 drop-shadow-xl">Analyze Your Codebase</h1>
             <p className="text-white/60 text-lg md:text-xl font-medium tracking-wide drop-shadow-md">Enter a GitHub URL to begin the architectural analysis.</p>
          </div>

          {/* Unified Dialog Box Input */}
          <div className="w-full bg-white/[0.03] backdrop-blur-3xl border border-white/5 rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.8)] overflow-hidden relative z-10 mt-8 mb-4">
            
            {/* Top Row: Input & Submit */}
            <div className="flex items-center w-full px-4 py-3">
               <div className="text-white/40 ml-3 mr-4 font-mono font-bold text-lg select-none">
                  {'</>'}
               </div>
               <input 
                  type="text" 
                  placeholder="What repo shall we map?"
                  className="flex-1 bg-transparent border-none text-white placeholder:text-white/30 focus:outline-none focus:ring-0 text-base md:text-lg font-sans font-medium h-14"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartAnalysis()}
               />
               <button 
                  onClick={handleStartAnalysis}
                  disabled={!inputUrl.trim()}
                  className="bg-white hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold rounded-[14px] px-6 py-2.5 transition-colors flex items-center justify-center gap-2 tracking-tight ml-2 shadow-lg"
               >
                  Map Repo <ArrowRight size={16} strokeWidth={2.5} />
               </button>
            </div>

            {/* Subtle Divider */}
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />

            {/* Bottom Row: Context Toggles & Status */}
            <div className="flex items-center justify-between px-6 py-4 bg-black/20">
               <div className="flex-1" />
               
               <div className="flex items-center gap-2 text-white/30 text-xs font-mono font-bold tracking-widest uppercase">
                  <Cpu size={14} className="text-white/20" />
                  AI Model · v3.0
               </div>
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

        </motion.div>
        
        </div>
      </div>
    </div>
  );
}
