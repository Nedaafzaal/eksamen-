const fetch = require("node-fetch");
const dashboardModel = require("../models/dashboardModel");
const portfolioModel = require("../models/portfolioModel");
const userModel = require("../models/userModel");

const API_KEY = "d0ad5fpr01qm3l9kmfg0d0ad5fpr01qm3l9kmfgg";
const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];

// Hent top 5 aktier baseret på markedsværdi
async function hentTopAktier() {
  const resultater = [];

  for (const symbol of symbols) {
    const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${API_KEY}`;
    const svar = await fetch(url);
    const data = await svar.json();

    if (data.marketCapitalization) {
      resultater.push({
        symbol: symbol,
        name: data.name,
        marketCap: Number(data.marketCapitalization),
      });
    }
  }

  return resultater
    .sort((a, b) => b.marketCap - a.marketCap)
    .slice(0, 5);
}

// Hent top 5 aktier med størst urealiseret gevinst
async function hentTopUrealiseretGevinst(porteføljer) {
  const resultater = [];

  for (const aktie of porteføljer) {
    const url = `https://finnhub.io/api/v1/quote?symbol=${aktie.tickerSymbol}&token=${API_KEY}`;
    const svar = await fetch(url);
    const data = await svar.json();

    const aktuelPris = parseFloat(data?.c);
    if (isNaN(aktuelPris)) continue;

    const urealiseretGevinst = (aktuelPris - aktie.pris) * aktie.antal;
    const samletVærdi = aktuelPris * aktie.antal;

    resultater.push({
      symbol: aktie.tickerSymbol,
      portefølje: aktie.navn,
      urealiseretGevinst,
      samletVærdi,
    });
  }

  return resultater
    .filter(r => !isNaN(r.urealiseretGevinst))
    .sort((a, b) => b.urealiseretGevinst - a.urealiseretGevinst)
    .slice(0, 5);
}

// Vis dashboard med dynamisk data
async function visDashboard(req, res) {
  try {
    const brugerID = parseInt(req.cookies.brugerID);
    const bruger = await userModel.hentBrugerMedID(brugerID);
    const brugernavn = bruger?.brugernavn || "Ukendt";

    const porteføljer = await dashboardModel.hentPorteføljerMedAktierForBruger(brugerID);
    const totalRealiseret = await portfolioModel.hentTotalRealiseretGevinst();

    let totalVærdi = 0;
    let totalUrealiseret = 0;

    for (const aktie of porteføljer) {
      const url = `https://finnhub.io/api/v1/quote?symbol=${aktie.tickerSymbol}&token=${API_KEY}`;
      const svar = await fetch(url);
      const data = await svar.json();

      const aktuelPris = parseFloat(data?.c);
      if (!isNaN(aktuelPris)) {
        totalVærdi += aktuelPris * aktie.antal;
        totalUrealiseret += (aktuelPris - aktie.pris) * aktie.antal;
      }
    }

    const top5 = await hentTopAktier();
    const top5Profit = await hentTopUrealiseretGevinst(porteføljer);

    res.render("dashboard", {
      top5,
      top5Profit,
      totalVærdi,
      totalUrealiseret,
      totalRealiseret,
      brugernavn,
    });
  } catch (err) {
    console.error("Fejl i dashboard:", err);
    res.status(500).send("Noget gik galt med dashboardet.");
  }
}

module.exports = {
  visDashboard,
  hentTopAktier,
  hentTopUrealiseretGevinst,
};
