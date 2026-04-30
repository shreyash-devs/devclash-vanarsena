import { useEffect } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MarkerType,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge
} from 'reactflow';
import dagre from '@dagrejs/dagre';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCode2, FolderOpen, MousePointer2 } from 'lucide-react';

interface NodeData {
  id: string;
  label: string;
  role: string;
  position: [number, number, number];
  type?: 'file' | 'dir';
  color?: string;
  summary?: string;
  in_degree?: number;
  out_degree?: number;
}

interface EdgeData {
  id: string;
  source: string;
  target: string;
  type?: string;
}
// Enhanced "Big Box" Node Design
const CustomNode = ({ data, selected }: { data: any, selected: boolean }) => {
  const isDir = data.type === 'dir';
  const coupling = (data.in_degree || 0) + (data.out_degree || 0);
  const isGodFile = !isDir && coupling >= 50;
  const isDeadCode = !isDir && coupling === 0;
  const isThreatMapMode = data.isThreatMapMode;

  return (
    <motion.div 
      animate={{ 
        scale: selected ? 1.05 : 1,
        transition: { type: 'spring', stiffness: 300, damping: 20 }
      }}
      className={`relative group ${selected ? 'z-50' : 'z-10'} ${isThreatMapMode && isDeadCode ? 'opacity-20' : 'opacity-100'}`}
    >
      <div className={`
        relative px-5 py-4 rounded-xl border backdrop-blur-2xl transition-all duration-300
        ${isThreatMapMode && isGodFile 
          ? 'bg-red-950/20 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)] animate-pulse' 
          : selected 
            ? 'bg-accent/20 border-accent shadow-[0_0_30px_rgba(99,102,241,0.5)]' 
            : 'bg-[#0f111a]/95 border-white/10 hover:border-white/30 shadow-xl'}
      `}
      style={{ 
        width: '240px',
        minHeight: '80px'
      }}>
        
        <Handle type="target" position={Position.Top} className={`!w-2 !h-2 !border-none !-top-1 ${isThreatMapMode && isGodFile ? '!bg-red-500' : '!bg-accent'}`} />
        
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-lg ${isThreatMapMode && isGodFile ? 'bg-red-500/20 text-red-500' : isDir ? 'bg-amber-500/20 text-amber-500' : 'bg-accent/20 text-accent'}`}>
              {isDir ? <FolderOpen size={18} /> : <FileCode2 size={18} />}
            </div>
            <div className="flex flex-col overflow-hidden pt-0.5">
              <span className="text-sm font-bold text-white leading-tight mb-1 truncate" title={data.label}>
                {data.label}
              </span>
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide 
                  ${isThreatMapMode && isGodFile ? 'bg-red-500/10 text-red-500' : isDir ? 'bg-amber-500/10 text-amber-500' : 'bg-accent/10 text-accent'}`}>
                    {isThreatMapMode && isGodFile ? 'God File' : isDir ? 'Package' : data.role || 'Module'}
                </span>
                {(selected || (isThreatMapMode && isGodFile)) && (
                    <span className={`text-[9px] font-semibold animate-pulse ${isThreatMapMode && isGodFile ? 'text-red-500' : 'text-accent'}`}>
                      {isThreatMapMode && isGodFile ? 'CRITICAL THREAT' : 'Focused'}
                    </span>
                )}
              </div>
            </div>
          </div>
          
          <AnimatePresence>
            {selected && data.summary && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <p className="text-[11px] text-white/70 leading-relaxed border-t border-white/10 pt-2 mt-2">
                  {data.summary}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Handle type="source" position={Position.Bottom} className={`!w-2 !h-2 !border-none !-bottom-1 ${isThreatMapMode && isGodFile ? '!bg-red-500' : '!bg-accent'}`} />
        
        {/* Glow behind the box */}
        {(selected || (isThreatMapMode && isGodFile)) && (
          <div className={`absolute inset-0 rounded-xl -z-10 animate-pulse blur-2xl ${isThreatMapMode && isGodFile ? 'bg-red-500/30' : 'bg-accent/20'}`} />
        )}
      </div>
    </motion.div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  // Set layout options for Left-to-Right (LR)
  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 80, // Vertical spacing between nodes in the same rank
    ranksep: 200, // Horizontal spacing between ranks
    edgesep: 30,
  });

  const nodeWidth = 260;
  const nodeHeight = 120;

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export default function ArchitectureGraph2D({ 
  nodes, 
  edges, 
  selectedId, 
  onSelect,
  isThreatMapMode
}: { 
  nodes: NodeData[]; 
  edges: EdgeData[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  isThreatMapMode?: boolean;
}) {

  const [rfNodes, setNodes] = useNodesState([]);
  const [rfEdges, setEdges] = useEdgesState([]);

  useEffect(() => {
    if (!selectedId) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // Extract Ego Graph: Only the selected node and its direct neighbors
    const egoNodeIds = new Set<string>();
    egoNodeIds.add(selectedId);
    
    const egoEdgesData = edges.filter(e => {
        if (e.source === selectedId || e.target === selectedId) {
            egoNodeIds.add(e.source);
            egoNodeIds.add(e.target);
            return true;
        }
        return false;
    });

    const egoNodesData = nodes.filter(n => egoNodeIds.has(n.id));

    const initialNodes: Node[] = egoNodesData.map(n => {
      const isFocused = n.id === selectedId;
      
      return {
        id: n.id,
        type: 'custom',
        position: { x: 0, y: 0 }, // Will be overwritten by dagre
        data: { 
          label: n.label, 
          role: n.role, 
          type: n.type,
          color: n.color,
          summary: n.summary,
          in_degree: n.in_degree,
          out_degree: n.out_degree,
          isThreatMapMode
        },
        selected: isFocused,
        style: { 
            opacity: 1,
            transition: 'opacity 0.4s ease',
        }
      };
    });

    const initialEdges: Edge[] = egoEdgesData.map(e => {
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'smoothstep', 
        animated: true,
        style: { 
          stroke: '#6366f1',
          strokeWidth: 3,
          opacity: 1,
          transition: 'all 0.4s ease'
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
          color: '#6366f1',
        },
      };
    });

    // Use Left-to-Right layout for the Hero View
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges, 'LR');
    
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

  }, [nodes, edges, selectedId, setNodes, setEdges, isThreatMapMode]);

  if (!selectedId) {
    return (
      <div className="w-full h-full bg-[#020204]">
        <ReactFlow nodes={[]} edges={[]}>
          <Background color="#1a1a1a" gap={30} size={1.5} />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-50">
            <div className="flex flex-col items-center text-center max-w-md bg-black/40 p-8 rounded-[32px] backdrop-blur-xl border border-white/5">
              <div className="w-20 h-20 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-6 shadow-2xl relative">
                <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full" />
                <MousePointer2 size={32} className="text-accent relative z-10" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Select a File</h2>
              <p className="text-white/40 leading-relaxed">
                Click on any file or folder in the sidebar to generate a focused, easy-to-read Dependency Graph.
              </p>
            </div>
          </div>
        </ReactFlow>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#020204]">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        // Removed onNodesChange/onEdgesChange so layout cannot be modified by user
        onNodeClick={(_, node) => onSelect(node.id)}
        onPaneClick={() => onSelect(null)}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3, duration: 800 }}
        className="architecture-flow"
        minZoom={0.05}
        maxZoom={1.5}
        nodesDraggable={false} // Nodes are locked in place
        nodesConnectable={false} // Prevent drawing new edges
        elementsSelectable={true} // Allow clicking for selection
      >
        <Background color="#1a1a1a" gap={30} size={1.5} />
        


        <Controls 
            position="bottom-center"
            showInteractive={false} 
            className="!bg-[#0f111a]/90 !border-white/10 !rounded-xl !p-1 !shadow-2xl !flex !flex-row !mb-10 !gap-1" 
        />
      </ReactFlow>

      <style>{`
        .react-flow__handle { width: 8px; height: 8px; background: #6366f1 !important; border: 2px solid #0f111a !important; }
        .react-flow__edge-path { stroke-dasharray: 6; stroke-dashoffset: 12; animation: dash 1.5s linear infinite; }
        @keyframes dash { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }
        
        .react-flow__controls {
          background-color: transparent !important;
          box-shadow: none !important;
          border: none !important;
          display: flex !important;
          flex-direction: row !important;
          gap: 4px !important;
        }
        .react-flow__controls-button { 
          background-color: #0f111a !important; 
          border: 1px solid rgba(255,255,255,0.05) !important; 
          color: white !important; 
          fill: white !important; 
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          border-radius: 8px !important;
          width: 32px !important;
          height: 32px !important;
        }
        .react-flow__controls-button:hover { 
          background-color: rgba(255,255,255,0.1) !important; 
        }
        .react-flow__controls-button:first-child {
          border-top-left-radius: 8px !important;
          border-top-right-radius: 8px !important;
        }
        .react-flow__controls-button:last-child {
          border-bottom-left-radius: 8px !important;
          border-bottom-right-radius: 8px !important;
          border-bottom: none !important;
        }

        /* Hide the React Flow attribution properly */
        .react-flow__panel.react-flow__attribution,
        .react-flow__attribution { 
          display: none !important; 
          opacity: 0 !important; 
          visibility: hidden !important; 
          pointer-events: none !important;
        }
      `}</style>
    </div>
  );
}
