import type { ReactNode } from 'react';
import { Files, Search, GitBranch, Blocks, Settings, Terminal } from 'lucide-react';
import { Link } from 'react-router-dom';

interface IDELayoutProps {
  children: ReactNode;
  topbarCenter?: ReactNode;
  topbarRight?: ReactNode;
  sidebarContent?: ReactNode;
}

const SIDEBAR_ITEMS = [
  { id: 'explorer', icon: Files, label: 'EXPLORER' },
  { id: 'search', icon: Search, label: 'SEARCH' },
  { id: 'source_control', icon: GitBranch, label: 'SOURCE CONTROL' },
];

const SIDEBAR_BOTTOM_ITEMS = [
  { id: 'extensions', icon: Blocks, label: 'EXTENSIONS' },
  { id: 'settings', icon: Settings, label: 'SETTINGS' },
];

export default function IDELayout({ children, topbarCenter, topbarRight, sidebarContent }: IDELayoutProps) {

  return (
    <div className="flex flex-col h-screen w-full bg-background text-text-primary overflow-hidden">
      {/* Top Bar */}
      <div className="h-12 border-b border-border bg-surface flex items-center justify-between px-4 shrink-0">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Terminal size={18} className="text-accent" />
          <span className="font-sans font-semibold tracking-wide text-sm">Repository Navigator</span>
        </Link>
        
        <div className="flex-1 flex justify-center">
          {topbarCenter}
        </div>

        <div className="flex items-center gap-4">
          {topbarRight}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar (Icon column) */}
        <div className="w-12 bg-surface border-r border-border flex flex-col items-center py-4 shrink-0 justify-between">
          <div className="flex flex-col gap-4 w-full">
            {SIDEBAR_ITEMS.map((item) => (
              <button 
                key={item.id} 
                className={`w-full flex justify-center py-2 relative transition-colors duration-150 ${item.id === 'explorer' ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}
                title={item.label}
              >
                {item.id === 'explorer' && (
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-accent" />
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

        {/* Primary Side Bar */}
        {sidebarContent && (
          <div className="w-[220px] bg-surface-flat border-r border-border flex flex-col shrink-0">
             <div className="px-4 py-3 text-[11px] font-mono tracking-wider text-text-secondary">
               EXPLORER
             </div>
             <div className="flex-1 overflow-y-auto">
                {sidebarContent}
             </div>
          </div>
        )}

        {/* Editor / Canvas Area */}
        <div className="flex-1 relative bg-background overflow-hidden relative">
          {children}
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-accent/10 border-t border-border flex items-center justify-between px-3 text-[11px] font-mono shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 opacity-80">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            INDEXED
          </span>
          <span className="opacity-60">UTF-8</span>
          <span className="opacity-60">Python 3.11</span>
          <span className="opacity-60">© 2024</span>
        </div>
        <div className="flex items-center gap-4 opacity-60">
          <Link to="#" className="hover:opacity-100 transition-opacity">Docs</Link>
          <Link to="#" className="hover:opacity-100 transition-opacity">API</Link>
          <Link to="#" className="hover:opacity-100 transition-opacity">Status</Link>
          <Link to="#" className="hover:opacity-100 transition-opacity">Privacy</Link>
        </div>
      </div>
    </div>
  );
}
