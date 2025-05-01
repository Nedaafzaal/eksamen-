const fetch = require("node-fetch");
const sql = require("mssql");
const sqlConfig = require("../sqlConfig/sqlConfig");
const API_KEY = "V32NSLB2RZ1VQ5QJ";

// Aktier vi bruger til top 5 markedsværdi
const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];

async function hentTopAktier() {
  const resultater = [];

  for (const symbol of symbols) {
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${API_KEY}`;
    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.MarketCapitalization) {
        resultater.push({
          symbol: symbol,
          name: data.Name,
          marketCap: Number(data.MarketCapitalization),
        });
      }
    } catch (err) {
      console.error(`Fejl ved symbol ${symbol}:`, err);
    }
  }

  return resultater.sort((a, b) => b.marketCap - a.marketCap).slice(0, 5);
}

async function hentPorteføljerMedAktier() {
  const db = await sql.connect(sqlConfig);
  const result = await db.request().query(`
    SELECT p.navn, v.tickerSymbol, v.pris, v.antal
    FROM eksamenSQL.porteføljer p
    JOIN eksamenSQL.værdipapir v ON p.porteføljeID = v.porteføljeID
  `);
  return result.recordset;
}

const hentTopUrealiseretGevinst = async () => {
  const data = await hentPorteføljerMedAktier();
  const resultater = [];

  for (const aktie of data) {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${aktie.symbol}&apikey=${API_KEY}`;
    const response = await fetch(url);
    const json = await response.json();

    const quote = json["Global Quote"];
    if (!quote || !quote["05. price"]) continue;

    const aktuelPris = parseFloat(quote["05. price"]);
    const gevinst = (aktuelPris - aktie.købspris) * aktie.antal;
    const samletVærdi = aktuelPris * aktie.antal;

    resultater.push({
      symbol: aktie.symbol,
      portefølje: aktie.navn,
      gevinst,
      samletVærdi,
    });
  }

  return resultater.sort((a, b) => Math.abs(b.gevinst) - Math.abs(a.gevinst)).slice(0, 5);
};

module.exports = {
  hentTopAktier,
  hentTopUrealiseretGevinst,
  hentPorteføljerMedAktier,
};
