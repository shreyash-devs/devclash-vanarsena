import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import ReactFlow, { Background, Controls, useNodesState, useEdgesState, MarkerType, Handle, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, FileCode2, ChevronDown, ChevronRight, Search, Sparkles, FolderOpen, ArrowUpRight, ArrowDownLeft, Terminal, PenLine, MessageSquare, Code2, Info, Send, Bot } from 'lucide-react';
import IDELayout from '../components/IDE/IDELayout';
import { useStore } from '../store/useStore';

// Custom Node Component
const CustomNode = ({ data, selected }: any) => {
  const bgColors: Record<string, string> = {
    entry: 'bg-indigo-500/10 border-indigo-500',
    core: 'bg-blue-500/10 border-blue-500',
    util: 'bg-gray-500/10 border-gray-500',
    integration: 'bg-amber-500/10 border-amber-500',
  };
  const textColors: Record<string, string> = {
    entry: 'text-indigo-400',
    core: 'text-blue-400',
    util: 'text-gray-400',
    integration: 'text-amber-400',
  };
  
  const role = data.role as string;
  const isDimmed = data.isDimmed;

  return (
    <div className={`px-4 py-2 shadow-md rounded-md cursor-pointer border ${bgColors[role]} ${isDimmed ? 'opacity-20' : 'opacity-100'} transition-opacity duration-150 relative ${selected ? 'ring-2 ring-accent ring-offset-2 ring-offset-background' : ''}`}>
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="flex flex-col">
        <span className={`text-xs font-mono font-bold ${textColors[role]}`}>{role.toUpperCase()}</span>
        <span className="text-sm font-sans font-medium text-text-primary mt-1">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
      {data.isPinned && (
        <div className="absolute -top-2 -right-2 bg-text-primary text-background rounded-full p-0.5">
          <Terminal size={10} />
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const initialNodes = [
  { id: '1', type: 'custom', position: { x: 250, y: 50 }, data: { label: 'applications.py', role: 'entry', inDegree: 2 } },
  { id: '2', type: 'custom', position: { x: 100, y: 180 }, data: { label: 'routing.py', role: 'core', inDegree: 4 } },
  { id: '3', type: 'custom', position: { x: 400, y: 180 }, data: { label: 'dependencies/', role: 'integration', inDegree: 1 } },
  { id: '4', type: 'custom', position: { x: 250, y: 320 }, data: { label: 'utils.py', role: 'util', inDegree: 8 } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', type: 'default', markerEnd: { type: MarkerType.ArrowClosed, color: '#333' }, style: { stroke: '#333', strokeWidth: 1 } },
  { id: 'e1-3', source: '1', target: '3', type: 'default', markerEnd: { type: MarkerType.ArrowClosed, color: '#333' }, style: { stroke: '#333', strokeWidth: 1 } },
  { id: 'e2-4', source: '2', target: '4', type: 'default', markerEnd: { type: MarkerType.ArrowClosed, color: '#333' }, style: { stroke: '#333', strokeWidth: 1 } },
  { id: 'e3-4', source: '3', target: '4', type: 'default', markerEnd: { type: MarkerType.ArrowClosed, color: '#333' }, style: { stroke: '#333', strokeWidth: 1 } },
];

export default function MainExplorer() {
  const { selectedNodeId, setSelectedNodeId } = useStore();
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'details' | 'chat' | 'code'>('details');
  const [chatMessage, setChatMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessage]);

  const processedNodes = useMemo(() => {
    if (!hoveredNode) return nodes.map(n => ({ ...n, data: { ...n.data, isDimmed: false } }));
    const connectedEdges = edges.filter(e => e.source === hoveredNode || e.target === hoveredNode);
    const connectedNodeIds = new Set(connectedEdges.flatMap(e => [e.source, e.target]));
    connectedNodeIds.add(hoveredNode);
    return nodes.map(n => ({ ...n, data: { ...n.data, isDimmed: !connectedNodeIds.has(n.id) } }));
  }, [nodes, edges, hoveredNode]);

  const processedEdges = useMemo(() => {
    if (!hoveredNode) return edges.map(e => ({ ...e, style: { stroke: '#333', strokeWidth: 1 }, animated: false }));
    return edges.map(e => {
      const isConnected = e.source === hoveredNode || e.target === hoveredNode;
      const sourceNode = nodes.find(n => n.id === e.source);
      const roleColors: Record<string, string> = { entry: '#6366f1', core: '#3b82f6', util: '#6b7280', integration: '#f59e0b' };
      const color = sourceNode ? roleColors[sourceNode.data.role as string] : '#6366f1';
      return {
        ...e,
        style: isConnected ? { stroke: color, strokeWidth: 2 } : { stroke: '#111', strokeWidth: 1 },
        animated: isConnected
      };
    });
  }, [edges, hoveredNode, nodes]);

  const onNodeClick = useCallback((_: any, node: any) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  const onNodeMouseEnter = useCallback((_: any, node: any) => setHoveredNode(node.id), []);
  const onNodeMouseLeave = useCallback(() => setHoveredNode(null), []);

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
    <div className="flex flex-col py-2 font-mono text-sm leading-8 select-none">
      <div className="flex items-center px-4 hover:bg-surface cursor-pointer text-text-primary">
        <ChevronDown size={16} className="mr-1 opacity-70" />
        <FolderOpen size={16} className="text-accent mr-2" />
        fastapi
      </div>
      
      <div 
        className="flex items-center px-4 pl-8 hover:bg-surface cursor-pointer group justify-between"
        onClick={() => setSelectedNodeId('1')}
      >
        <div className="flex items-center text-text-primary">
          <FileCode2 size={16} className="mr-2 text-mono" />
          applications.py
        </div>
        <span className="text-[9px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded uppercase tracking-wider">Entry</span>
      </div>

      <div 
        className="flex items-center px-4 pl-8 hover:bg-surface cursor-pointer group justify-between"
        onClick={() => setSelectedNodeId('2')}
      >
        <div className="flex items-center text-text-primary">
          <FileCode2 size={16} className="mr-2 text-mono" />
          routing.py
        </div>
        <span className="text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded uppercase tracking-wider">Core</span>
      </div>

      <div className="flex items-center px-4 pl-8 hover:bg-surface cursor-pointer text-text-secondary">
        <ChevronRight size={16} className="mr-1 opacity-70" />
        <Folder size={16} className="text-gray-500 mr-2" />
        dependencies
      </div>

      <div 
        className="flex items-center px-4 pl-8 hover:bg-surface cursor-pointer group justify-between"
        onClick={() => setSelectedNodeId('4')}
      >
        <div className="flex items-center text-text-primary">
          <FileCode2 size={16} className="mr-2 text-mono" />
          utils.py
        </div>
        <span className="text-[9px] bg-gray-500/20 text-gray-400 border border-gray-500/30 px-1.5 py-0.5 rounded uppercase tracking-wider">Util</span>
      </div>
    </div>
  );

  return (
    <IDELayout topbarCenter={topbarCenter} topbarRight={topbarRight} sidebarContent={sidebarContent}>
      <div className="w-full h-full relative" onDoubleClick={() => {}}>
        <ReactFlow
          nodes={processedNodes}
          edges={processedEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          fitView
          proOptions={{ hideAttribution: true }}
          className="bg-transparent"
        >
          <Background color="#1e1e1e" gap={20} size={1} />
          <Controls className="fill-text-primary border-border" />
        </ReactFlow>

        <AnimatePresence>
          {selectedNodeId && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute top-0 left-0 h-full w-[400px] bg-surface-flat border-r border-border flex flex-col font-sans z-10 shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 border-b border-border h-12 shrink-0">
                <span className="font-semibold text-accent font-mono">Node Context</span>
                <button onClick={() => setSelectedNodeId(null)} className="text-text-secondary hover:text-text-primary">
                  <span className="text-xl leading-none">&times;</span>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border h-10 shrink-0 bg-surface">
                <button 
                  onClick={() => setActiveTab('details')}
                  className={`flex-1 flex justify-center items-center gap-2 text-xs font-mono border-r border-border transition-colors ${activeTab === 'details' ? 'text-accent bg-surface-flat' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  <Info size={14} /> Details
                </button>
                <button 
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 flex justify-center items-center gap-2 text-xs font-mono border-r border-border transition-colors ${activeTab === 'chat' ? 'text-accent bg-surface-flat' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  <MessageSquare size={14} /> Chatbot
                </button>
                <button 
                  onClick={() => setActiveTab('code')}
                  className={`flex-1 flex justify-center items-center gap-2 text-xs font-mono transition-colors ${activeTab === 'code' ? 'text-accent bg-surface-flat' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  <Code2 size={14} /> Code
                </button>
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col h-full bg-surface-flat">
                {activeTab === 'details' && (
                  <div className="p-6 flex flex-col gap-8 h-full">
                    <section>
                      <div className="flex items-center gap-2 mb-3 text-xs font-mono tracking-wider text-text-secondary uppercase">
                        <Sparkles size={14} className="text-mono" />
                        AI Summary
                      </div>
                      <div className="p-4 bg-surface border border-border rounded-md text-text-secondary italic text-sm leading-relaxed">
                        Main entry point for the FastAPI application framework. Orchestrates sub-routing, middleware initialization, and exception handlers. High architectural importance.
                      </div>
                    </section>

                    <section>
                      <div className="flex items-center gap-2 mb-3 text-xs font-mono tracking-wider text-text-secondary uppercase">
                        Impact Score
                      </div>
                      <div className="w-full h-2 bg-surface border border-border rounded-full overflow-hidden mb-2">
                        <div className="h-full bg-mono w-[80%]" />
                      </div>
                      <div className="text-xs text-text-secondary">Changes here affect <span className="text-text-primary">24</span> files</div>
                    </section>

                    <section>
                      <div className="flex items-center gap-2 mb-3 text-xs font-mono tracking-wider text-text-secondary uppercase">
                        Imports
                      </div>
                      <div className="flex flex-col gap-2 font-mono text-sm border border-border rounded-md bg-surface p-4">
                        <div className="flex items-center gap-2 text-text-secondary hover:text-text-primary cursor-pointer">
                          <ArrowUpRight size={14} className="text-text-secondary shrink-0" />
                          <span>fastapi.routing</span>
                        </div>
                        <div className="flex items-center gap-2 text-text-secondary hover:text-text-primary cursor-pointer">
                          <ArrowUpRight size={14} className="text-text-secondary shrink-0" />
                          <span>fastapi.dependencies</span>
                        </div>
                      </div>
                    </section>

                     <section>
                      <div className="flex items-center gap-2 mb-3 text-xs font-mono tracking-wider text-text-secondary uppercase">
                        Imported By
                      </div>
                      <div className="flex flex-col gap-2 font-mono text-sm border border-border rounded-md bg-surface p-4 mb-4">
                        <div className="flex items-center gap-2 text-text-secondary hover:text-text-primary cursor-pointer">
                          <ArrowDownLeft size={14} className="text-amber-500 shrink-0" />
                          <span>tests.test_app.py</span>
                        </div>
                        <div className="flex items-center gap-2 text-text-secondary hover:text-text-primary cursor-pointer">
                          <ArrowDownLeft size={14} className="text-amber-500 shrink-0" />
                          <span>main.py</span>
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {activeTab === 'chat' && (
                  <div className="flex flex-col h-full bg-background relative">
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                       <div className="flex gap-3">
                         <div className="w-6 h-6 rounded bg-mono flex shrink-0 items-center justify-center text-background">
                           <Bot size={14} />
                         </div>
                         <div className="bg-surface border border-border p-3 rounded-md text-sm text-text-secondary w-[90%]">
                           Hello! I am ready to answer questions about this node. What would you like to know regarding the imports, logic, or dependencies?
                         </div>
                       </div>
                       
                       <div className="flex gap-3 flex-row-reverse">
                         <div className="w-6 h-6 rounded bg-surface border border-border flex shrink-0 items-center justify-center text-text-primary">
                           U
                         </div>
                         <div className="bg-accent/10 border border-accent/20 p-3 rounded-md text-sm text-text-primary w-[80%]">
                           Explain the impact of modifying the exception handler function here.
                         </div>
                       </div>

                       <div className="flex gap-3">
                         <div className="w-6 h-6 rounded bg-mono flex shrink-0 items-center justify-center text-background">
                           <Bot size={14} />
                         </div>
                         <div className="bg-surface border border-border p-3 rounded-md text-sm text-text-secondary w-[90%]">
                           Modifying the main error handler here will immediately propagate across the 24 dependent files, likely breaking the standard response formatting in <span className="text-accent font-mono">routing.py</span>.
                         </div>
                       </div>
                       <div ref={chatEndRef} />
                    </div>
                    
                    <div className="p-3 bg-surface-flat border-t border-border mt-auto">
                       <div className="flex items-center bg-background border border-border rounded px-3 py-2">
                         <input 
                           type="text" 
                           placeholder="Ask AI about this file..." 
                           className="bg-transparent border-none outline-none flex-1 text-sm text-text-primary placeholder:text-text-secondary"
                           value={chatMessage}
                           onChange={(e) => setChatMessage(e.target.value)}
                         />
                         <button className="text-mono hover:text-mono/80 transition-colors ml-2">
                           <Send size={16} />
                         </button>
                       </div>
                    </div>
                  </div>
                )}

                {activeTab === 'code' && (
                  <div className="h-full bg-surface w-full overflow-hidden flex flex-col">
                     <div className="flex items-center h-8 bg-surface-flat border-b border-border pl-4 text-xs font-mono text-text-secondary shrink-0">
                       applications.py
                     </div>
                     <div className="flex-1 overflow-auto p-4 text-xs font-mono leading-relaxed text-text-primary">
                        <pre>
<span className="text-mono">import</span> typing
<span className="text-mono">from</span> fastapi <span className="text-mono">import</span> routing
<span className="text-mono">from</span> fastapi.dependencies <span className="text-mono">import</span> utils
                        
<span className="text-blue-400">class</span> FastAPI:
    <span className="text-blue-400">def</span> __init__(self, title: str = <span className="text-green-400">"FastAPI"</span>):
        self.router = routing.APIRouter()
        self.title = title
        
    <span className="text-blue-400">def</span> include_router(
        self,
        router: routing.APIRouter,
        *,
        prefix: str = <span className="text-green-400">""</span>,
    ) -&gt; <span className="text-mono">None</span>:
        self.router.include_router(router, prefix=prefix)
                        </pre>
                     </div>
                  </div>
                )}

              </div>

              {activeTab === 'details' && (
                <div className="p-4 border-t border-border shrink-0 bg-surface">
                  <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent text-white rounded font-medium text-sm hover:bg-accent/90 transition-colors">
                    <PenLine size={16} />
                    Refactor
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </IDELayout>
  );
}
