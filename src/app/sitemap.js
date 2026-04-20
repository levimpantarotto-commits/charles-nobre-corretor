import listings from '@/data/listings.json';

export default function sitemap() {
  const baseUrl = 'https://charlesnobre.com.br';
  
  // Base routes
  const routes = ['', '#properties', '#about', '#contact'].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString().split('T')[0],
    changeFrequency: 'daily',
    priority: 1,
  }));

  // Regional landing pages (to be created)
  const regions = ['imbituba', 'garopaba', 'imarui'].map((region) => ({
    url: `${baseUrl}/imoveis-em-${region}`,
    lastModified: new Date().toISOString().split('T')[0],
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // Individual property pages (future)
  const propertyRoutes = listings.map((listing) => ({
    url: `${baseUrl}/imoveis/${listing.id}`,
    lastModified: new Date().toISOString().split('T')[0],
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...routes, ...regions, ...propertyRoutes];
}
