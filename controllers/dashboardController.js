const fetch = require("node-fetch"); //importerer node-fetch, så vi kan sende HTTP-requests til et eksternt API 
const dashboardModel = require("../models/dashboardModel"); 
const portfolioModel = require("../models/portfolioModel"); 
const userModel = require("../models/userModel");

const API_KEY = "d0ad5fpr01qm3l9kmfg0d0ad5fpr01qm3l9kmfgg"; //vores API nøgle til finnHub

const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA']; //vi gemmer de 5 største tech aktie-virksomheder

const cache = {}; //anvender en cache til at gemme data midlertidigt i vores system

function setCache(key, data, ttlMs) { //vores cache skal tage imod tre parametre: key (fx aktiesymbol), data (fx aktiekurs) og tid (time to live, målt i milisekunder).
  cache[key] = { data, expires: Date.now() + ttlMs };
}

//funktion som henter data fra vores cache
function getCache(key) { 
  const entry = cache[key]; //vi prøver at finde det der er gemt som key
  if (!entry) return null; //hvis det ikke findes, skal null returneres. 
  if (Date.now() < entry.expires) return entry.data; //hvis den tid vi har nu er mindre end udløbstiden, returnerer vi den data der stadig er gyldig. 
  return null; //hvis data er udløbet, skal null returneres. 
}


//funktion som henter top 5 aktier
async function hentTopAktier() {
  const resultater = []; //laver et array liste til resultaterne

  for (const symbol of symbols) { //loop gennem hvert symbol af de 5 størst tech-aktie virksomheder
    const aktieUrl = `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${API_KEY}`; //gemmer URL som blandt andet giver aktiekursen
    let data = getCache(aktieUrl); //dette URL gemmer vi i vores cache

    if (!data) { //hvis data ikke eksisterer i vores cache
      const response = await fetch(aktieUrl); //skal det hentes fra URL igen.
      data = await response.json(); //dette skal omformeres til json.
      setCache(aktieUrl, data, 60 * 60 * 1000); // vores data fra URL skal cache i 1 time
    }

    if (data.marketCapitalization) { //hvis markedsværdien kommer for det bestemte symbol i URL
      resultater.push({ //skal følgende egenskaber skubbes ind i resultat-array
        symbol: symbol,
        name: data.name,
        marketCap: Number(data.marketCapitalization),
      });
    }
  }
  //resultat array skal sorteres
  resultater.sort(function(a, b) {
    return b.marketCap - a.marketCap; //de aktier med størst markedsværdi skal først
  });
  const top5 = resultater.slice(0, 5); //dernæst skal arrayet "slices" så kun de første 5 vises. 
  return top5; 
}


//funktion som henter de aktier fra brugerens portefølje med størst urealiseret gevinst.
async function hentTopUrealiseretGevinst(porteføljer, kursMap) {
  const resultater = [];

  for (const aktie of porteføljer) { //loop gennem hvert aktie i brugerens porteføljer
    const data = kursMap[aktie.tickerSymbol]; //beder programmet om at gå ind i vores objekt kursMap og finde aktiets symbol, fx "GOOGL"
    const aktuelPris = data.c; //prisen findes under c (current price) i API's svar, og denne gemmer vi for den aktie der blev fundet som data

    if (isNaN(aktuelPris)) continue; //hvis ikke den aktuelle pris er et tal, skal programmet bare springe over til næste

    const urealiseretGevinst = (aktuelPris - aktie.pris) * aktie.antal; //bestemmer urealiseret gevinst som den aktulle pris minus den pris brugeren gav, gange med antallet brugeren har

    const samletVærdi = aktuelPris * aktie.antal;//samlet værdi for aktien

    resultater.push({ //skubber følgende egenskaber ind i resultat array
      symbol: aktie.tickerSymbol,
      portefølje: aktie.navn,
      urealiseretGevinst,
      samletVærdi,
    });
  }
  return resultater //sorterer igen således størst først og kun top 5
    .filter(r => !isNaN(r.urealiseretGevinst))
    .sort((a, b) => b.urealiseretGevinst - a.urealiseretGevinst)
    .slice(0, 5);
}


//funktion som viser dashboard med det hele
async function visDashboard(req, res) {
  try {
    const brugerID = parseInt(req.cookies.brugerID);
    const bruger = await userModel.hentBrugerMedID(brugerID);
    const brugernavn = bruger?.brugernavn || "Ukendt";

<<<<<<< Updated upstream
    const kursMap = {}; //vores objekt hvori vi gemmer aktekurser, i stedet for hele tiden at hente fra API 

    for (const aktie of porteføljer) { //loop gennem hvert aktie i portefølje
=======
    const porteføljer = await dashboardModel.hentPorteføljerMedAktierForBruger(brugerID);
    const totalRealiseret = await portfolioModel.hentTotalRealiseretGevinst();

    const kursMap = {};

    for (const aktie of porteføljer) {
>>>>>>> Stashed changes
      const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${aktie.tickerSymbol}&token=${API_KEY}`;
      let data = getCache(quoteUrl); //prøver først at hente kursdata fra cache, hvis det allerede er hentet tidligere og stadig er gyldigt undgår vi et nyt API-kald og bruger den gemte data i stedet

<<<<<<< Updated upstream
      if (!data) { //hvis der ikke findes fyldig data i cachen 
        const response = await fetch(quoteUrl); //henter kursdata fra Finhub
        data = await response.json(); //gør det til json objekt
        setCache(quoteUrl, data, 5 * 60 * 1000); //kan genbruges i 5 min
=======
      if (!data) {
        const response = await fetch(quoteUrl);
        data = await response.json();
        setCache(quoteUrl, data, 5 * 60 * 1000);
>>>>>>> Stashed changes
      }

      kursMap[aktie.tickerSymbol] = data; //gemmer data 
    }

    let totalVærdi = 0;
    let totalUrealiseret = 0;

    for (const aktie of porteføljer) {
      const data = kursMap[aktie.tickerSymbol]; //henter kursdata fra den aktuelle aktie 
      const aktuelPris = parseFloat(data?.c); //udtrækker og koventere den aktuelle pris til kommatal

      if (!isNaN(aktuelPris)) {
        totalVærdi += aktuelPris * aktie.antal; //lægger værdien af aktien til den samlede porteføljeværdi 
        totalUrealiseret += (aktuelPris - aktie.pris) * aktie.antal; //udregner urealiseret gevinst/tab og ligger til den samlede beløb
      }
    }

    const top5Profit = await hentTopUrealiseretGevinst(porteføljer, kursMap); //finder top 5 værdipapir med størst urealiseret gevinst på tværs af porteføljer 
    const top5 = await hentTopAktier(); //henter top 5 baseret på deres nuværende værdi

<<<<<<< Updated upstream
    res.render("dashboard", { //sender følgende objekt med dets egenskaber videre til dashboard.ejs. Så vi altså kan se top 5 aktier med størst værdi, top 5 aktier med størst profit
=======
    res.render("dashboard", {
>>>>>>> Stashed changes
      top5,
      top5Profit,
      totalVærdi,
      totalUrealiseret,
      totalRealiseret,
      brugernavn // 💡 sendes til EJS
    });

  } catch (err) {
    res.status(500).send("Noget gik galt med dashboardet.");
  }
}

//eksporter funktionerne
module.exports = {
  visDashboard,
  hentTopAktier,
  hentTopUrealiseretGevinst
};
