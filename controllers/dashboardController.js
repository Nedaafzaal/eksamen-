//importerer node-fetch og modeller
const fetch = require("node-fetch");
const dashboardModel = require("../models/dashboardModel");
const portfolioModel = require("../models/portfolioModel");
const userModel = require("../models/userModel");

//henter vores API-nøgle fra Finnhub og gemmer 5 af de største aktievirksomheder med størst markedsværdi i en liste
const API_KEY = "d0ad5fpr01qm3l9kmfg0d0ad5fpr01qm3l9kmfgg";
const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];


//funktion som henter top 5 aktier med størst markedsværdi
async function hentTopAktier() {
  const resultater = [];

  //forløkke som gennemgår hvert element i symbol-listen
  for (const symbol of symbols) { 
    const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${API_KEY}`;
    
    //for hver iteration sendes GET-anmoding til URL vha. fetch og parser svaret som JSON-objekt
    const svar = await fetch(url); 
    const data = await svar.json(); 

    //hvis data indeholder markedsværdi, skal følgende skubbes ind i resultatslisten:
    if (data.marketCapitalization) { 
      resultater.push({
        symbol: symbol,
        name: data.name,
        marketCap: Number(data.marketCapitalization),
      });
    }
  }

  //resultatslisten skal vises fra størst til mindst, og kun 5 svar skal gemmes
  return resultater
    .sort((a, b) => b.marketCap - a.marketCap)
    .slice(0, 5);
}

//funktion til at vise dashboard for den bruger, der er logget ind
async function visDashboard(req, res) {
  try {
    const brugerID = parseInt(req.cookies.brugerID);
    const bruger = await userModel.hentBrugerMedID(brugerID);
    const brugernavn = bruger.brugernavn || "Ukendt"; //hvis ikke brugernavn kan hentes, skal "ukendt" vises.

    const porteføljer = await dashboardModel.hentPorteføljerMedAktierForBruger(brugerID);
    const totalRealiseret = await portfolioModel.hentTotalRealiseretGevinst(brugerID);

    let totalVærdi = 0;
    let totalUrealiseret = 0;
    const aktieData = [];

    //forløkke igennem hvert aktie i brugerens porteføljer, som for hver iteration henter symbolet og parser det som JSON-objekt
    for (const aktie of porteføljer) {
      const url = `https://finnhub.io/api/v1/quote?symbol=${aktie.tickerSymbol}&token=${API_KEY}`;
      const svar = await fetch(url);
      const data = await svar.json();

      //bestemmer aktuelpris ud fra URL svar C (current price). Hvis ikke aktuelpris er et endeligt tal, skal aktien hoppes over og den skal starte næste iteration
      const aktuelPris = parseFloat(data.c);
      if (!Number.isFinite(aktuelPris)) continue;

      const samletVærdi = aktuelPris * aktie.antal;
      const urealiseretGevinst = (aktuelPris - aktie.pris) * aktie.antal;

      totalVærdi += samletVærdi;
      totalUrealiseret += urealiseretGevinst;

      aktieData.push({
        symbol: aktie.tickerSymbol,
        portefølje: aktie.navn,
        urealiseretGevinst,
        samletVærdi,
      });
    }

    //henter top 5 aktier fra brugerens portefølje, fra størst til mindst. 
    const top5Profit = aktieData
      .sort((a, b) => b.urealiseretGevinst - a.urealiseretGevinst)
      .slice(0, 5);

    
    //vi kalder på funktionen hentTopAktier
    const top5 = await hentTopAktier();

    //videresender følgende egenskaber til dashboard.ejs
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

//eksporterer funktionerne så de kan benyttes i routes
module.exports = {
  visDashboard,
  hentTopAktier,
};
