'use client';
import dynamic from 'next/dynamic';

// R3F precisa rodar só no client. Dynamic import com ssr:false evita "window is not defined" no build.
const OfficeArena = dynamic(() => import('./escritorio/OfficeArena'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#64748b', fontSize: '0.85rem',
    }}>
      Carregando escritório 3D...
    </div>
  ),
});

export default function AgentsTab() {
  return (
    <div style={{ width: '100%', height: 'calc(100vh - 0px)', position: 'relative' }}>
      <OfficeArena />
    </div>
  );
}
