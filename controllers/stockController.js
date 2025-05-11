//importerer node-fetch og model-moduler for konto og porteføljer
const fetch = require("node-fetch");
const kontoData = require("../models/accountModel");
const { værdipapirData, handelData } = require("../models/stockModel");
const portefoljeData = require("../models/portfolioModel");

//benytter ALPHA VANTAGE API
const ALPHA_API_KEY = "KRRBZ37Z710VJQ5K";

//funktion som gør det muligt at søge på værdipapir
async function søgEfterPapir(req, res) {
  const søgning = req.query.query; //tager fat i søgefeltets forespørgsel
  const porteføljeID = req.params.id;

  if (!søgning) {
    return res.status(400).send("Skriv venligst noget i feltet");
  }

  try {
    //bygger et URL til Alpha Vantage som laver en søgning efter symbol, sender en GET-anmodning til URL og parser til JSON-objekt
    const søgeLink = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${søgning}&apikey=${ALPHA_API_KEY}`;
    const svar = await fetch(søgeLink);
    const data = await svar.json();
    //console.log("Alpha Vantage:", data); brugt til debugging

    //henter det første match af søgningen, og gemmer det i "resultat"
    const resultat = data.bestMatches[0];

    if (!resultat) {
      return res.send("Ingen værdipapir kunne findes");
    }

    //søgningsresultatet svarer tilbage i et objekt, og vi henter symbolet og navnet fra svaret
    const symbol = resultat["1. symbol"];
    const navn = resultat["2. name"];

    //for at hente den aktuelle pris bygger vi et nyt URL som tager imod det symbol, som tilhører det bedste match
    const prisLink = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_API_KEY}`;
    const prisSvar = await fetch(prisLink);
    const prisData = await prisSvar.json();

    //tager fat i key=05 fra Alpha's svar, som svarer til prisen. Hvis ikke den kan findes, skal "ukendt" sættes for at undgå at programmet crasher
    const pris = prisData["Global Quote"]["05. price"] || "Ukendt";
    const brugerID = req.cookies.brugerID;
    const konti = await kontoData.hentKontiForBruger(brugerID);

    let kontoID;
    if (konti && konti.length > 0 && konti[0].kontoID) {
      // 1. hvis konti er hentet og dermed eksisterer, 2. hvis kontilisten har mindst et element og 3. hvis første element i listen består af kontoID
      kontoID = konti[0].kontoID;
    }

    //konstruerer et result objekt der indeholder følgende egenskaber
    const result = {
      symbol: symbol,
      navn: navn,
      pris: pris,
    };

    res.render("searchPapir", {
      result: result, //videresender resultobjektet til searchPapir.ejs
      porteføljeID: porteføljeID,
    });
  } catch (fejl) {
    console.error(fejl);
    res.status(500).send("Fejl under søgning af værdipapir");
  }
}

//viser formular til at købe værdipapir
async function visBuyPapirForm(req, res) {
  const porteføljeID = parseInt(req.params.id); //omformaterer porteføljeID til heltal
  const symbol = req.query.symbol;
  const navn = req.query.navn;
  const pris = req.query.pris;

  //hvis hverken symbol, navn eller pris findes
  if (!symbol || !navn || !pris) {
    return res
      .status(400)
      .send("Mangler oplysninger til at kunne vise formular");
  }

  try {
    //købet skal være tilknyttet portefølje og konto
    const portefølje = await portefoljeData.hentPorteføljeMedID(porteføljeID);
    if (!portefølje) {
      return res.status(404).send("Portefølje kan ikke findes");
    }

    const konto = await kontoData.hentKontoMedID(portefølje.kontoID);
    if (!konto) {
      return res.status(404).send("Tilknyttet konto kan ikke findes");
    }

    //sender objekt videre til buyPapir.ejs, for at vise tilstrækkelige informationer
    res.render("buyPapir", {
      tickerSymbol: symbol,
      navn,
      pris,
      porteføljeID,
      konto,
      transaktionstype: "køb", //typen sættes som "køb"
      værditype: "Aktie",
      gebyr: 0, //hardcoder gebyr til 0 ved køb af aktier
      tidspunkt: new Date().toISOString(), //opretter den aktuelle tid og dato og konverterer til ISO format: YYYY-MM-DDTHH:mm:ss.sss som er dato og tidspunkt
    });
  } catch (err) {
    console.error("Fejl i visBuyPapirForm", err);
    res.status(500).send("Noget gik galt og formular kunne ikke vises");
  }
}


//funktion der viser detaljer om værdipapir
async function visVærdipapirDetaljer(req, res) {
  try {
    const værdipapirID = parseInt(req.params.id);

    if (isNaN(værdipapirID)) {
      return res.status(400).send("Ugyldigt værdipapirID");
    }

    const værdipapir = await værdipapirData.hentVærdipapirMedID(værdipapirID);
    if (!værdipapir) {
      return res
        .status(404)
        .send("Værdipapir kunne ikke findes. Prøv at søge igen");
    }

    const historik = await værdipapirData.hentHistorikForVærdipapir(
      værdipapirID
    );
    res.render("valueInfo", { værdipapir, historik });
  } catch (err) {
    console.error(err);
    res.status(500).send("Fejl ved indlæsning af værdipapir");
  }
}


