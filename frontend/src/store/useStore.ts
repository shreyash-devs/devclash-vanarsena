import { create } from 'zustand';

interface AppState {
  // Screen 2 related state
  analysisProgress: number; // 0 to 100
  analysisStage: number; // 0: Cloning, 1: Parsing, 2: Building Graph, 3: Summaries, 4: Indexing
  nodeCount: number;
  edgeCount: number;
  abortProcess: () => void;
  startAnalysis: () => void;

  // Screen 3 related state
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useStore = create<AppState>((set) => ({
  analysisProgress: 0,
  analysisStage: 0,
  nodeCount: 0,
  edgeCount: 0,
  selectedNodeId: null,
  searchQuery: '',

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  abortProcess: () => set({ analysisStage: 0, analysisProgress: 0, nodeCount: 0, edgeCount: 0 }),
  
  startAnalysis: () => {
    // This will be triggered to start the fake simulation counters
    let progress = 0;
    let stage = 0;
    const interval = setInterval(() => {
      progress += 2;
      let newStage = stage;
      if (progress > 20) newStage = 1;
      if (progress > 50) newStage = 2;
      if (progress > 80) newStage = 3;
      if (progress >= 100) {
        newStage = 4;
        progress = 100;
        clearInterval(interval);
      }
      set(() => ({
        analysisProgress: progress,
        analysisStage: newStage,
        nodeCount: Math.floor((progress / 100) * 8421),
        edgeCount: Math.floor((progress / 100) * 42903),
      }));
    }, 150);
  }
}));
