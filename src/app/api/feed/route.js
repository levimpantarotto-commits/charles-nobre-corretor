import listings from '@/data/listings.json';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://charlesnobre.com.br';
  
  const propertiesXml = listings.map(listing => `
    <Listing>
      <ListingID>${listing.id}</ListingID>
      <Title><![CDATA[${listing.title}]]></Title>
      <TransactionType>${listing.type === 'Venda' ? 'For Sale' : 'For Rent'}</TransactionType>
      <DetailViewUrl>${baseUrl}/imoveis/${listing.id}</DetailViewUrl>
      <Featured>false</Featured>
      <Location>
        <Country Abbreviation="BR">Brasil</Country>
        <State Abbreviation="${listing.location.state}">${listing.location.state}</State>
        <City>${listing.location.city}</City>
        <Neighborhood>${listing.location.neighborhood}</Neighborhood>
      </Location>
      <Details>
        <PropertyType>${listing.category === 'Residencial' ? 'Residential / Home' : 'Land / Lot'}</PropertyType>
        <Description><![CDATA[${listing.description}]]></Description>
        <ListPrice Currency="BRL">${listing.price}</ListPrice>
        <LivingArea Unit="square metres">${listing.area}</LivingArea>
        <Features>
          ${listing.features.map(f => `<Feature>${f}</Feature>`).join('')}
        </Features>
      </Details>
      <Media>
        ${listing.images.map(img => `
          <Item medium="image" caption="${listing.title}">${baseUrl}${img}</Item>
        `).join('')}
      </Media>
      <Contact>
        <Name>Charles R. Nobre</Name>
        <Email>contato@charlesnobre.com.br</Email>
        <Website>${baseUrl}</Website>
      </Contact>
    </Listing>
  `).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ListingDataFeed xmlns="http://www.viva-real.com/schemas/1.0/Vivanet" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Header>
    <Provider>Charles R. Nobre Site</Provider>
    <Email>contato@charlesnobre.com.br</Email>
    <ContactName>Charles R. Nobre</ContactName>
  </Header>
  <Listings>
    ${propertiesXml}
  </Listings>
</ListingDataFeed>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
