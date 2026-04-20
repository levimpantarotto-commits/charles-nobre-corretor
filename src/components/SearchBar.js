'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SearchBar() {
  const router = useRouter();
  const [filters, setFilters] = useState({
    type: '',
    city: '',
    neighborhood: '',
    query: ''
  });

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams({
      intent: 'venda',
      ...filters
    });
    router.push(`/buscar?${params.toString()}`);
  };

  return (
    <div className="search-container">
      <div className="search-box-wrapper">
        <form className="search-box-row" onSubmit={handleSearch}>
          <div className="filter-item">
            <select 
              value={filters.type} 
              onChange={(e) => setFilters({...filters, type: e.target.value})}
            >
              <option value="">Tipo de Imóvel</option>
              <option value="casa">Casa</option>
              <option value="apartamento">Apartamento</option>
              <option value="terreno">Terreno</option>
              <option value="comercial">Comercial</option>
            </select>
          </div>

          <div className="filter-item">
            <select 
              value={filters.city} 
              onChange={(e) => setFilters({...filters, city: e.target.value})}
            >
              <option value="">Cidade</option>
              <option value="imbituba">Imbituba</option>
              <option value="garopaba">Garopaba</option>
              <option value="imarui">Imaruí</option>
            </select>
          </div>

          <div className="filter-item">
            <select 
              value={filters.neighborhood} 
              onChange={(e) => setFilters({...filters, neighborhood: e.target.value})}
            >
              <option value="">Bairro</option>
              <option value="praia-do-rosa">Praia do Rosa</option>
              <option value="silveira">Silveira</option>
              <option value="centro">Centro</option>
              <option value="vila-nova">Vila Nova</option>
            </select>
          </div>

          <div className="filter-item search-input-wrap">
            <input 
              type="text" 
              placeholder="Código, nome, endereço..." 
              value={filters.query}
              onChange={(e) => setFilters({...filters, query: e.target.value})}
            />
          </div>

          <button type="submit" className="btn-search">
            BUSCAR IMÓVEIS
          </button>
        </form>
      </div>

      <style jsx>{`
        .search-container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
        }

        .search-box-wrapper {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          padding: 0.5rem;
          border-radius: 8px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.3);
          position: relative;
        }

        .search-box-row {
          display: flex;
          background: var(--white);
          border-radius: 4px;
          overflow: hidden;
          width: 100%;
          border: 1px solid #e2e8f0;
        }

        .filter-item {
          flex: 1;
          border-right: 1px solid #e2e8f0;
          height: 65px;
          display: flex;
          align-items: center;
        }

        .search-input-wrap {
          flex: 2;
        }

        .filter-item select, .filter-item input {
          width: 100%;
          height: 100%;
          padding: 0 1.5rem;
          background: transparent;
          border: none;
          font-size: 0.95rem;
          color: var(--primary);
          font-family: 'Montserrat', sans-serif;
          font-weight: 400;
          outline: none;
        }

        .filter-item input::placeholder {
          color: #a0aec0;
        }

        .btn-search {
          background: #2d3748;
          color: var(--white);
          padding: 0 3rem;
          font-weight: 700;
          font-family: 'Montserrat', sans-serif;
          letter-spacing: 2px;
          transition: var(--transition);
          cursor: pointer;
          border: none;
          white-space: nowrap;
        }

        .btn-search:hover {
          background: var(--secondary);
          color: var(--primary);
        }

        @media (max-width: 992px) {
          .search-box-row {
            flex-direction: column;
            border: none;
            background: transparent;
            gap: 10px;
          }
          .filter-item {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            height: 55px;
            width: 100%;
          }
          .btn-search {
            height: 55px;
            border-radius: 4px;
            width: 100%;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
}
