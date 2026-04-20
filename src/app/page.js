'use client';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import PropertyGrid from '@/components/PropertyGrid';
import About from '@/components/About';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "name": "Charles R. Nobre | Consultoria Imobiliária",
    "description": "Consultoria Imobiliária de Alto Padrão no Litoral Sul de SC. Especialista em Imbituba, Garopaba e Imaruí.",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Imbituba",
      "addressRegion": "SC",
      "addressCountry": "BR"
    },
    "telephone": "+55-48-99945-9527"
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <Hero />
      <PropertyGrid />
      <About />
      <Contact />
      <Footer />
      <WhatsAppFloat />
      
    </main>
  );
}
