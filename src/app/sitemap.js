import { getAllPostSlugs } from '@/lib/blog';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://charlesrnobre.com.br';

export default async function sitemap() {
  const today = new Date().toISOString().split('T')[0];

  const routes = ['', '#properties', '#about', '#contact'].map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: today,
    changeFrequency: 'daily',
    priority: 1,
  }));

  const regions = ['imbituba', 'garopaba', 'imarui'].map((region) => ({
    url: `${SITE_URL}/imoveis-em-${region}`,
    lastModified: today,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // Blog index + cidade pages
  const blogIndex = {
    url: `${SITE_URL}/blog`,
    lastModified: today,
    changeFrequency: 'daily',
    priority: 0.7,
  };
  const blogCities = ['imbituba', 'garopaba', 'imarui'].map((c) => ({
    url: `${SITE_URL}/blog/cidade/${c}`,
    lastModified: today,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  // Posts individuais
  let blogPosts = [];
  try {
    const slugs = await getAllPostSlugs();
    blogPosts = (slugs || []).map((s) => ({
      url: `${SITE_URL}/blog/${s.slug}`,
      lastModified: s.published_at ? new Date(s.published_at).toISOString().split('T')[0] : today,
      changeFrequency: 'monthly',
      priority: 0.7,
    }));
  } catch (err) {
    console.warn('sitemap: falha listando posts —', err.message);
  }

  return [...routes, ...regions, blogIndex, ...blogCities, ...blogPosts];
}
