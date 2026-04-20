import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { PropertyCard } from '@/components/PropertyGrid';
import listings from '@/data/listings.json';

export const metadata = {
  title: 'Imóveis e Sítios em Imaruí, SC | Charles R. Nobre',
  description: 'Tranquilidade e natureza em Imaruí. Confira sítios, terrenos e casas com vista para a lagoa. O refúgio que você procura com Charles R. Nobre.',
};

export default function ImaruiPage() {
  const filteredListings = listings.filter(l => l.location.city === 'Imaruí');

  return (
    <main>
      <Navbar />
      <section className="region-hero">
        <div className="container">
          <h1>Imóveis em <span className="text-accent">Imaruí, SC</span></h1>
          <p>A paz da lagoa combinada com a proximidade do mar. O lugar ideal para o seu sítio ou casa de campo.</p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container">
          <div className="property-grid-wrap">
            {filteredListings.length > 0 ? (
              filteredListings.map((prop) => (
                <PropertyCard 
                  key={prop.id} 
                  image={prop.images[0]}
                  title={prop.title}
                  location={`${prop.location.neighborhood}, ${prop.location.city}`}
                  price={prop.price}
                  type={prop.type}
                />
              ))
            ) : (
              <p className="no-listings">Em breve novas oportunidades em Imaruí.</p>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
