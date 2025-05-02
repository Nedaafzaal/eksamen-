const fetch = require("node-fetch");
const dashboardModel = require("../models/dashboardModel");
const API_KEY = "d0ad5fpr01qm3l9kmfg0d0ad5fpr01qm3l9kmfgg";
const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

exports.visDashboard = async (req, res) => {
  try {
    const top5 = await hentTopAktier();
    const porteføljer = await dashboardModel.hentPorteføljerMedAktier();
    const top5Profit = await hentTopUrealiseretGevinst(porteføljer);

    let totalVærdi = 0;
    let totalUrealiseret = 0;

    for (const aktie of porteføljer) {
      const url = `https://finnhub.io/api/v1/quote?symbol=${aktie.tickerSymbol}&token=${API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      const aktuelPris = parseFloat(data.c);

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
      totalRealiseret: 0
    });

  } catch (err) {
    console.error("Fejl ved hentning af dashboard:", err);
    res.status(500).send("Noget gik galt med dashboardet.");
  }
};

async function hentTopAktier() {
  const resultater = [];

  for (const symbol of symbols) {
    const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.marketCapitalization) {
      resultater.push({
        symbol: symbol,
        name: data.name,
        marketCap: Number(data.marketCapitalization),
      });
    }
  }

  return resultater.sort((a, b) => b.marketCap - a.marketCap).slice(0, 5);
}

async function hentTopUrealiseretGevinst(porteføljer) {
  const resultater = [];

  for (const aktie of porteføljer) {
    const url = `https://finnhub.io/api/v1/quote?symbol=${aktie.tickerSymbol}&token=${API_KEY}`;
    await sleep(1100); // 60 calls/min limit = 1 call per 1.1s

    try {
      const response = await fetch(url);
      const data = await response.json();
      const aktuelPris = parseFloat(data.c);

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
