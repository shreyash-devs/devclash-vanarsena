import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float, Text, RoundedBox, ContactShadows, Environment, Line, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';

interface NodeData {
  id: string;
  label: string;
  role: string | 'Entry' | 'Core' | 'Util';
  position: [number, number, number];
  summary?: string;
  type?: 'file' | 'dir';
  path?: string;
  intel_signal?: 'risk' | 'structure' | 'stable';
  in_degree?: number;
  out_degree?: number;
  color?: string;
}

interface EdgeData {
  id: string;
  source: string;
  target: string;
  /** imports | extends | calls */
  type?: string;
}

const edgeTypeColors: Record<string, string> = {
  imports: '#94a3b8', // Brighter slate
  extends: '#c084fc', // Brighter purple
  calls: '#38bdf8',   // Brighter cyan
  contains: '#334155',
};

const colors: Record<string, string> = {
  entry: '#6366f1', // Indigo
  core: '#3b82f6',  // Blue
  util: '#64748b',  // Slate
  integration: '#f59e0b', // Amber
};

function resolveBlockColor(data: NodeData): string {
  const hex = typeof data.color === 'string' ? data.color.trim() : '';
  if (/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const normalizedRole = (data.role || 'util').toLowerCase();
  return colors[normalizedRole] || colors.util;
}

function Particles() {
  const count = 1000;
  const mesh = useRef<THREE.InstancedMesh>(null);

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const t = Math.random() * 100;
      const factor = 20 + Math.random() * 100;
      const speed = 0.01 + Math.random() / 200;
      const xFactor = -50 + Math.random() * 100;
      const yFactor = -50 + Math.random() * 100;
      const zFactor = -50 + Math.random() * 100;
      temp.push({ t, factor, speed, xFactor, yFactor, zFactor, mx: 0, my: 0 });
    }
    return temp;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    particles.forEach((particle, i) => {
      let { t, factor, speed, xFactor, yFactor, zFactor } = particle;
      t = particle.t += speed / 2;
      const a = Math.cos(t) + Math.sin(t * 1) / 10;
      const b = Math.sin(t) + Math.cos(t * 2) / 10;
      const s = Math.cos(t);
      particle.mx += (state.mouse.x * state.viewport.width - particle.mx) * 0.01;
      particle.my += (state.mouse.y * state.viewport.height - particle.my) * 0.01;
      dummy.position.set(
        (particle.mx / 10) * a + xFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 1) * factor) / 10,
        (particle.my / 10) * b + yFactor + Math.sin((t / 10) * factor) + (Math.cos(t * 2) * factor) / 10,
        (particle.my / 10) * b + zFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 3) * factor) / 10
      );
      dummy.scale.set(s, s, s);
      dummy.rotation.set(s * 5, s * 5, s * 5);
      dummy.updateMatrix();
      if (mesh.current) mesh.current.setMatrixAt(i, dummy.matrix);
    });
    if (mesh.current) mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[0.08, 0]} />
      <meshStandardMaterial color="#333" emissive="#111" />
    </instancedMesh>
  );
}

