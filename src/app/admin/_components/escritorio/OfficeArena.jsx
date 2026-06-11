/**
 * OfficeArena — renderiza o escritorio.html (Three.js vanilla standalone) via iframe.
 * O HTML faz fetch direto de /api/agentes/status na mesma origem pra exibir
 * estado dos 7 agentes do Charles em tempo real.
 *
 * Os componentes vizinhos (Floor.jsx, VoxelAgent.jsx, etc) ficaram obsoletos
 * com a migração pro standalone — podem ser removidos numa limpeza futura.
 */
export default function OfficeArena() {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: 'calc(100vh - 80px)',
      minHeight: 480,
      borderRadius: 12,
      overflow: 'hidden',
      border: '1px solid #1e293b',
      background: '#0A0A0E',
    }}>
      <iframe
        src="/escritorio/escritorio.html"
        title="Escritório Charles R. Nobre — Sala dos Agentes"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        allow="fullscreen"
      />
    </div>
  );
}
