import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { PropertyCard } from '@/components/PropertyGrid';
import { getPropertiesByCity } from '@/lib/properties';

export const revalidate = 60;

export const metadata = {
  title: 'Imóveis à Venda em Garopaba, SC | Charles R. Nobre',
  description: 'As melhores casas de luxo, terrenos e pousadas à venda em Garopaba, Silveira e Ferrugem. Consultoria exclusiva com Charles R. Nobre.',
};

export default async function GaropabaPage() {
  const filteredListings = await getPropertiesByCity('Garopaba');

  return (
    <main>
      <Navbar />
      <section className="region-hero">
        <div className="container">
          <h1>Imóveis em <span className="text-accent">Garopaba, SC</span></h1>
          <p>Onde o mar encontra a sofisticação urbana. Explore propriedades exclusivas na Silveira, Ferrugem e Centro.</p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container">
          <div className="property-grid-wrap">
            {filteredListings.map((prop) => (
              <PropertyCard 
                key={prop.id} 
                image={prop.images[0]}
                title={prop.title}
                location={`${prop.neighborhood}, ${prop.city}`}
                price={prop.price}
                type={prop.type}
              />
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
