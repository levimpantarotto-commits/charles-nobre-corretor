'use client';
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text, Html } from '@react-three/drei';

const SKIN = '#f4c08c';
const PANTS = '#1f2937';
const SHOES = '#0f172a';

export default function VoxelAgent({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  status = 'idle',
  shirtColor = '#22d3ee',
  phaseOffset = 0,
  name = null,
  seated = true,
  descricao = null,
  onSelect = null,
  selected = false,
}) {
  const [hovered, setHovered] = useState(false);
  const torsoRef = useRef();
  const leftArmRef = useRef();
  const rightArmRef = useRef();
  const leftLegRef = useRef();
  const rightLegRef = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime + phaseOffset;
    const legBase = seated ? Math.PI / 2 : 0;

    if (status === 'idle') {
      if (torsoRef.current) torsoRef.current.scale.y = 1 + Math.sin(t * 1.8) * 0.04;
      const cycle = (t + 3) % 8;
      let coffeeRot = 0;
      if (cycle > 4 && cycle < 6.5) {
        const phase = (cycle - 4) / 2.5;
        coffeeRot = -Math.sin(phase * Math.PI) * 2.3;
      }
      if (rightArmRef.current) rightArmRef.current.rotation.x = coffeeRot;
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0;
      if (leftLegRef.current) leftLegRef.current.rotation.x = legBase;
      if (rightLegRef.current) rightLegRef.current.rotation.x = legBase;
    } else if (status === 'typing') {
      if (torsoRef.current) torsoRef.current.scale.y = 1;
      const base = -Math.PI / 2;
      const wobble = Math.sin(t * 14) * 0.22;
      if (leftArmRef.current) leftArmRef.current.rotation.x = base + wobble;
      if (rightArmRef.current) rightArmRef.current.rotation.x = base - wobble;
      if (leftLegRef.current) leftLegRef.current.rotation.x = legBase;
      if (rightLegRef.current) rightLegRef.current.rotation.x = legBase;
    }
  });

  const statusColor = status === 'typing' ? '#22c55e' : '#64748b';

  const handleOver = (e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; };
  const handleOut = (e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; };
  const handleClick = (e) => { e.stopPropagation(); if (onSelect) onSelect(); };

  return (
    <group
      position={position}
      rotation={rotation}
      onPointerOver={handleOver}
      onPointerOut={handleOut}
      onClick={handleClick}
    >
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[1.3, 3, 1.2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {selected && (
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.85, 1.05, 32]} />
          <meshBasicMaterial color="#eab308" transparent opacity={0.85} />
        </mesh>
      )}

      {hovered && !selected && (
        <Html
          position={[0, seated ? 2.6 : 3.1, 0]}
          center
          style={{ pointerEvents: 'none' }}
          zIndexRange={[20, 0]}
        >
          <div style={{
            background: 'rgba(8, 10, 16, 0.94)',
            border: '1px solid #eab308',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 11,
            color: '#e5e7eb',
            minWidth: 160,
            fontFamily: 'system-ui, sans-serif',
            boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
            whiteSpace: 'nowrap',
          }}>
            <div style={{ fontWeight: 700, color: '#fef3c7', marginBottom: 4 }}>{name}</div>
            {descricao && <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 6 }}>{descricao}</div>}
            <div style={{ fontSize: 9, opacity: 0.5, marginTop: 4 }}>click para detalhes</div>
          </div>
        </Html>
      )}

      {name && (
        <Billboard position={[0, 3.35, 0]}>
          <mesh position={[-0.55, 0, 0]}>
            <circleGeometry args={[0.09, 16]} />
            <meshBasicMaterial color={statusColor} />
          </mesh>
          <Text
            fontSize={0.28}
            color="#ffffff"
            anchorX="left"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
            position={[-0.4, 0, 0]}
          >
            {name}
          </Text>
        </Billboard>
      )}

      <group position={[0, seated ? -0.45 : 0, 0]}>
        <group ref={leftLegRef} position={[-0.18, 1, 0]}>
          <mesh position={[0, -0.5, 0]} castShadow>
            <boxGeometry args={[0.3, 1, 0.3]} />
            <meshStandardMaterial color={PANTS} />
          </mesh>
          <mesh position={[0, -0.95, 0.05]} castShadow>
            <boxGeometry args={[0.32, 0.12, 0.4]} />
            <meshStandardMaterial color={SHOES} />
          </mesh>
        </group>
        <group ref={rightLegRef} position={[0.18, 1, 0]}>
          <mesh position={[0, -0.5, 0]} castShadow>
            <boxGeometry args={[0.3, 1, 0.3]} />
            <meshStandardMaterial color={PANTS} />
          </mesh>
          <mesh position={[0, -0.95, 0.05]} castShadow>
            <boxGeometry args={[0.32, 0.12, 0.4]} />
            <meshStandardMaterial color={SHOES} />
          </mesh>
        </group>

        <mesh ref={torsoRef} position={[0, 1.5, 0]} castShadow>
          <boxGeometry args={[0.7, 1, 0.4]} />
          <meshStandardMaterial color={shirtColor} />
        </mesh>

        <mesh position={[0, 2.3, 0]} castShadow>
          <boxGeometry args={[0.55, 0.55, 0.55]} />
          <meshStandardMaterial color={SKIN} />
        </mesh>
        <mesh position={[-0.13, 2.35, -0.281]}>
          <boxGeometry args={[0.08, 0.08, 0.02]} />
          <meshStandardMaterial color="#0b0b0b" />
        </mesh>
        <mesh position={[0.13, 2.35, -0.281]}>
          <boxGeometry args={[0.08, 0.08, 0.02]} />
          <meshStandardMaterial color="#0b0b0b" />
        </mesh>
        <mesh position={[0, 2.6, 0]} castShadow>
          <boxGeometry args={[0.58, 0.12, 0.58]} />
          <meshStandardMaterial color="#2a1a0e" />
        </mesh>

        <group ref={leftArmRef} position={[-0.45, 1.95, 0]}>
          <mesh position={[0, -0.4, 0]} castShadow>
            <boxGeometry args={[0.2, 0.8, 0.25]} />
            <meshStandardMaterial color={shirtColor} />
          </mesh>
          <mesh position={[0, -0.85, 0]} castShadow>
            <boxGeometry args={[0.22, 0.18, 0.27]} />
            <meshStandardMaterial color={SKIN} />
          </mesh>
        </group>
        <group ref={rightArmRef} position={[0.45, 1.95, 0]}>
          <mesh position={[0, -0.4, 0]} castShadow>
            <boxGeometry args={[0.2, 0.8, 0.25]} />
            <meshStandardMaterial color={shirtColor} />
          </mesh>
          <mesh position={[0, -0.85, 0]} castShadow>
            <boxGeometry args={[0.22, 0.18, 0.27]} />
            <meshStandardMaterial color={SKIN} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
