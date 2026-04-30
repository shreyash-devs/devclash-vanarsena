import { useState, type ReactNode } from 'react';
import { Files, Terminal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import InteractiveBackground from '../Visualization/InteractiveBackground';

interface IDELayoutProps {
  children: ReactNode;
  topbarCenter?: ReactNode;
  topbarRight?: ReactNode;
  sidebarContent?: ReactNode;
}

const SIDEBAR_ITEMS = [
  { id: 'explorer', icon: Files, label: 'EXPLORER' },
];

const SIDEBAR_BOTTOM_ITEMS: any[] = [];

export default function IDELayout({ children, topbarCenter, topbarRight, sidebarContent }: IDELayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex flex-col h-screen w-full bg-transparent text-text-primary overflow-hidden font-sans">
      <InteractiveBackground />
      
      {/* Top Bar */}
      <div className="h-12 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between px-4 shrink-0 z-20">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Terminal size={18} className="text-accent" />
          <span className="font-sans font-bold tracking-tight text-sm text-white/90">RepoSensei</span>
        </Link>
        
        <div className="flex-1 flex justify-center">
          {topbarCenter}
        </div>

        <div className="flex items-center gap-4">
          {topbarRight}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden z-10">
        {/* Activity Bar (Icon column) */}
        <div className="w-12 bg-black/50 backdrop-blur-md border-r border-white/5 flex flex-col items-center py-4 shrink-0 justify-between">
          <div className="flex flex-col gap-4 w-full">
            {SIDEBAR_ITEMS.map((item) => (
              <button 
                key={item.id} 
                onClick={() => item.id === 'explorer' && setIsSidebarOpen(!isSidebarOpen)}
                className={`w-full flex justify-center py-2 relative transition-colors duration-150 ${item.id === 'explorer' && isSidebarOpen ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}
                title={item.label}
              >
                {item.id === 'explorer' && isSidebarOpen && (
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-accent shadow-[0_0_10px_#6366f1]" />
                )}
                <item.icon size={22} strokeWidth={1.5} />
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-4 w-full pb-2">
            {SIDEBAR_BOTTOM_ITEMS.map((item) => (
              <button 
                key={item.id} 
                className="w-full flex justify-center py-2 text-text-secondary hover:text-text-primary transition-colors duration-150"
                title={item.label}
              >
                <item.icon size={22} strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </div>

        {/* Primary Side Bar - Floating Tactical Panel */}
        <AnimatePresence>
          {sidebarContent && isSidebarOpen && (
            <motion.div 
              initial={{ x: -340, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -340, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="absolute top-16 left-16 bottom-4 w-[320px] bg-indigo-950/20 backdrop-blur-3xl border border-indigo-500/20 rounded-[32px] flex flex-col shrink-0 z-30 shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden"
            >
               {/* Nebula Sheen Overlay */}
               <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent pointer-events-none" />
               
               {/* Header Section */}
               <div className="px-8 py-5 flex items-center justify-between border-b border-white/5 bg-white/[0.01]">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <Files size={12} className="text-accent" />
                      <span className="text-[10px] font-black tracking-[0.2em] text-white/30 uppercase">Workspace Nav</span>
                    </div>
                    <span className="font-bold text-white tracking-tight">Project Files</span>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-accent/40 border border-accent/60 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
               </div>
               
               <div className="flex-1 overflow-y-auto no-scrollbar">
                  {sidebarContent}
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Editor / Canvas Area */}
        <div className="flex-1 relative bg-transparent overflow-hidden">
          {children}
        </div>
      </div>

    </div>
  );
}
