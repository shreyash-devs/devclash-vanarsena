import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, FileCode2, ChevronDown, ChevronRight, Search, Sparkles, FolderOpen, ArrowUpRight, ArrowDownLeft, PenLine } from 'lucide-react';
import IDELayout from '../components/IDE/IDELayout';
import { useStore } from '../store/useStore';
import ArchitectureGraph3D from '../components/Visualization/ArchitectureGraph3D';

const initialNodes3D: any[] = [
  { id: '1', label: 'main.py', role: 'entry', position: [0, 3, 0] },
  { id: '2', label: 'api/router.py', role: 'core', position: [2, 1.5, 0] },
  { id: '3', label: 'core/security.py', role: 'core', position: [-2, 1.5, 0] },
  { id: '4', label: 'db/session.py', role: 'core', position: [0, -1, 0] },
  { id: '5', label: 'models/user.py', role: 'core', position: [2, -3, 1] },
  { id: '6', label: 'models/item.py', role: 'core', position: [3, -3, -1] },
  { id: '7', label: 'crud/user.py', role: 'util', position: [4, -1, 2] },
  { id: '8', label: 'crud/item.py', role: 'util', position: [5, -1, -2] },
  { id: '9', label: 'schemas/user.py', role: 'util', position: [-3, -3, 1] },
  { id: '10', label: 'schemas/item.py', role: 'util', position: [-4, -3, -1] },
  { id: '11', label: 'core/config.py', role: 'util', position: [-4, 1.5, 2] },
  { id: '12', label: 'utils/logger.py', role: 'util', position: [-5, 0, -3] },
  { id: '13', label: 'tests/test_api.py', role: 'util', position: [0, 5, -2] },
];

