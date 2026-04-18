import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Terminal, Plus, Star, FolderOpen, Clock, 
  ArrowRight, Globe, Sparkles, Cpu, Activity, Zap, Shield
} from 'lucide-react';
import CinematicVideoBackground from '../components/Visualization/CinematicVideoBackground';

export default function RepoOnboarding() {
  const [repoUrl, setRepoUrl] = useState('');
  const [isFocus, setIsFocus] = useState(false);
  const navigate = useNavigate();

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (repoUrl) navigate('/pipeline');
  };

  // Advanced Physics Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.15, 
        delayChildren: 0.4,
        ease: [0.23, 1, 0.32, 1] 
      }
    }
  };

  const cardVariants = {
    hidden: { y: 40, opacity: 0, scale: 0.95 },
    visible: { 
      y: 0, 
      opacity: 1,
      scale: 1,
      transition: { type: 'spring', stiffness: 80, damping: 15 }
    }
  };

  const recentRepos = [
    { name: 'fastapi/fastapi', date: '2h ago', stars: '65.2k', type: 'Framework', health: 98 },
    { name: 'facebook/react', date: '1d ago', stars: '221k', type: 'Library', health: 94 },
    { name: 'shreyash-devs/reposensei', date: 'Just now', stars: '1.2k', type: 'System', health: 100 }
  ];

  return (
    <div className="relative min-h-screen w-full bg-[#020205] text-white overflow-hidden font-sans selection:bg-accent/40">
      <CinematicVideoBackground />
      
      {/* Structural Dot Grid — Tactical Overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.04] z-10" 
        style={{ 
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', 
          backgroundSize: '48px 48px' 
        }} 
      />

      {/* Cinematic Navigation */}
      <nav className="relative z-[100] flex items-center justify-between px-8 md:px-16 h-24 backdrop-blur-xl border-b border-white/5 bg-black/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shadow-[0_0_25px_rgba(99,102,241,0.5)]">
            <Zap size={18} fill="white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-sans font-black tracking-[-0.05em] text-xl uppercase italic">RepoSensei</span>
            <span className="text-[8px] font-black tracking-[0.3em] uppercase text-white/20 mt-0.5">Neural Synthesis HUB</span>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
           <div className="hidden lg:flex items-center gap-8 text-[10px] font-black tracking-[0.3em] uppercase text-white/30">
              <span className="hover:text-white cursor-pointer transition-all hover:tracking-[0.4em]">Directory</span>
              <span className="hover:text-white cursor-pointer transition-all hover:tracking-[0.4em]">System Logs</span>
           </div>
           <div className="flex items-center gap-3 p-1.5 bg-white/5 border border-white/10 rounded-full">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                <Shield size={14} className="text-indigo-400" />
              </div>
              <span className="text-[9px] font-black tracking-widest text-white/40 border-r border-white/10 pr-4 mr-2">SECURE ENDPOINT</span>
              <div className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center mr-1">
                 <span className="text-xs">MK</span>
              </div>
           </div>
        </div>
      </nav>

      <main className="relative z-40 flex flex-col items-center pt-28 px-6 pb-32">
        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
          className="w-full max-w-6xl"
        >
          {/* Central Intel Header */}
          <div className="text-center mb-20">
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="inline-flex items-center gap-3 px-4 py-2 bg-accent/10 border border-accent/20 rounded-full mb-8 shadow-[0_0_30px_rgba(99,102,241,0.1)]"
             >
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-[10px] font-black tracking-[0.3em] text-accent uppercase">Link Established // Waiting for Target</span>
             </motion.div>
             <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-6 leading-[0.9]">
               Target <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-cyan-400">Project</span>
             </h1>
             <p className="text-white/40 text-xl font-medium tracking-tight max-w-2xl mx-auto">
               Supply a repository coordinates to begin high-fidelity structural synthesis.
             </p>
          </div>          {/* Deep Onyx Black Machined Command Hub */}
          <form onSubmit={handleAnalyze} className="relative mb-40 max-w-5xl mx-auto group/hub">
            <motion.div
              animate={{ 
                scale: isFocus ? 1.01 : 1,
                boxShadow: isFocus 
                  ? '0 60px 120px -20px rgba(99,102,241,0.2), inset 0 2px 0 rgba(255,255,255,0.05)' 
                  : '0 40px 80px -15px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.03)',
              }}
              className={`relative flex items-center overflow-hidden transition-all duration-700
                bg-gradient-to-br from-[#16161a] via-[#0a0a0c] to-[#050507] 
                border border-white/5 rounded-[48px] p-3
                before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/[0.05] before:to-transparent before:-translate-x-full group-hover/hub:before:translate-x-full before:transition-transform before:duration-1000
              `}
              style={{
                borderTop: '1px solid rgba(255,255,255,0.1)',
                borderLeft: '1px solid rgba(255,255,255,0.05)',
                borderRight: '1px solid rgba(0,0,0,0.8)',
                borderBottom: '1px solid rgba(0,0,0,0.9)',
              }}
            >
               {/* Internal Bevel Shadow for Onyx Depth */}
               <div className="absolute inset-0 rounded-[48px] shadow-[inset_0_20px_40px_rgba(0,0,0,0.8)] pointer-events-none" />

               <div className="pl-10 pr-6 border-r border-white/5 py-4 relative z-10">
                  <Globe className={`transition-all duration-700 ${isFocus ? 'text-accent rotate-12 scale-110 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'text-white/20'}`} size={32} />
               </div>
               <input 
                 type="text"
                 onFocus={() => setIsFocus(true)}
                 onBlur={() => setIsFocus(false)}
                 value={repoUrl}
                 onChange={(e) => setRepoUrl(e.target.value)}
                 className="flex-1 bg-transparent py-10 pl-10 pr-10 text-2xl font-bold focus:outline-none placeholder:text-white/40 relative z-10 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]"
                 placeholder="Search or paste GitHub URL..."
               />
               <motion.button 
                whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(99,102,241,0.4)' }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className={`relative z-10 flex items-center gap-4 px-14 h-[84px] rounded-[38px] font-black text-xs uppercase tracking-[0.3em] transition-all duration-700
                  ${repoUrl 
                    ? 'bg-white text-[#000000] shadow-[0_20px_50px_rgba(255,255,255,0.2),inset_0_4px_4px_rgba(255,255,255,0.8)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)]' 
                    : 'bg-white/10 text-[#000000]/20 grayscale pointer-events-none'
                  }
                `}
               >
                 Assemble
                 <ArrowRight size={20} className={repoUrl ? 'translate-x-1' : ''} />
               </motion.button>
            </motion.div>
            
            {/* Contextual HUD elements below input */}
            <div className="flex justify-between px-10 mt-6 pointer-events-none">
               <div className="flex gap-6 opacity-30 text-[9px] font-black uppercase tracking-widest">
                  <span className="flex items-center gap-2"><Cpu size={12} /> GPU Acceleration Active</span>
                  <span className="flex items-center gap-2"><Lock className="opacity-50" size={12} /> End-to-End Encrypted</span>
               </div>
               <div className="opacity-30 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                  <Activity size={12} className="animate-pulse" /> Synthesis Ready
               </div>
            </div>
          </form>

          {/* Recently Targeted Projects */}
          <div className="w-full">
            <div className="flex items-end justify-between mb-12 px-6">
               <div>
                  <h2 className="text-[11px] font-black tracking-[0.4em] uppercase text-accent mb-2">Target History</h2>
                  <p className="text-white/20 text-sm font-medium">Re-initialize existing neural maps.</p>
               </div>
               <button className="flex items-center gap-3 px-5 py-2.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-black tracking-widest text-white/40 uppercase hover:text-white hover:bg-white/10 transition-all">
                  ARCHIVE ACCESS <ArrowRight size={14} className="opacity-40" />
               </button>
            </div>

            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {recentRepos.map((repo, i) => (
                <motion.div
                  key={repo.name}
                  variants={cardVariants}
                  whileHover={{ 
                    y: -15,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderColor: 'rgba(255,255,255,0.15)',
                    boxShadow: '0 30px 60px -20px rgba(0,0,0,0.6)'
                  }}
                  onClick={() => setRepoUrl(`https://github.com/${repo.name}`)}
                  className="group relative p-12 bg-white/[0.02] backdrop-blur-[80px] border border-white/10 rounded-[48px] cursor-pointer transition-all duration-700 overflow-hidden"
                >
                   {/* Layered Energy Gradients inside card */}
                   <div className="absolute -top-20 -right-20 w-48 h-48 bg-accent/5 blur-[80px] rounded-full group-hover:bg-accent/10 transition-all duration-700" />
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                   
                   <div className="flex justify-between items-start mb-10 relative z-10">
                      <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-accent/15 transition-all duration-700 group-hover:border-accent/30">
                         <FolderOpen size={28} className="text-white/20 group-hover:text-accent transition-colors" />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                         <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                            <Star size={12} className="text-accent" />
                            <span className="text-[11px] font-black text-white/50">{repo.stars}</span>
                         </div>
                         <div className="text-[9px] font-black tracking-widest text-white/20 uppercase">{repo.type}</div>
                      </div>
                   </div>
                   
                   <div className="relative z-10">
                      <h3 className="font-bold text-2xl mb-4 truncate group-hover:text-white transition-colors tracking-tight">{repo.name}</h3>
                      
                      {/* Interactive Complexity Meter */}
                      <div className="mb-6">
                         <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-white/20 mb-2">
                            <span>Health Score</span>
                            <span className="text-accent">{repo.health}%</span>
                         </div>
                         <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${repo.health}%` }}
                              transition={{ duration: 1.5, delay: i * 0.2 }}
                              className="h-full bg-gradient-to-r from-accent to-indigo-400 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                            />
                         </div>
                      </div>

                      <div className="flex items-center justify-between text-white/25 text-[10px] font-black uppercase tracking-[0.2em]">
                         <span className="flex items-center gap-2"><Clock size={12} /> {repo.date}</span>
                         <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-4 transition-all duration-500 text-accent flex items-center gap-2">
                            RE-INITIALIZE <Sparkles size={12} />
                         </span>
                      </div>
                   </div>
                </motion.div>
              ))}
              
              {/* New Map Portal */}
              <motion.div
                variants={cardVariants}
                whileHover={{ y: -10, borderColor: 'rgba(99,102,241,0.4)', backgroundColor: 'rgba(99,102,241,0.05)' }}
                className="flex flex-col items-center justify-center p-12 bg-transparent border border-white/5 border-dashed rounded-[48px] group transition-all duration-500"
              >
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 group-hover:bg-accent/10 group-hover:scale-110 transition-all">
                     <Plus size={32} className="text-white/20 group-hover:text-accent" />
                  </div>
                  <span className="text-xs font-black tracking-[0.3em] uppercase text-white/20 group-hover:text-white transition-colors">Target New Domain</span>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </main>

      {/* Persistent Neural HUD — Minimized */}
      <footer className="fixed bottom-0 left-0 w-full px-12 py-10 flex justify-end items-end pointer-events-none z-[100]">
         <div className="text-right flex flex-col items-end gap-3 pr-4">
            <div className="flex gap-4">
               <SocialIcon icon={Globe} />
               <SocialIcon icon={Terminal} />
               <SocialIcon icon={Plus} />
            </div>
            <span className="text-[9px] font-black tracking-[0.3em] uppercase text-white/10">STARK PROTOCOL ACTIVE</span>
         </div>
      </footer>
    </div>
  );
}

function SocialIcon({ icon: Icon }: { icon: any }) {
   return (
      <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer pointer-events-auto">
         <Icon size={16} className="text-white/30" />
      </div>
   );
}

function Lock({ size, className }: { size?: number, className?: string }) {
   return <Shield size={size} className={className} />;
}
