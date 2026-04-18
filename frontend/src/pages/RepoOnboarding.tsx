import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Terminal, Plus, Star, FolderOpen, Clock, 
  ArrowRight, Globe, Sparkles
} from 'lucide-react';
import InteractiveBackground from '../components/Visualization/InteractiveBackground';

export default function RepoOnboarding() {
  const [repoUrl, setRepoUrl] = useState('');
  const [isFocus, setIsFocus] = useState(false);
  const navigate = useNavigate();

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (repoUrl) navigate('/pipeline');
  };

  // Staggered Entrance Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.3 }
    }
  };

  const cardVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 100, damping: 20 }
    }
  };

  const recentRepos = [
    { name: 'fastapi/fastapi', date: '2h ago', stars: '65.2k' },
    { name: 'facebook/react', date: '1d ago', stars: '221k' },
    { name: 'shreyash-devs/reposensei', date: 'Just now', stars: '0.1k' }
  ];

  return (
    <div className="relative min-h-screen w-full bg-[#010103] text-white overflow-hidden font-sans selection:bg-accent/30">
      <InteractiveBackground />
      
      {/* Structural Dot Grid Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.08]" 
        style={{ 
          backgroundImage: 'radial-gradient(circle, #6366f1 1.2px, transparent 1.2px)', 
          backgroundSize: '40px 40px' 
        }} 
      />

      {/* Stitch-Style Navigation Overlay */}
      <nav className="relative z-50 flex items-center justify-between px-10 md:px-16 h-28 border-b border-white/5 bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-4 group cursor-pointer">
          <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.2)]">
            <Terminal size={20} className="text-accent" />
          </div>
          <span className="font-sans font-black tracking-[-0.05em] text-xl uppercase italic">RepoSensei</span>
        </div>
        
        <div className="flex items-center gap-6">
           <div className="hidden sm:flex items-center gap-6 text-[10px] font-black tracking-[0.2em] uppercase text-white/30 mr-8">
              <span className="hover:text-white cursor-pointer transition-colors">Resources</span>
              <span className="hover:text-white cursor-pointer transition-colors">Labs</span>
           </div>
           <motion.button 
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
             className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors shadow-xl"
           >
              <Plus size={20} className="text-white/60" />
           </motion.button>
           <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-indigo-600 flex items-center justify-center shadow-[0_10px_30px_rgba(99,102,241,0.4)] cursor-pointer">
              <Star size={20} fill="white" />
           </div>
        </div>
      </nav>

      <main className="relative z-40 flex flex-col items-center pt-32 px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
          className="w-full max-w-5xl"
        >
          {/* Hero Prompt */}
          <div className="text-center mb-16">
             <motion.h1 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="text-6xl md:text-7xl font-bold tracking-tight mb-6 leading-none"
             >
               Blueprint your <span className="text-white/20 italic">vision</span>
             </motion.h1>
             <p className="text-white/30 text-lg md:text-xl font-medium tracking-tight">Enter a project URL to initiate the 3D synthesis.</p>
          </div>

          {/* Command Input (The Focus of the Page) */}
          <form onSubmit={handleAnalyze} className="relative mb-32 max-w-4xl mx-auto">
            <motion.div
              animate={{ 
                scale: isFocus ? 1.015 : 1,
                boxShadow: isFocus ? '0 0 100px rgba(99,102,241,0.15)' : 'none',
                borderColor: isFocus ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'
              }}
              className="relative p-3 bg-white/[0.03] backdrop-blur-[60px] border border-white/10 rounded-[40px] transition-all duration-500"
            >
               <div className="absolute left-10 top-1/2 -translate-y-1/2">
                  <Globe className={`transition-all duration-500 ${isFocus ? 'text-accent scale-110' : 'text-white/20'}`} size={28} />
               </div>
               <input 
                 type="text"
                 onFocus={() => setIsFocus(true)}
                 onBlur={() => setIsFocus(false)}
                 value={repoUrl}
                 onChange={(e) => setRepoUrl(e.target.value)}
                 className="w-full bg-transparent py-10 pl-24 pr-48 text-2xl font-medium focus:outline-none placeholder:text-white/5"
                 placeholder="Search or paste repository URL..."
               />
               <button 
                type="submit"
                className={`absolute right-6 top-6 bottom-6 px-12 bg-white text-black rounded-[30px] font-black text-xs uppercase tracking-[0.2em] transition-all duration-500
                  ${repoUrl ? 'opacity-100 scale-100' : 'opacity-20 scale-95 pointer-events-none grayscale'}
                `}
               >
                 Synthesize
               </button>
            </motion.div>
          </form>

          {/* Staggered Quick-Start Section */}
          <div className="w-full max-w-5xl">
            <div className="flex items-center justify-between mb-10 px-4">
               <h2 className="text-[10px] font-black tracking-[0.3em] uppercase text-white/20">Recently Visualized</h2>
               <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.1em] text-accent uppercase cursor-pointer hover:opacity-80 transition-opacity">
                  View History <ArrowRight size={14} />
               </div>
            </div>

            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {recentRepos.map((repo) => (
                <motion.div
                  key={repo.name}
                  variants={cardVariants}
                  whileHover={{ 
                    y: -12, 
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderColor: 'rgba(99,102,241,0.3)'
                  }}
                  onClick={() => setRepoUrl(`https://github.com/${repo.name}`)}
                  className="p-10 bg-white/[0.02] backdrop-blur-3xl border border-white/[0.08] rounded-[36px] cursor-pointer group transition-all duration-500 relative overflow-hidden"
                >
                   {/* Internal Glow Effect */}
                   <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[60px] translate-x-12 -translate-y-12" />
                   
                   <div className="flex justify-between items-start mb-8 relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-accent/10 transition-all duration-500">
                         <FolderOpen size={24} className="text-white/20 group-hover:text-accent transition-colors" />
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                         <Star size={12} className="text-white/20" />
                         <span className="text-[10px] font-bold text-white/30">{repo.stars}</span>
                      </div>
                   </div>
                   
                   <h3 className="font-bold text-xl mb-3 truncate group-hover:text-white transition-colors tracking-tight">{repo.name}</h3>
                   <div className="flex items-center gap-3 text-white/20 text-[10px] font-black uppercase tracking-widest">
                      <Clock size={12} />
                      {repo.date}
                      <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-accent ml-auto">
                        Quick Launch
                      </span>
                   </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </main>

      {/* Stitch Design System Detail: Kinetic Footer Stat */}
      <footer className="fixed bottom-10 left-0 w-full px-16 flex justify-between items-end pointer-events-none z-50">
         <div className="flex flex-col gap-2">
            <span className="text-[9px] font-black tracking-[0.4em] uppercase text-white/10">Architecture Synthesizer v3.0</span>
            <div className="flex items-center gap-4">
               <div className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_10px_#6366f1]" />
               <span className="text-[10px] font-black tracking-[0.2em] uppercase text-white/40">Nexus-Link: Established</span>
            </div>
         </div>
      </footer>
    </div>
  );
}
