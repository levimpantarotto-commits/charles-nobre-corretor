'use client';
import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Floor from './Floor';
import Desk from './Desk';
import Chair from './Chair';
import Printer from './Printer';
import CoffeeMachine from './CoffeeMachine';
import VoxelAgent from './VoxelAgent';
import Walls from './Walls';
import AreaCafe from './AreaCafe';
import Mobilia from './Mobilia';

const FLOOR_SIZE = 20;
const SEAT_OFFSET = 0.95;

// 6 agentes da agência Charles Nobre (imobiliária)
const EQUIPE = [
  {
    nome: 'maestro', label: 'Maestro Charles',
    deskPos: [0, 0, -7], shirtColor: '#eab308', phaseOffset: 0.2,
    descricao: 'Orquestra todos os outros agentes. Decide o quê fazer a cada ciclo.',
  },
  {
    nome: 'sdr', label: 'SDR',
    deskPos: [-5, 0, -3], shirtColor: '#3b82f6', phaseOffset: 1.4,
    descricao: 'Qualifica leads novos, faz follow-up, marca status no Kanban.',
  },
  {
    nome: 'pesquisa', label: 'Pesquisa',
    deskPos: [-5, 0, 3], shirtColor: '#22c55e', phaseOffset: 3.1,
    descricao: 'Monitora concorrência, preços de mercado, sugere imóveis pro lead.',
  },
  {
    nome: 'agenda', label: 'Agenda',
    deskPos: [5, 0, -3], shirtColor: '#a855f7', phaseOffset: 4.7,
    descricao: 'Manda briefing matinal (7h) com leads novos e eventos do dia.',
  },
  {
    nome: 'redator', label: 'Redator',
    deskPos: [5, 0, 3], shirtColor: '#f97316', phaseOffset: 5.5,
    descricao: 'Escreve descrições de imóvel, posts, e-mails. Passa por aprovação.',
  },
  {
    nome: 'atendimento', label: 'Atendimento',
    deskPos: [0, 0, 6], shirtColor: '#06b6d4', phaseOffset: 6.9,
    descricao: 'Acompanha leads convertidos: vistoria, documentação, pós-venda.',
  },
];

export default function OfficeArena() {
  const [agenteSelecionado, setAgenteSelecionado] = useState(null);
  const aberto = EQUIPE.find((a) => a.nome === agenteSelecionado);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* HUD topo: legenda */}
      <div style={{
        position: 'absolute', top: 16, left: 16, zIndex: 10,
        background: 'rgba(7,11,20,0.92)',
        border: '1px solid #1e293b',
        borderRadius: 10,
        padding: '0.9rem 1rem',
        color: '#e5e7eb',
        fontFamily: 'system-ui, sans-serif',
        minWidth: 240,
      }}>
        <div style={{ fontSize: 10, color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 900, marginBottom: 8 }}>
          Escritório • 6 Agentes
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
          Arraste pra girar • scroll pra zoom • click no agente pra detalhes
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 8, padding: '6px 8px', background: 'rgba(234,179,8,0.06)', border: '1px dashed rgba(234,179,8,0.2)', borderRadius: 6 }}>
          ⚠ Status real desligado — agentes em idle estático até IA ser plugada
        </div>
      </div>

      {/* Side panel: detalhe do agente clicado */}
      {agenteSelecionado && (
        <div style={{
          position: 'absolute', top: 16, right: 16, zIndex: 11,
          width: 300,
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid #eab308',
          borderRadius: 10,
          padding: 14, color: '#e5e7eb', fontSize: 12,
          fontFamily: 'system-ui, sans-serif',
          boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: aberto.shirtColor }} />
            <strong style={{ fontSize: 15, color: '#fef3c7' }}>{aberto.label}</strong>
            <button
              onClick={() => setAgenteSelecionado(null)}
              style={{
                marginLeft: 'auto', background: 'transparent',
                border: '1px solid #334155', color: '#cbd5e1',
                width: 24, height: 24, borderRadius: 6, cursor: 'pointer',
                fontSize: 14, lineHeight: 1,
              }}
              title="Fechar"
            >×</button>
          </div>
          <div style={{ fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.5 }}>
            {aberto.descricao}
          </div>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #334155', fontSize: 10.5, color: '#64748b' }}>
            <div style={{ marginBottom: 4 }}><span style={{ color: '#94a3b8' }}>Status:</span> <span style={{ color: '#475569' }}>desligado</span></div>
            <div><span style={{ color: '#94a3b8' }}>Último run:</span> nunca</div>
          </div>
        </div>
      )}

      <Canvas
        shadows
        orthographic
        camera={{ position: [18, 18, 18], zoom: 36, near: 0.1, far: 200 }}
        style={{ background: 'linear-gradient(180deg, #3a2818 0%, #1f140a 100%)' }}
      >
        <ambientLight intensity={0.65} />
        <directionalLight
          position={[12, 20, 8]} intensity={1.2}
          castShadow
          shadow-mapSize-width={2048} shadow-mapSize-height={2048}
          shadow-camera-left={-22} shadow-camera-right={22}
          shadow-camera-top={22} shadow-camera-bottom={-22}
        />
        <hemisphereLight args={['#fff5db', '#4a3a2a', 0.45]} />

        <Floor size={FLOOR_SIZE} />
        <Walls size={FLOOR_SIZE} height={3.5} />
        <Mobilia />

        <AreaCafe center={[-7, 0, -6]} />
        <CoffeeMachine position={[-7, 0, -6]} />
        <Printer position={[8, 0, -7]} />

        {EQUIPE.map((a) => (
          <Desk key={`desk-${a.nome}`} position={a.deskPos} color={a.nome === 'maestro' ? '#eab308' : '#22d3ee'} />
        ))}
        {EQUIPE.map((a) => (
          <Chair key={`chair-${a.nome}`} position={[a.deskPos[0], 0, a.deskPos[2] + SEAT_OFFSET]} />
        ))}

        {EQUIPE.map((a) => (
          <VoxelAgent
            key={`agent-${a.nome}`}
            name={a.label}
            position={[a.deskPos[0], 0, a.deskPos[2] + SEAT_OFFSET]}
            status="idle"
            shirtColor={a.shirtColor}
            phaseOffset={a.phaseOffset}
            seated={true}
            descricao={a.descricao}
            onSelect={() => setAgenteSelecionado(a.nome)}
            selected={agenteSelecionado === a.nome}
          />
        ))}

        <OrbitControls enablePan enableRotate enableZoom minZoom={20} maxZoom={80} />
      </Canvas>
    </div>
  );
}
