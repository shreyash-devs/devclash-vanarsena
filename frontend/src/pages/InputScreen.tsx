import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, Settings, Folder, Search, GitMerge, RotateCcw, Link as LinkIcon, ChevronDown, Zap, Shield, GitPullRequest } from 'lucide-react';

export default function InputScreen() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [branch, setBranch] = useState('main');

  return (
    <div className="flex h-screen w-full bg-background text-text-primary font-sans overflow-hidden">
      {/* Sidebar - Tight Left */}
      <div className="w-16 bg-surface border-r border-border flex flex-col items-center py-4 shrink-0 justify-between">
        <div className="flex flex-col gap-6 w-full">
          <button className="w-full flex justify-center py-2 relative text-mono border-l-2 border-mono" title="Explorer">
            <Folder size={24} strokeWidth={1.5} />
          </button>
          <button className="w-full flex justify-center py-2 text-text-secondary hover:text-text-primary transition-colors" title="Search">
            <Search size={24} strokeWidth={1.5} />
          </button>
          <button className="w-full flex justify-center py-2 text-text-secondary hover:text-text-primary transition-colors" title="Tree">
            <GitMerge size={24} strokeWidth={1.5} />
          </button>
          <button className="w-full flex justify-center py-2 text-text-secondary hover:text-text-primary transition-colors" title="History">
            <RotateCcw size={24} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="flex flex-col flex-1 relative overflow-hidden">
        {/* Topbar */}
        <div className="h-14 border-b border-border bg-surface-flat flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-2 text-text-primary">
            <Terminal size={22} className="text-mono" />
            <span className="font-semibold tracking-wide text-lg text-text-primary">RepoLens</span>
          </div>
          <button className="text-text-secondary hover:text-text-primary transition-colors">
            <Settings size={20} />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 pattern-grid-lg flex flex-col items-center pt-24 overflow-y-auto px-6 relative">
          <div className="mb-6 flex justify-center w-full">
            <div className="w-16 h-16 bg-surface border border-border rounded-xl flex items-center justify-center shadow-2xl">
              <GitMerge size={32} className="text-mono" />
            </div>
          </div>
          
          <h1 className="text-5xl font-bold tracking-tight text-center mb-4 leading-tight max-w-xl">
            Analyze Your<br />Codebase
          </h1>
          <p className="text-xl text-text-secondary mb-12 text-center max-w-lg">
            Enter a GitHub URL to begin the architectural analysis.
          </p>

          <div className="w-full max-w-2xl bg-surface border border-border p-6 rounded-xl shadow-2xl mb-12 relative z-10">
            <div className="flex items-center bg-background border border-border rounded-md px-4 py-3 mb-4">
              <LinkIcon size={18} className="text-text-secondary mr-3" />
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="bg-transparent border-none outline-none flex-1 text-text-primary font-mono text-sm placeholder:text-text-secondary/50"
              />
            </div>
            
            <div className="flex gap-4">
              <div className="relative flex-1">
                <select 
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full appearance-none bg-background border border-border rounded-md px-4 py-3 text-text-primary font-mono text-sm outline-none cursor-pointer"
                >
                  <option value="main">main</option>
                  <option value="master">master</option>
                  <option value="dev">dev</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
                  <ChevronDown size={16} />
                </div>
              </div>
              <button 
                onClick={() => navigate('/pipeline')}
                className="bg-mono text-background hover:bg-mono/90 transition-colors font-semibold px-8 rounded-md flex-1 text-center"
              >
                Start Analysis
              </button>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-col gap-3 mb-16 items-center">
             <div className="px-4 py-1.5 rounded-full bg-surface border border-border flex items-center gap-2 text-text-secondary text-xs font-mono w-max">
                <Zap size={14} className="text-yellow-500" /> FAST CLONING
             </div>
             <div className="px-4 py-1.5 rounded-full bg-surface border border-border flex items-center gap-2 text-text-secondary text-xs font-mono w-max">
                <Shield size={14} className="text-mono" /> PRIVATE ANALYTICS
             </div>
             <div className="px-4 py-1.5 rounded-full bg-surface border border-border flex items-center gap-2 text-text-secondary text-xs font-mono w-max">
                <GitPullRequest size={14} className="text-blue-500" /> UML GENERATION
             </div>
          </div>

          {/* Repositories Cards */}
          <div className="w-full max-w-2xl grid md:grid-cols-2 gap-6 pb-20">
            <div className="bg-surface-flat border border-border p-6 rounded-xl">
              <h3 className="font-bold flex items-center gap-2 mb-4">
                 <RotateCcw size={16} /> Recent Repositories
              </h3>
              <div className="flex flex-col gap-3 font-mono text-sm text-text-secondary">
                <div className="hover:text-mono cursor-pointer transition-colors">facebook/react</div>
                <div className="hover:text-mono cursor-pointer transition-colors">tailwindlabs/tailwindcss</div>
              </div>
            </div>
            
            <div className="bg-surface-flat border border-border p-6 rounded-xl">
              <h3 className="font-bold flex items-center gap-2 mb-4">
                 <Zap size={16} /> Popular Now
              </h3>
              <div className="flex flex-col gap-3 font-mono text-sm text-text-secondary">
                <div className="hover:text-mono cursor-pointer transition-colors">vercel/next.js</div>
                <div className="hover:text-mono cursor-pointer transition-colors">microsoft/vscode</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