//funktion når man vil købe eller sælge
async function købEllerSælg(req, res) {
  try {
    const porteføljeID = parseInt(req.body.porteføljeID);

    //hent kontoID via porteføljeID
    const portefølje = await portefoljeData.hentPorteføljeMedID(porteføljeID);
    if (!portefølje) {
      return res.status(404).send("Portefølje findes ikke");
    }

    const kontoID = portefølje.kontoID;
    const konto = await kontoData.hentKontoMedID(kontoID);
    if (!konto || !konto.aktiv) {
      return res
        .status(403)
        .send("Kontoen er lukket, dermed er ingen handel mulig");
    }

    //data som skal bruges til registreringen af handlen
    const data = {
      porteføljeID,
      kontoID,
      type: req.body.transaktionstype,
      pris: parseFloat(req.body.pris),
      gebyr: 0,
      antal: parseInt(req.body.antal),
      tickerSymbol: req.body.tickerSymbol,
      værditype: req.body.værditype,
      navn: req.body.navn,
    };

    //kalder på registrer handel og opdater sidstehandels dato
    await handelData.registrerHandel(data);
    await portefoljeData.opdaterSidsteHandelsDato(porteføljeID);
    res.redirect(`/portefolje/${porteføljeID}`);
  } catch (err) {
    console.error("Fejl under handel", err.message);
    res.status(400).send("Fejl under handel: " + err.message);
  }
}


//funktion der henter formular for sælg papir
async function sælgPapirForm(req, res) {
  const værdipapirID = parseInt(req.params.id);
  const værdipapir = await værdipapirData.hentVærdipapirMedID(værdipapirID);
  const porteføljeID = værdipapir.porteføljeID;

  //henter det portefølje som værdipapir tilhører
  const portefølje = await portefoljeData.hentPorteføljeMedID(porteføljeID);
  if (!portefølje) {
    return res.status(404).send("Portefølje blev ikke fundet");
  }

  //henter den konto, portefølje tilhører
  const konto = await kontoData.hentKontoMedID(portefølje.kontoID);
  if (!konto) {
    return res.status(404).send("Konto blev ikke fundet");
  }

  //sender følgende objekt med tilhørende egenskaber til sellPapirForm.ejs
  res.render("sellPapirForm", {
    værdipapir,
    tickerSymbol: værdipapir.tickerSymbol,
    navn: værdipapir.navn,
    pris: værdipapir.pris,
    porteføljeID,
    konto,
    transaktionstype: "sælg",
    værditype: "Aktie",
    gebyr: 0,
    tidspunkt: new Date().toISOString(),
  });
}


//funktion som henter kurs udvikling til visualisering
async function hentKursudvikling(req, res) {
  const symbol = req.params.symbol.toUpperCase();

  //bygger et link til Alpha Vantage for at hente daglige kurser. URL tager imod symbolet på værdipapiret
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${ALPHA_API_KEY}`;

  try {
    const svar = await fetch(url);
    const data = await svar.json();

    if (!data["Time Series (Daily)"]) {
      return res
        .status(400)
        .json({ fejl: "Ugyldigt symbol eller intet fundet" });
    }

    //da grafen skal være pænt visuelt og ikke fylde for meget, henter vi kun data fra et år siden. Vi opretter derfor en dato for præcis et år siden
    const forEtÅrSiden = new Date();
    forEtÅrSiden.setFullYear(forEtÅrSiden.getFullYear() - 1);

    //laver kursdataen fra API til en liste af dato og kursinfo
    const kursListe = Object.entries(data["Time Series (Daily)"]);
    const historik = [];

    //forloop som gennemgår hver dato i kurslisten
    for (const [dato, værdier] of kursListe) {
      const dagsDato = new Date(dato);
      //tjekker om dagsdato er indenfor det seneste år
      if (dagsDato >= forEtÅrSiden) {
        //henter lukkeprisen og laver et nyt objekt med dato og pris
        const lukkepris = parseFloat(værdier["4. close"]);
        //pusher dato og pris ind i historiklisten
        historik.push({
          dato: dato,
          pris: lukkepris,
        });
      }
    }

    //sorterer historikken så de ældste datoer kommer først
    historik.sort((a, b) => new Date(a.dato) - new Date(b.dato));
    res.json(historik); //sender historikken som svar i JSON-format
  } catch (fejl) {
    console.error("Noget gik galt", fejl);
    res.status(500).send("Kan ikke vise historik");
  }
}

module.exports = {
  søgEfterPapir,
  visBuyPapirForm,
  visVærdipapirDetaljer,
  hentKursudvikling,
  købEllerSælg,
  sælgPapirForm,
};
