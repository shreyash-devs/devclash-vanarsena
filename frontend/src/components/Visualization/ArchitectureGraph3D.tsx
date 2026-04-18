import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float, Text, RoundedBox, ContactShadows, Environment, Line, Stars } from '@react-three/drei';
import * as THREE from 'three';

interface NodeData {
  id: string;
  label: string;
  role: 'entry' | 'core' | 'util' | 'integration';
  position: [number, number, number];
}

interface EdgeData {
  id: string;
  source: string;
  target: string;
}

const colors: Record<string, string> = {
  entry: '#6366f1', // Indigo
  core: '#3b82f6',  // Blue
  util: '#64748b',  // Slate
  integration: '#f59e0b', // Amber
};

function Particles() {
  const count = 1000;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const { viewport } = useThree();

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

// Node Component using RoundedBox
const Node = ({ data, isSelected, onClick }: { data: NodeData; isSelected: boolean; onClick: () => void }) => {
  const [hovered, setHovered] = useState(false);
  const color = colors[data.role];
  
  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
      <group position={data.position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
        {/* Core Block */}
        <RoundedBox args={[0.6, 0.6, 0.6]} radius={0.05} smoothness={4}>
          <meshPhysicalMaterial
            color={color}
            metalness={0.2}
            roughness={0.1}
            transmission={0.6}
            thickness={1}
            transparent
            opacity={0.8}
            emissive={color}
            emissiveIntensity={hovered || isSelected ? 1.5 : 0.2}
          />
        </RoundedBox>

        {/* Outer Glow / Wireframe */}
        <RoundedBox args={[0.62, 0.62, 0.62]} radius={0.05} smoothness={4}>
          <meshBasicMaterial 
            color={isSelected ? '#fff' : color} 
            wireframe 
            transparent 
            opacity={hovered || isSelected ? 0.8 : 0.15} 
          />
        </RoundedBox>
        
        <Text
          position={[0, 0.6, 0]}
          fontSize={0.12}
          color="#cccccc"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          {data.label}
        </Text>
        
        {/* Selection Glow */}
        {(hovered || isSelected) && (
          <pointLight distance={2} intensity={2} color={color} />
        )}
        
        {/* Detection Area */}
        <mesh 
          onPointerOver={() => setHovered(true)} 
          onPointerOut={() => setHovered(false)}
          visible={false}
        >
          <boxGeometry args={[0.8, 0.8, 0.8]} />
        </mesh>
      </group>
    </Float>
  );
};

import { EffectComposer, Bloom } from '@react-three/postprocessing';

// Connection Component with "Laser Glow"
const Connection = ({ start, end, color }: { start: [number, number, number]; end: [number, number, number]; color: string }) => {
  const lineRef = useRef<any>(null);
  const glowRef = useRef<any>(null);
  
  useFrame((state) => {
    if (lineRef.current) lineRef.current.dashOffset -= 0.01;
    if (glowRef.current) glowRef.current.dashOffset -= 0.01;
  });

  return (
    <group>
      {/* Outer Glow Path */}
      <Line
        ref={glowRef}
        points={[start, end]}
        color={color}
        lineWidth={4}
        transparent
        opacity={0.15}
        dashed
        dashScale={8}
        dashSize={0.4}
      />
      {/* Sharp Laser Core */}
      <Line
        ref={lineRef}
        points={[start, end]}
        color={color}
        lineWidth={1.2}
        transparent
        opacity={0.8}
        dashed
        dashScale={8}
        dashSize={0.4}
      />
    </group>
  );
};

function Scene({ nodes, edges, selectedId, onSelect }: { nodes: NodeData[]; edges: EdgeData[]; selectedId: string | null; onSelect: (id: string | null) => void }) {
  const { camera, controls } = useThree() as any;
  const groupRef = useRef<THREE.Group>(null);
  
  // Smooth Camera Zoom Logic
  useFrame((state, delta) => {
    // Continuous rotation for "Scanning" feel
    if (!selectedId && groupRef.current) {
      groupRef.current.rotation.y += 0.002;
    }

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
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} minDistance={2} maxDistance={20} />
      
      <ambientLight intensity={0.1} />
      <pointLight position={[10, 10, 10]} intensity={2} />
      
      <group ref={groupRef}>
        <Particles />
        {edges.map((edge) => {
          const startNode = nodes.find(n => n.id === edge.source);
          const endNode = nodes.find(n => n.id === edge.target);
          if (!startNode || !endNode) return null;
          return (
            <Connection 
              key={edge.id} 
              start={startNode.position} 
              end={endNode.position} 
              color={colors[startNode.role]} 
            />
          );
        })}
        
        {nodes.map((node) => (
          <Node 
            key={node.id} 
            data={node} 
            isSelected={selectedId === node.id}
            onClick={() => onSelect(node.id)} 
          />
        ))}
      </group>

      <EffectComposer disableNormalPass>
        <Bloom 
          luminanceThreshold={1.1} 
          mipmapBlur 
          intensity={1.5} 
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
  onSelect 
}: { 
  nodes: NodeData[]; 
  edges: EdgeData[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="w-full h-full bg-[#010103]">
      <Canvas shadows dpr={[1, 2]}>
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Scene nodes={nodes} edges={edges} selectedId={selectedId} onSelect={onSelect} />
      </Canvas>
    </div>
  );
}
