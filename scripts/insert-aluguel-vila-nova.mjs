// Insere o apartamento de aluguel na Praia da Vila Nova (Imbituba/SC)
// na tabela `properties` do Supabase usando SUPABASE_SERVICE_ROLE_KEY.
//
// Uso:
//   node scripts/insert-aluguel-vila-nova.mjs
//
// Depois de obter o UUID retornado, subir as fotos no bucket `properties`
// e dar UPDATE no array `images` (caminhos públicos do bucket).

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Faltou NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const registro = {
  title: 'Apartamento Mobiliado para Aluguel - Praia da Vila Nova',
  description:
    'Apartamento mobiliado de 70m², moderno e muito bem iluminado, disponível para locação em uma das regiões mais desejadas da Praia da Vila Nova em Imbituba. Ideal para quem busca praticidade, conforto e qualidade de vida perto do mar.\n\n' +
    'Composto por 1 suíte e 1 quarto, com ambientes amplos e bem distribuídos. Apartamento ensolarado e arejado, com sala e cozinha integradas, sacada fechada em vidro com churrasqueira, vista aberta e excelente iluminação natural. Cozinha planejada e banheiro social.\n\n' +
    'Prédio moderno e seguro, com elevador, entrada eletrônica e garagem coberta. Excelente posição solar, localização tranquila e próxima da praia. Funcional, aconchegante e perfeito para morar com conforto ou aproveitar temporadas especiais.',
  price: 2800,
  city: 'Imbituba',
  neighborhood: 'Praia da Vila Nova',
  state: 'SC',
  type: 'Apartamento',
  intent: 'aluguel',
  category: 'Mobiliado',
  images: [],
  video: '',
  features: [
    '1 Suíte + 1 Quarto',
    'Mobiliado',
    'Sacada Fechada com Churrasqueira',
    'Cozinha Planejada',
    'Sala e Cozinha Integradas',
    'Vista Aberta e Ensolarado',
    'Garagem Coberta',
    'Elevador e Entrada Eletrônica',
    'Próximo à Praia',
  ],
  area: 70,
};

const { data, error } = await supabase
  .from('properties')
  .insert(registro)
  .select()
  .single();

if (error) {
  console.error('Erro ao inserir:', error);
  process.exit(1);
}

console.log('Imóvel cadastrado com sucesso.');
console.log('UUID:', data.id);
console.log('Title:', data.title);
console.log('Slug pra preview:', `https://charles-nobre-corretor.vercel.app/imovel/${data.id}`);
console.log('\nProximos passos:');
console.log('  1. Subir fotos no bucket `properties` (Supabase Storage)');
console.log('  2. UPDATE images com os caminhos publicos retornados pelo bucket');
console.log('  3. Conferir card no catalogo: /imoveis');
