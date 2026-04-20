export default function sitemap() {
  const baseUrl = 'https://charlesnobre.vercel.app'; // URL de deploy
  
  const routes = ['', '#properties', '#about', '#contact'].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString().split('T')[0],
    changeFrequency: 'daily',
    priority: 1,
  }));

  const regions = ['imbituba', 'garopaba', 'imarui'].map((region) => ({
    url: `${baseUrl}/imoveis-em-${region}`,
    lastModified: new Date().toISOString().split('T')[0],
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // Removendo rotas dinâmicas do sitemap por enquanto para garantir build estável
  return [...routes, ...regions];
}
