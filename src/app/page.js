'use client';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import PropertyGrid from '@/components/PropertyGrid';
import About from '@/components/About';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import listings from '@/data/listings.json';

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": listings.map((listing, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Accommodation",
        "name": listing.title,
        "description": listing.description,
        "address": {
          "@type": "PostalAddress",
          "addressLocality": listing.location.city,
          "addressRegion": listing.location.state,
          "addressCountry": "BR"
        },
        "price": listing.price,
        "priceCurrency": "BRL",
        "image": `https://charlesnobre.com.br${listing.images[0]}`
      }
    }))
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
