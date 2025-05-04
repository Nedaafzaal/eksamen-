const fetch = require("node-fetch");
const dashboardModel = require("../models/dashboardModel");

const API_KEY = "d0ad5fpr01qm3l9kmfg0d0ad5fpr01qm3l9kmfgg";
const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];

// Simpel in-memory cache med TTL (time to live)
const cache = {};
function setCache(key, data, ttlMs) {
  cache[key] = { data, expires: Date.now() + ttlMs };
}
function getCache(key) {
  const entry = cache[key];
  if (entry && Date.now() < entry.expires) return entry.data;
  return null;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Viser dashboard med top 5 aktier og samlet porteføljeværdi
async function visDashboard(req, res) {
  try {
    const top5 = await hentTopAktier();
    const porteføljer = await dashboardModel.hentPorteføljerMedAktier();
    const top5Profit = await hentTopUrealiseretGevinst(porteføljer);

    let totalVærdi = 0;
    let totalUrealiseret = 0;

    for (const aktie of porteføljer) {
      const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${aktie.tickerSymbol}&token=${API_KEY}`;
      let data = getCache(quoteUrl);
      if (!data) {
        const response = await fetch(quoteUrl);
        data = await response.json();
        setCache(quoteUrl, data, 5 * 60 * 1000); // cache i 5 minutter
      }

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
      totalRealiseret: 0 // evt. placeholder
    });

  } catch (err) {
    console.error("Fejl ved hentning af dashboard:", err);
    res.status(500).send("Noget gik galt med dashboardet.");
  }
}

// Henter top 5 aktier ud fra markedsværdi
async function hentTopAktier() {
  const resultater = [];

  for (const symbol of symbols) {
    const profileUrl = `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${API_KEY}`;
    let data = getCache(profileUrl);
    if (!data) {
      const response = await fetch(profileUrl);
      data = await response.json();
      setCache(profileUrl, data, 60 * 60 * 1000); // cache i 1 time
    }

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

// Henter top 5 aktier med højest urealiseret gevinst
async function hentTopUrealiseretGevinst(porteføljer) {
  const resultater = [];

  for (const aktie of porteføljer) {
    const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${aktie.tickerSymbol}&token=${API_KEY}`;
    await sleep(1100); // undgå rate-limit

    let data = getCache(quoteUrl);
    if (!data) {
      const response = await fetch(quoteUrl);
      data = await response.json();
      setCache(quoteUrl, data, 5 * 60 * 1000); // cache i 5 minutter
    }

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
  }

  return resultater
    .filter(r => !isNaN(r.gevinst))
    .sort((a, b) => b.gevinst - a.gevinst)
    .slice(0, 5);
}

// Eksportér funktioner
module.exports = {
  visDashboard,
  hentTopAktier,
  hentTopUrealiseretGevinst
};