// File node — glass cube; directory — compact slate marker (tree branch)
const Node = ({ data, isSelected, onClick, isThreatMapMode }: { data: NodeData; isSelected: boolean; onClick: () => void; isThreatMapMode?: boolean }) => {
  const [hovered, setHovered] = useState(false);
  const [pulse, setPulse] = useState(0);

  useFrame((state) => {
    if (isThreatMapMode) {
      setPulse(Math.sin(state.clock.getElapsedTime() * 4) * 0.5 + 0.5);
    }
  });

  const isDir = data.type === 'dir';
  const coupling = (data.in_degree || 0) + (data.out_degree || 0);
  const isGodFile = !isDir && coupling >= 50;
  const isDeadCode = !isDir && coupling === 0;

  const baseColor = resolveBlockColor(data);
  const color = isThreatMapMode 
    ? (isGodFile ? '#ff0000' : isDeadCode ? '#444444' : baseColor)
    : baseColor;

  const boxArgs = isDir ? ([0.35, 0.22, 0.35] as [number, number, number]) : ([0.6, 0.6, 0.6] as [number, number, number]);
  const labelSize = isDir ? 0.08 : 0.12;
  const labelY = isDir ? 0.38 : 0.6;

  const emissiveIntensity = isThreatMapMode && isGodFile 
    ? 2 + pulse * 4 
    : (hovered || isSelected ? (isDir ? 0.35 : 1.5) : (isDir ? 0.08 : 0.2));

  const opacity = isThreatMapMode && isDeadCode 
    ? 0.15 
    : (isDir ? 0.92 : 0.8);

  const inner = (
    <group position={data.position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <RoundedBox args={boxArgs} radius={isDir ? 0.03 : 0.05} smoothness={4}>
        <meshPhysicalMaterial
          color={color}
          metalness={isDir ? 0.05 : 0.2}
          roughness={isDir ? 0.85 : 0.1}
          transmission={isDir ? 0.15 : 0.6}
          thickness={1}
          transparent
          opacity={opacity}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
        />
      </RoundedBox>
      {!isDir && (
        <RoundedBox args={[0.62, 0.62, 0.62]} radius={0.05} smoothness={4}>
          <meshBasicMaterial
            color={isSelected ? '#fff' : color}
            wireframe
            transparent
            opacity={hovered || isSelected ? 0.8 : 0.15}
          />
        </RoundedBox>
      )}

      <Text
        position={[0, labelY, 0]}
        fontSize={labelSize}
        color={isDir ? '#94a3b8' : '#cccccc'}
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
        maxWidth={isDir ? 2.2 : 4}
      >
        {data.label}
      </Text>

      {!isDir && (hovered || isSelected) && data.summary && (
        <Html position={[0, -0.6, 0]} center zIndexRange={[100, 0]}>
          <div className="bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl w-48 text-center pointer-events-none transform transition-all">
            <div className="text-[10px] text-accent font-bold tracking-widest uppercase mb-1">AI Insight</div>
            <div className="text-xs text-white/80 leading-relaxed line-clamp-3">
              {data.summary}
            </div>
          </div>
        </Html>
      )}

      {(hovered || isSelected) && (
        <pointLight distance={isDir ? 1.2 : 2} intensity={isDir ? 0.8 : 2} color={color} />
      )}

      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        visible={false}
      >
        <boxGeometry args={isDir ? [0.55, 0.45, 0.55] : [0.8, 0.8, 0.8]} />
      </mesh>
    </group>
  );

  if (isDir) return inner;
  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
      {inner}
    </Float>
  );
};

import { EffectComposer, Bloom } from '@react-three/postprocessing';

// Connection Component with "Laser Glow" and directional flow
const Connection = ({
  start,
  end,
  color,
  edgeKind,
  isActive,
  isDimmed,
}: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  edgeKind?: string;
  isActive: boolean;
  isDimmed: boolean;
}) => {
  const lineRef = useRef<any>(null);
  const flowRef = useRef<any>(null);
  const isTree = edgeKind === 'contains';
  
  // UX: Directional Indicator (Cone at target)
  const dir = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    return e.clone().sub(s).normalize();
  }, [start, end]);


  const arrowPos = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    return s.clone().lerp(e, 0.95); // Position arrow near the end
  }, [start, end]);

  // Adjust visibility based on state
  const opacity = isDimmed ? 0.05 : isActive ? 1.0 : (isTree ? 0.2 : 0.6);
  const lineWidth = isActive ? 4 : (isTree ? 1 : 2);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (lineRef.current) {
      lineRef.current.dashOffset = -t * 0.5;
    }
    if (flowRef.current) {
      flowRef.current.position.lerpVectors(new THREE.Vector3(...start), new THREE.Vector3(...end), (t * 0.5) % 1);
    }
  });

  return (
    <group>
      {/* Main Connection Line */}
      <Line
        ref={lineRef}
        points={[start, end]}
        color={color}
        lineWidth={lineWidth}
        transparent
        opacity={opacity}
        dashed={!isTree}
        dashScale={5}
        dashSize={0.5}
      />

      {/* Pulsing Flow Particle (UX: Shows direction of data/imports) */}
      {!isTree && !isDimmed && (
        <mesh ref={flowRef}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} />
          <pointLight distance={1} intensity={isActive ? 2 : 1} color={color} />
        </mesh>
      )}

      {/* Directional Arrow Head */}
      {!isTree && !isDimmed && (
        <mesh position={arrowPos} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)}>
          <coneGeometry args={[0.12, 0.3, 8]} />
          <meshBasicMaterial color={color} transparent opacity={opacity} />
        </mesh>
      )}
    </group>
  );
};

