'use client';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SearchBar from '@/components/SearchBar';
import { PropertyCard } from '@/components/PropertyGrid';
import listings from '@/data/listings.json';

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const [results, setResults] = useState([]);

  useEffect(() => {
    const intent = searchParams.get('intent');
    const type = searchParams.get('type');
    const city = searchParams.get('city');
    const neighborhood = searchParams.get('neighborhood');
    const query = searchParams.get('query')?.toLowerCase();

    let filtered = listings;

    if (intent) filtered = filtered.filter(p => p.intent === intent);
    if (type) filtered = filtered.filter(p => p.type.toLowerCase() === type.toLowerCase());
    if (city) filtered = filtered.filter(p => p.location.city.toLowerCase() === city.toLowerCase());
    if (neighborhood) filtered = filtered.filter(p => p.location.neighborhood.toLowerCase() === neighborhood.toLowerCase());
    if (query) {
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(query) || 
        p.description.toLowerCase().includes(query)
      );
    }

    setResults(filtered);
  }, [searchParams]);

  return (
    <main className="search-page">
      <Navbar />
      
      <section className="search-header">
        <div className="container">
          <SearchBar />
        </div>
      </section>

      <section className="results-section section-padding">
        <div className="container">
          <div className="results-count">
            <h2>{results.length} {results.length === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}</h2>
          </div>

          {results.length > 0 ? (
            <div className="results-grid">
              {results.map((prop) => (
                <PropertyCard 
                  key={prop.id} 
                  id={prop.id}
                  image={prop.images[0]}
                  title={prop.title}
                  location={`${prop.location.neighborhood}, ${prop.location.city}`}
                  price={prop.price}
                  type={prop.type}
                />
              ))}
            </div>
          ) : (
            <div className="no-results">
              <h3>Nenhum imóvel encontrado com esses critérios.</h3>
              <p>Tente ajustar os filtros ou pesquisar por uma região mais ampla.</p>
            </div>
          )}
        </div>
      </section>

      <Footer />

      <style jsx>{`
        .search-page {
          background: #fdfdfd;
          min-height: 100vh;
        }

        .search-header {
          padding-top: 10rem;
          padding-bottom: 3rem;
          background: var(--bg-dark);
        }

        .results-count {
          margin-bottom: 3rem;
          border-bottom: 1px solid rgba(0,0,0,0.05);
          padding-bottom: 1.5rem;
        }

        .results-count h2 {
          font-family: 'Cinzel', serif;
          font-size: 1.5rem;
          color: var(--primary);
        }

        .results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 2.5rem;
        }

        .no-results {
          text-align: center;
          padding: 8rem 0;
          color: var(--text-muted);
        }

        .no-results h3 {
          font-size: 1.8rem;
          margin-bottom: 1rem;
        }
      `}</style>
    </main>
  );
}

export default function SearchResultsPage() {
  return (
    <Suspense fallback={<div>Carregando resultados...</div>}>
      <SearchResultsContent />
    </Suspense>
  );
}
