import "./globals.css";

export const metadata = {
  title: 'Charles R. Nobre Corretor | Imóveis em Imbituba, Garopaba e Imaruí',
  description: 'Encontre os melhores imóveis de luxo e oportunidades no litoral sul de Santa Catarina com Charles R. Nobre. Especialista em Imbituba, Garopaba e Imaruí.',
};

import { LeadProvider } from '@/context/LeadContext';
import LeadModal from '@/components/LeadModal';

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <LeadProvider>
          {children}
          <LeadModal />
        </LeadProvider>
      </body>
    </html>
  );
}
