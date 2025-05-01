const fetch = require("node-fetch");

const API_KEY = "VIF5KCDTH18ZUONC";

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

module.exports = {
  hentTopAktier
};
