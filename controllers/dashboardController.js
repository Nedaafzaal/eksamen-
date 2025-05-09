//importerer node-fetch og modeller
const fetch = require("node-fetch");
const dashboardModel = require("../models/dashboardModel");
const portfolioModel = require("../models/portfolioModel");
const userModel = require("../models/userModel");

//henter vores API-nøgle fra Finnhub og gemmer fem af de største aktievirksomheder med størst markedsværdi.
const API_KEY = "d0ad5fpr01qm3l9kmfg0d0ad5fpr01qm3l9kmfgg";
const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];

//laver en funktion som henter top 5 aktier fra ekstern api
async function hentTopAktier() {
  const resultater = [];

  for (const symbol of symbols) { //forløkke som gennemgår hvert element i vores symbol array.
    const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${API_KEY}`;
    const svar = await fetch(url); //sender en GET-anmodining til URL vha. fetch.
    const data = await svar.json(); //henter og parser svaret/data til json således vi har det som et objekt i js. 

    //hvis data findes skal objektet med følgende egenskaber skubbes ind i vores array:
    if (data.marketCapitalization) { 
      resultater.push({
        symbol: symbol,
        name: data.name,
        marketCap: Number(data.marketCapitalization),
      });
    }
  }

  //vores resultatarray skal sorteres sådan at størst værdi kommer først, og dernæst skal arrayet kun vises med top 5. 
  return resultater
    .sort((a, b) => b.marketCap - a.marketCap)
    .slice(0, 5);
}

//funktion til at hente top 5 aktier med størst urealiseret gevinst for brugeren.
async function hentTopUrealiseretGevinst(porteføljer) {
  const resultater = [];

  for (const aktie of porteføljer) {
    const url = `https://finnhub.io/api/v1/quote?symbol=${aktie.tickerSymbol}&token=${API_KEY}`;
    const svar = await fetch(url);
    const data = await svar.json();

    //bestemmer aktuel pris ud fra feltet c som i objektet står for current price og tjekker den aktuelle pris eksisterer
    const aktuelPris = parseFloat(data.c);
    if (!Number.isFinite(aktuelPris)) continue;

    const urealiseretGevinst = (aktuelPris - aktie.pris) * aktie.antal;
    const samletVærdi = aktuelPris * aktie.antal;

    resultater.push({
      symbol: aktie.tickerSymbol,
      portefølje: aktie.navn,
      urealiseretGevinst,
      samletVærdi,
    });
  }

  //returnerer top 5 aktier fra brugerens porteføljer med størst urealiseret gevinst 
  return resultater
    .sort((a, b) => b.urealiseretGevinst - a.urealiseretGevinst)
    .slice(0, 5);
}


//funktion som viser dashboard for den bruger, som er logget ind. 
async function visDashboard(req, res) {
  try {
    const brugerID = parseInt(req.cookies.brugerID);
    const bruger = await userModel.hentBrugerMedID(brugerID);
    const brugernavn = bruger.brugernavn || "Ukendt";

    const porteføljer = await dashboardModel.hentPorteføljerMedAktierForBruger(brugerID);
    const totalRealiseret = await portfolioModel.hentTotalRealiseretGevinst();

    let totalVærdi = 0;
    let totalUrealiseret = 0;

    for (const aktie of porteføljer) {
      const url = `https://finnhub.io/api/v1/quote?symbol=${aktie.tickerSymbol}&token=${API_KEY}`;
      const svar = await fetch(url);
      const data = await svar.json();

      const aktuelPris = parseFloat(data.c);
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

//eksporterer funktioner således de kan bruges i controller.
module.exports = {
  visDashboard,
  hentTopAktier,
  hentTopUrealiseretGevinst,
};
