const fetch = require("node-fetch");

const API_KEY = "BPTFGHT70NR9DLX9";

// Liste over aktier vi kigger på (kan ændres senere)
const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];

async function hentTopAktier() {
  const resultater = [];

  for (const symbol of symbols) {
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${API_KEY}`;

    try {
      const response = await fetch(url); // Vi sender forespørgsel til API
      const data = await response.json(); // Vi læser svaret som JSON

      // Hvis vi får markedsværdi, gemmer vi den
      if (data.MarketCapitalization) {
        resultater.push({
          symbol: symbol,
          name: data.Name,
          marketCap: Number(data.MarketCapitalization)
        });
      }
    } catch (err) {
      console.error(`Fejl ved symbol ${symbol}:`, err);
    }
  }

  // Sorter og vælg de 5 største aktier
  return resultater.sort((a, b) => b.marketCap - a.marketCap).slice(0, 5);
}



const porteføljer = [
  {
    navn: "Growth Tech",
    aktier: [
      { symbol: "AAPL", købspris: 150, antal: 10 },
      { symbol: "MSFT", købspris: 280, antal: 5 },
      { symbol: "AMZN", købspris: 105, antal: 6 },
    ],
  },
  {
    navn: "Value Invest",
    aktier: [
      { symbol: "GOOGL", købspris: 120, antal: 8 },
      { symbol: "NVDA", købspris: 200, antal: 4 },
      { symbol: "META", købspris: 180, antal: 3 },
     
    ],
  },
];

const hentTopUrealiseretGevinst = async () => {
  const resultater = [];

  for (const portefølje of porteføljer) {
    for (const aktie of portefølje.aktier) {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${aktie.symbol}&apikey=${API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();


      const quote = data["Global Quote"];
      if (!quote || !quote["05. price"]) continue;

      const aktuelPris = parseFloat(quote["05. price"]);
      const gevinst = (aktuelPris - aktie.købspris) * aktie.antal;
      const samletVærdi = aktuelPris * aktie.antal;

      resultater.push({
        symbol: aktie.symbol,
        portefølje: portefølje.navn,
        gevinst,
        samletVærdi,
      });
    }
  }

  // Vis de 5 største uanset om de er positive eller negative
  return resultater
    .sort((a, b) => Math.abs(b.gevinst) - Math.abs(a.gevinst))
    .slice(0, 5);
};

module.exports = {
  hentTopAktier,
  hentTopUrealiseretGevinst
};
