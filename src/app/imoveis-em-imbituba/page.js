import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { PropertyCard } from '@/components/PropertyGrid';
import { getPropertiesByCity } from '@/lib/properties';

export const revalidate = 60;

export const metadata = {
  title: 'Imóveis à Venda em Imbituba, SC | Charles R. Nobre',
  description: 'Confira as melhores casas e terrenos à venda em Imbituba, Praia do Rosa e região. Oportunidades exclusivas com Charles R. Nobre Corretor.',
};

export default async function ImbitubaPage() {
  const filteredListings = await getPropertiesByCity('Imbituba');

  return (
    <main>
      <Navbar />
      <section className="region-hero">
        <div className="container">
          <h1>Imóveis em <span className="text-accent">Imbituba, SC</span></h1>
          <p>Encontre seu refúgio na capital nacional da Baleia Franca. Oportunidades únicas na Praia do Rosa e região.</p>
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
