// API de geração de criativos (artes de Instagram/Facebook) a partir dos imóveis.
// Renderiza via ImageResponse do next/og (Edge-friendly, sem Puppeteer).
import { ImageResponse } from 'next/og';
import { supabase } from '@/lib/supabase';
import { toCanonical } from '@/lib/property-shape';

export const runtime = 'nodejs';

const FORMATOS = {
  story: { width: 1080, height: 1920 },
  post:  { width: 1080, height: 1080 },
  card:  { width: 1200, height: 630  },
};

const GOLD = '#C5A059';

function formatarPreco(v) {
  const n = Number(v) || 0;
  if (!n) return 'Sob consulta';
  try {
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  } catch {
    return `R$ ${n.toLocaleString('pt-BR')}`;
  }
}

async function buscarImovel(id) {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.warn('criativos: supabase erro —', error.message);
      return null;
    }
    return data ? toCanonical(data) : null;
  } catch (err) {
    console.warn('criativos: falha buscando imóvel —', err.message);
    return null;
  }
}

export async function GET(request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const formatoKey = (searchParams.get('formato') || 'post').toLowerCase();
  const formato = FORMATOS[formatoKey] ? formatoKey : 'post';
  const dim = FORMATOS[formato];

  try {
    const imovel = await buscarImovel(id);
    if (!imovel) {
      return Response.json({ error: 'Imóvel não encontrado' }, { status: 404 });
    }
    const imagemFundo = Array.isArray(imovel.images) && imovel.images[0];
    if (!imagemFundo) {
      return Response.json({ error: 'Imóvel sem imagem' }, { status: 404 });
    }

    // Escalas tipográficas por formato.
    const tipoFmt = {
      story: { titulo: 72, preco: 96, local: 32, rodape: 24, pad: 80, gap: 18 },
      post:  { titulo: 60, preco: 84, local: 28, rodape: 22, pad: 64, gap: 14 },
      card:  { titulo: 48, preco: 64, local: 24, rodape: 20, pad: 48, gap: 10 },
    }[formato];

    const cidade = imovel.city || '';
    const bairro = imovel.neighborhood || '';
    const localTxt = [cidade, bairro].filter(Boolean).join(' · ');
    const titulo = imovel.title || 'Imóvel disponível';
    const precoTxt = formatarPreco(imovel.price);

    return new ImageResponse(
      (
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            backgroundColor: '#0a0a0a',
          }}
        >
          {/* Imagem de fundo */}
          <img
            src={imagemFundo}
            width={dim.width}
            height={dim.height}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          {/* Gradient escuro de baixo pra cima */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              backgroundImage:
                'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0) 100%)',
            }}
          />
          {/* Conteúdo */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              padding: `${tipoFmt.pad}px ${tipoFmt.pad}px ${tipoFmt.pad + 70}px`,
              gap: tipoFmt.gap,
            }}
          >
            {localTxt && (
              <div
                style={{
                  color: '#e2e8f0',
                  fontSize: tipoFmt.local,
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                }}
              >
                {localTxt}
              </div>
            )}
            <div
              style={{
                color: '#ffffff',
                fontSize: tipoFmt.titulo,
                fontWeight: 800,
                lineHeight: 1.1,
                textShadow: '0 2px 12px rgba(0,0,0,0.7)',
                display: 'flex',
                maxWidth: '95%',
              }}
            >
              {titulo}
            </div>
            <div
              style={{
                color: GOLD,
                fontSize: tipoFmt.preco,
                fontWeight: 900,
                lineHeight: 1,
                marginTop: tipoFmt.gap,
                textShadow: '0 2px 12px rgba(0,0,0,0.7)',
              }}
            >
              {precoTxt}
            </div>
          </div>
          {/* Faixa inferior dourada */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 60,
              backgroundColor: GOLD,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 24px',
            }}
          >
            <div
              style={{
                color: '#0a0a0a',
                fontSize: tipoFmt.rodape,
                fontWeight: 700,
                letterSpacing: '0.05em',
                textAlign: 'center',
              }}
            >
              Charles R. Nobre · CRECI 37177 · charlesrnobre.com.br
            </div>
          </div>
        </div>
      ),
      {
        width: dim.width,
        height: dim.height,
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=300',
          'Content-Disposition': `inline; filename="${id}-${formato}.png"`,
        },
      }
    );
  } catch (err) {
    console.error('criativos GET erro:', err);
    return Response.json({ error: 'Falha ao gerar criativo', detalhe: err.message }, { status: 500 });
  }
}