const initialEdges3D = [
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

export default function MainExplorer() {
  const { selectedNodeId, setSelectedNodeId } = useStore();
  const [nodes] = useState(initialNodes3D);
  const [edges] = useState(initialEdges3D);
  
  const topbarCenter = (
    <div className="flex items-center gap-2 text-sm text-text-secondary">
      <FolderOpen size={16} className="text-accent" />
      <span>fastapi</span>
      <span className="opacity-50">/</span>
      <span className="text-text-primary">fastapi</span>
    </div>
  );

  const topbarRight = (
    <div className="flex flex-col">
       <div className="flex items-center gap-2 bg-background border border-border rounded px-2 py-1 text-xs text-text-secondary cursor-text">
        <Search size={14} />
        <span className="w-48 text-left">Ask anything...</span>
        <div className="flex gap-1">
          <span className="bg-surface px-1 rounded border border-border">CMD</span>
          <span className="bg-surface px-1 rounded border border-border">K</span>
        </div>
      </div>
    </div>
  );

  const sidebarContent = (
    <div className="flex flex-col py-2 font-sans text-[13px] select-none">
      <div className="flex items-center px-4 py-1.5 hover:bg-white/5 cursor-pointer text-white/80 group">
        <ChevronDown size={14} className="mr-2 opacity-40 group-hover:opacity-100 transition-opacity" />
        <FolderOpen size={16} className="text-accent mr-2" />
        <span className="font-semibold tracking-tight">fastapi</span>
      </div>
      
      {[
        { id: '1', name: 'main.py', role: 'Entry', color: 'indigo' },
        { id: '2', name: 'api/router.py', role: 'Core', color: 'blue' },
        { id: '3', name: 'core/security.py', role: 'Core', color: 'blue' },
        { id: '4', name: 'db/session.py', role: 'Core', color: 'blue' },
        { id: '11', name: 'core/config.py', role: 'Util', color: 'gray' },
        { id: '12', name: 'utils/logger.py', role: 'Util', color: 'gray' },
      ].map((file) => (
        <div 
          key={file.id}
          className={`flex items-center justify-between px-4 pl-9 py-1.5 hover:bg-white/10 cursor-pointer group transition-all duration-200 ${selectedNodeId === file.id ? 'bg-white/10' : ''}`}
          onClick={() => setSelectedNodeId(file.id)}
        >
          <div className="flex items-center text-white/70 group-hover:text-white transition-colors">
            <FileCode2 size={16} className="mr-2 opacity-50 group-hover:opacity-100" />
            <span className="truncate max-w-[120px]">{file.name}</span>
          </div>
          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-[4px] border uppercase tracking-wider
            ${file.color === 'indigo' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : ''}
            ${file.color === 'blue' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}
            ${file.color === 'gray' ? 'bg-white/5 text-white/40 border-white/10' : ''}
          `}>
            {file.role}
          </span>
        </div>
      ))}

      <div className="flex items-center px-4 pl-9 py-1.5 hover:bg-white/5 cursor-pointer text-white/40 group">
        <ChevronRight size={14} className="mr-2" />
        <Folder size={16} className="mr-2 opacity-50" />
        <span className="font-medium">models</span>
      </div>
      <div className="flex items-center px-4 pl-9 py-1.5 hover:bg-white/5 cursor-pointer text-white/40 group">
        <ChevronRight size={14} className="mr-2" />
        <Folder size={16} className="mr-2 opacity-50" />
        <span className="font-medium">schemas</span>
      </div>
    </div>
  );

  return (
    <IDELayout topbarCenter={topbarCenter} topbarRight={topbarRight} sidebarContent={sidebarContent}>
      <div className="w-full h-full relative overflow-hidden">
        <ArchitectureGraph3D 
          nodes={nodes} 
          edges={edges} 
          selectedId={selectedNodeId} 
          onSelect={setSelectedNodeId} 
        />

        <AnimatePresence>
          {selectedNodeId && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="absolute top-4 right-4 bottom-4 w-[360px] bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl flex flex-col font-sans z-30 overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 border-b border-white/5 h-14 shrink-0 bg-white/5">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-white/30">Node Intelligence</span>
                  <span className="font-bold text-white/90">Detailed Analysis</span>
                </div>
                <button 
                  onClick={() => setSelectedNodeId(null)} 
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all"
                >
                  <span className="text-2xl leading-none">&times;</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 custom-scrollbar">
                {/* AI Summary */}
                <section>
                  <div className="flex items-center gap-2 mb-4 text-[10px] font-bold tracking-widest text-accent uppercase">
                    <Sparkles size={14} />
                    AI Architectural Brief
                  </div>
                  <div className="p-5 bg-white/5 border border-white/5 rounded-xl text-white/70 italic text-sm leading-relaxed relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-accent opacity-50 group-hover:opacity-100 transition-opacity" />
                    "This module serves as the central orchestration layer for all HTTP traffic. It defines the root routing table and initializes the security middleware stack. Critical for system-wide authentication."
                  </div>
                </section>

                {/* Impact Metric */}
                <section>
                  <div className="flex items-center justify-between mb-3 text-[10px] font-bold tracking-widest text-white/30 uppercase">
                    <span>Impact Velocity</span>
                    <span className="text-accent">High Risk</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-3">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '82%' }}
                      className="h-full bg-gradient-to-r from-accent to-indigo-400 shadow-[0_0_15px_#6366f1]" 
                    />
                  </div>
                  <div className="text-[11px] text-white/50 bg-white/5 p-2 rounded-lg inline-block border border-white/5">
                    Modifying this file affects <span className="text-white font-bold px-1">24</span> downstream dependencies.
                  </div>
                </section>

                {/* Relationships */}
                <div className="grid grid-cols-2 gap-4">
                  <section className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <div className="text-[9px] font-bold tracking-widest text-white/30 uppercase mb-3">Imports</div>
                    <div className="flex flex-col gap-2">
                       <span className="text-xs text-white/60 hover:text-accent cursor-pointer transition-colors">fastapi.core</span>
                       <span className="text-xs text-white/60 hover:text-accent cursor-pointer transition-colors">pydantic</span>
                    </div>
                  </section>
                  <section className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <div className="text-[9px] font-bold tracking-widest text-white/30 uppercase mb-3">Required By</div>
                    <div className="flex flex-col gap-2">
                       <span className="text-xs text-white/60 hover:text-accent cursor-pointer transition-colors">main.py</span>
                       <span className="text-xs text-white/60 hover:text-accent cursor-pointer transition-colors">prod_server</span>
                    </div>
                  </section>
                </div>
              </div>

              <div className="p-6 mt-auto shrink-0 bg-white/5 border-t border-white/5">
                <button className="w-full flex items-center justify-center gap-2 py-3 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent/80 transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]">
                  <PenLine size={16} />
                  Execute Refactor
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </IDELayout>
  );
}