function Scene({ nodes, edges, selectedId, onSelect, isThreatMapMode }: { nodes: NodeData[]; edges: EdgeData[]; selectedId: string | null; onSelect: (id: string | null) => void; isThreatMapMode?: boolean }) {
  const { camera, controls } = useThree() as any;
  const groupRef = useRef<THREE.Group>(null);
  
  // Smooth Camera Zoom Logic
  useFrame(() => {
    if (selectedId) {
      const targetNode = nodes.find(n => n.id === selectedId);
      if (targetNode && controls) {
        const targetPos = new THREE.Vector3(...targetNode.position);
        controls.target.lerp(targetPos, 0.1);
        const offset = new THREE.Vector3(0, 0.5, 3);
        const idealCameraPos = targetPos.clone().add(offset);
        camera.position.lerp(idealCameraPos, 0.05);
        controls.update();
      }
    } else {
      if (controls) {
        controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.05);
        camera.position.lerp(new THREE.Vector3(0, 0, 10), 0.02);
        controls.update();
      }
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={50} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} minDistance={1.5} maxDistance={72} />
      
      <ambientLight intensity={0.1} />
      <pointLight position={[10, 10, 10]} intensity={isThreatMapMode ? 0.5 : 2} />
      <pointLight position={[-10, -5, -5]} intensity={1.5} color={isThreatMapMode ? "#ff0000" : "#6366f1"} />
      
      <group ref={groupRef}>
        <Particles />
        {edges.map((edge) => {
          const startNode = nodes.find(n => n.id === edge.source);
          const endNode = nodes.find(n => n.id === edge.target);
          if (!startNode || !endNode) return null;
          
          const isConnectedToSelected = selectedId === edge.source || selectedId === edge.target;
          const isDimmed = isThreatMapMode ? true : (!!selectedId && !isConnectedToSelected);
          const isActive = !!selectedId && isConnectedToSelected;

          const edgeKind = (edge.type || 'imports').toLowerCase();
          const lineColor = isThreatMapMode ? "#444" : (edgeTypeColors[edgeKind] ?? colors[startNode.role.toLowerCase() as keyof typeof colors] ?? colors.util);
          
          return (
            <Connection 
              key={edge.id} 
              start={startNode.position} 
              end={endNode.position} 
              color={lineColor}
              edgeKind={edgeKind}
              isActive={isActive}
              isDimmed={isDimmed}
            />
          );
        })}
        
        {nodes.map((node) => (
          <Node 
            key={node.id} 
            data={node} 
            isSelected={selectedId === node.id}
            onClick={() => onSelect(node.id)} 
            isThreatMapMode={isThreatMapMode}
          />
        ))}
      </group>

      <EffectComposer>
        <Bloom 
          luminanceThreshold={isThreatMapMode ? 0.5 : 1} 
          mipmapBlur 
          intensity={isThreatMapMode ? 2.5 : 1.2} 
          radius={0.4}
        />
      </EffectComposer>

      <Environment preset="city" />
      <ContactShadows position={[0, -4.5, 0]} scale={20} blur={2} far={4.5} />
    </>
  );
}

export default function ArchitectureGraph3D({ 
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
  return (
    <div className="w-full h-full bg-[#010103]">
      <Canvas shadows dpr={[1, 2]}>
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Scene nodes={nodes} edges={edges} selectedId={selectedId} onSelect={onSelect} isThreatMapMode={isThreatMapMode} />
      </Canvas>
    </div>
  );
}
