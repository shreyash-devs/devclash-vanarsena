# 🛰️ Vanarsena: Backend Integration Protocol

This document serves as the technical bridge for backend developers and AI agents connecting to the Vanarsena 3D visualization engine.

## 1. Data Source: The Nexis Points
Currently, the system uses static "Mock Protocols" located in:
*   **Nodes & Edges**: `frontend/src/pages/MainExplorer.tsx` (Lines 15-40)
*   **File Tree Hierarchy**: `frontend/src/pages/MainExplorer.tsx` (Inside the `filesByFolder` constant)

---

## 2. Schema Specification (JSON)

To replace dummy data with real-time analysis, the backend (Python/Ollama/Groq) must emit the following structures:

### A. The 3D Graph Nodes
Location: `initialNodes3D`
```typescript
interface Node3D {
  id: string;        // Unique identifier (e.g., file path hash)
  position: [number, number, number]; // 3D coordinates (suggested range: -10 to 10)
  label: string;      // The filename to display on hover
  type: 'file' | 'dir';
  role: 'Entry' | 'Core' | 'Util'; // Affects color/glow intensity
}
```

### B. The Dependency Edges (Paths)
Location: `initialEdges3D`
```typescript
interface Edge3D {
  id: string;
  source: string; // ID of the importing file
  target: string; // ID of the exported file
}
```

---

## 3. The Rendering Lifecycle
How the frontend consumes your data:

1.  **The Store (Nexus)**: All selection state is managed in `frontend/src/store/useStore.ts`.
2.  **The 3D Engine**: `ArchitectureGraph3D.tsx` iterates through the nodes and edges.
    *   **Nodes**: Rendered as `SphereGeometry` with custom `MeshStandardMaterial` for bloom.
    *   **Paths**: Rendered as `CatmullRomCurve3` with animated Tube geometry for the "streaming data" effect.
3.  **The Folder HUD**: `MainExplorer.tsx` uses the `filesByFolder` map to build the animated accordion navigation.

---

## 4. High-Value Integration Tags
The 3D engine uses "Role" tags to determine glow intensity:
*   `Entry`: Highest glow (Bloom 1.5). Usually `main.py` or entry routers.
*   `Core`: Medium glow. Essential business logic.
*   `Util`: Faint pulse. Helper functions and loggers.

---

## 5. Development Sandbox
When you're ready to connect, replace the `useState` in `MainExplorer.tsx`:
```diff
- const [nodes] = useState(initialNodes3D);
+ const nodes = await fetchDataFromBackend(); // Your API call here
```

> [!TIP]
> **AI Optimization**: When asking an LLM to generate the backend logic, provide this file and instruct it to "Map the Tree-Sitter import tree to the initialNodes3D / initialEdges3D schema."
