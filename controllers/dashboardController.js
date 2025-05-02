const fetch = require("node-fetch");
const dashboardModel = require("../models/dashboardModel");
const API_KEY = "OKH4D18S9F8SQCQR";
const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];

// Sæt pause mellem API-kald (for at undgå rate-limits)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

exports.visDashboard = async (req, res) => {
  try {
    const top5 = await hentTopAktier();
    const porteføljer = await dashboardModel.hentPorteføljerMedAktier();
    const top5Profit = await hentTopUrealiseretGevinst(porteføljer);

    let totalVærdi = 0;
    let totalUrealiseret = 0;

    for (const aktie of porteføljer) {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${aktie.tickerSymbol}&apikey=${API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      const quote = data["Global Quote"];
      const aktuelPris = parseFloat(quote?.["05. price"]);

      if (!isNaN(aktuelPris)) {
        const værdi = aktuelPris * aktie.antal;
        totalVærdi += værdi;
        totalUrealiseret += (aktuelPris - aktie.pris) * aktie.antal;
      }
    }

    res.render("dashboard", {
      top5,
      top5Profit,
      totalVærdi,
      totalUrealiseret,
      totalRealiseret: 0 // Placeholder
    });

  } catch (err) {
    console.error("Fejl ved hentning af dashboard:", err);
    res.status(500).send("Noget gik galt med dashboardet.");
  }
};

async function hentTopAktier() {
  const resultater = [];

  for (const symbol of symbols) {
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.MarketCapitalization) {
      resultater.push({
        symbol: symbol,
        name: data.Name,
        marketCap: Number(data.MarketCapitalization),
      });
    }
  }

  return resultater.sort((a, b) => b.marketCap - a.marketCap).slice(0, 5);
}

async function hentTopUrealiseretGevinst(porteføljer) {
  const resultater = [];

  for (const aktie of porteføljer) {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${aktie.tickerSymbol}&apikey=${API_KEY}`;
    await sleep(15000); // Vent 15 sekunder

    try {
      const response = await fetch(url);
      const json = await response.json();
      const quote = json["Global Quote"];

      if (!quote || !quote["05. price"]) continue;

      const aktuelPris = parseFloat(quote["05. price"]);
      if (isNaN(aktuelPris)) continue;

      const gevinst = (aktuelPris - aktie.pris) * aktie.antal;
      const samletVærdi = aktuelPris * aktie.antal;

      resultater.push({
        symbol: aktie.tickerSymbol,
        portefølje: aktie.navn,
        gevinst,
        samletVærdi,
      });
    } catch (err) {
      console.error("Fejl ved hentning af aktiekurs:", aktie.tickerSymbol, err);
    }
  }

  return resultater
    .filter(r => !isNaN(r.gevinst))
    .sort((a, b) => b.gevinst - a.gevinst)
    .slice(0, 5);
}


