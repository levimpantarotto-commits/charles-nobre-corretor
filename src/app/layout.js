import "./globals.css";
import Script from 'next/script';

export const metadata = {
  title: 'Charles R. Nobre Corretor | Imóveis em Imbituba, Garopaba e Imaruí',
  description: 'Encontre os melhores imóveis de luxo e oportunidades no litoral sul de Santa Catarina com Charles R. Nobre. Especialista em Imbituba, Garopaba e Imaruí.',
};

import { LeadProvider } from '@/context/LeadContext';
import LeadModal from '@/components/LeadModal';

const GA_ID = 'G-S896HWRGM9';

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Google tag (gtag.js) */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
      </head>
      <body>
        <LeadProvider>
          {children}
          <LeadModal />
        </LeadProvider>
      </body>
    </html>
  );
}
