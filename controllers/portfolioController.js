const portfolioModel = require("../models/portfolioModel");
const { registrerHandel } = require("../models/portfolioModel");

// Viser alle porteføljer i en liste
async function visPortefoljeOversigt(req, res) {
  try {
    const portefoljer = await portfolioModel.hentAllePortefoljer();
    let totalVærdi = 0;

    for (const p of portefoljer) {
      const papirer = await portfolioModel.hentVærdipapirerTilPortefølje(p.porteføljeID);
      const samlet = papirer.reduce((sum, papir) => sum + (papir.pris * papir.antal), 0);
      totalVærdi += samlet;
    }

    res.render("portefoljeOversigt", { portefoljer, totalVærdi });
  } catch (err) {
    console.error("Fejl ved hentning af porteføljer:", err);
    res.status(500).send("Noget gik galt ved visning af porteføljeoversigten.");
  }
}

// Viser én bestemt portefølje og dens aktier
async function visEnPortefolje(req, res) {
  const portefoljeID = parseInt(req.params.id, 10);
  if (isNaN(portefoljeID)) {
    return res.status(400).send("Ugyldigt portefølje-ID");
  }
  try {
    const portefolje = await portfolioModel.hentPortefoljeMedID(portefoljeID);
    if (!portefolje) {
      return res.status(404).send("Portefølje ikke fundet.");
    }
    const værdipapirer = await portfolioModel.hentVærdipapirerTilPortefølje(portefoljeID);
    const historik = await portfolioModel.hentVærdiHistorik(portefoljeID);
    let samletVærdi = 0;
    for (let i = 0; i < værdipapirer.length; i++) {
      samletVærdi += værdipapirer[i].antal * værdipapirer[i].pris;
    }
    res.render("portefolje", { portefolje, værdipapirer, samletVærdi,historik });
  } catch (err) {
    console.error("Fejl ved visning af portefølje:", err);
    res.status(500).send("Noget gik galt ved visning af portefølje.");
  }
}

// Viser formularen til at oprette ny portefølje
function visOpretPortefoljeFormular(req, res) {
  res.render("opretPortefolje");
}

// Når brugeren sender formularen og vil oprette ny portefølje
// Når brugeren sender formularen og vil oprette ny portefølje
async function opretPortefolje(req, res) {
    const { navn, kontotilknytning, forventetVærdi } = req.body;
    const brugerID = req.cookies.brugerID; // eller hvor du gemmer det
  
    if (!brugerID) {
      return res.status(401).send("Bruger ikke logget ind.");
    }
  
    try {
      await portfolioModel.opretNyPortefolje({
        navn,
        kontotilknytning,
        forventetVærdi,
        brugerID
      });
  
      res.redirect("/portefolje/oversigt");
    } catch (err) {
      console.error("Fejl ved oprettelse af portefølje:", err);
      res.status(500).send("Kunne ikke oprette portefølje.");
    }
  }
  

// Viser køb/salg transaktioner for en portefølje

async function hentTransaktionerForPortefølje(req, res) {
    const porteføljeID = parseInt(req.params.id, 10);
    if (isNaN(porteføljeID)) {
      return res.status(400).send("Ugyldigt portefølje-ID");
    }
  
    try {
      const transaktioner = await portfolioModel.hentTransaktionerForPortefølje(porteføljeID);
      const portefølje = await portfolioModel.hentPortefoljeMedID(porteføljeID); // <- her bruger du din eksisterende funktion
  
      res.render("handelshistorik", { transaktioner, portefølje });
    } catch (err) {
      console.error("Fejl ved hentning af handelshistorik:", err);
      res.status(500).send("Kunne ikke hente handelshistorik.");
    }
  }

// Søger efter værdipapir med API og viser søgeresultat
async function søgEfterPapir(req, res) {
  const søgning = req.query.query;
  const porteføljeID = req.params.id;
  if (!søgning) {
    return res.status(400).send("Skriv venligst noget du vil søge efter.");
  }
  try {
    const søgeLink = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${søgning}&apikey=${process.env.API_KEY}`;
    const svar = await fetch(søgeLink);
    const data = await svar.json();
    const fundet = data.bestMatches?.[0];
    if (!fundet) {
      return res.send("Ingen værdipapir fundet.");
    }
    const symbol = fundet["1. symbol"];
    const navn = fundet["2. name"];

    const prisLink = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${process.env.API_KEY}`;
    const prisSvar = await fetch(prisLink);
    const prisData = await prisSvar.json();
    const pris = prisData["Global Quote"]?.["05. price"] || "Ukendt";

    const brugerID = req.cookies.brugerID;
    const konti = await portfolioModel.hentKontiForBruger(brugerID);
    const kontoID = konti?.[0]?.kontoID || null;

    res.render("searchPapir", {
      result: { symbol, navn, pris },
      porteføljeID,
      kontoID
    });
  } catch (fejl) {
    console.error(fejl);
    res.status(500).send("Noget gik galt under søgningen.");
  }
}

// Viser formular til at købe værdipapir
async function visBuyPapirForm(req, res) {
  const { symbol, navn, pris } = req.query;
  if (!symbol || !navn || !pris) {
    return res.redirect(`/dashboard?fejl=missing_data`);
  }
  const portefoljeID = parseInt(req.params.id);
  const konti = await portfolioModel.hentKontiForBruger(req.cookies.brugerID);
  res.render("buyPapir", {
    tickerSymbol: symbol,
    navn,
    pris,
    portefoljeID,
    konti,
    transaktionstype: "køb",
    værditype: "Aktie",
    gebyr: 0,
    tidspunkt: new Date().toISOString()
  });
}

// Når brugeren køber eller sælger værdipapir
async function købEllerSælg(req, res) {
    try {
      const dollarKurs = 7.0;
      const prisIUSD = parseFloat(req.body.pris);
      const prisIDKK = prisIUSD * dollarKurs;
      const data = {
        porteføljeID: parseInt(req.body.porteføljeID),
        kontoID: parseInt(req.body.kontoID),
        værditype: req.body.værditype,
        type: req.body.transaktionstype,
        pris: prisIDKK,
        gebyr: parseFloat(req.body.gebyr) || 0,
        dato: new Date(),
        tidspunkt: new Date(),
        antal: parseFloat(req.body.antal),
        navn: req.body.navn,
        tickerSymbol: Array.isArray(req.body.tickerSymbol)
          ? req.body.tickerSymbol[0]
          : req.body.tickerSymbol
      };
  
      await registrerHandel(data);
      await portfolioModel.opdaterSidsteHandelsDato(data.porteføljeID); // Ny model-funktion
  
      res.redirect(`/portefolje/${data.porteføljeID}`);
    } catch (err) {
      console.error("Fejl under handel:", err.message);
      res.status(400).send("Noget gik galt: " + err.message);
    }
  }
  

  async function visVærdipapirDetaljer(req, res) {
    const værdipapirID = parseInt(req.params.id, 10);
    if (isNaN(værdipapirID)) {
    return res.status(400).send("Ugyldigt værdipapir-ID");
    }
    
    try {
    const værdipapir = await portfolioModel.hentVærdipapirMedID(værdipapirID);
    if (!værdipapir) {
    return res.status(404).send("Værdipapir ikke fundet.");
    }
    
    const symbol = værdipapir.tickerSymbol;
    
    // 🔄 Hent aktuel pris fra Alpha Vantage API
    const prisLink = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${process.env.API_KEY}`;
    const prisSvar = await fetch(prisLink);
    const prisData = await prisSvar.json();
    const aktuelPris = parseFloat(prisData["Global Quote"]?.["05. price"]);
    
    // ✅ Beregn og opdater urealiseret gevinst/tab
    const antal = parseFloat(værdipapir.antal);
    const GAK = parseFloat(værdipapir.GAK);
    
    if (!isNaN(aktuelPris) && !isNaN(GAK) && !isNaN(antal)) {
    const gevinst = (aktuelPris - GAK) * antal;
    
    // Opdater i databasen
    const db = await sql.connect(sqlConfig);
    await db.request()
    .input("gevinst", sql.Decimal(18, 2), gevinst)
    .input("id", sql.Int, værdipapirID)
    .query(`
    UPDATE dbo.værdipapir
    SET urealiseretPorteføljeGevinstTab = @gevinst
    WHERE værdipapirID = @id
    `);
    
    // Også opdatér objektet inden visning
    værdipapir.urealiseretPorteføljeGevinstTab = gevinst;
    }
    
    res.render("valueInfo", { værdipapir });
    
    } catch (err) {
    console.error(err);
    res.status(500).send("Fejl ved visning af værdipapir.");
    }
    }

module.exports = {
  visPortefoljeOversigt,
  visEnPortefolje,
  visOpretPortefoljeFormular,
  opretPortefolje,
  hentTransaktionerForPortefølje,
  søgEfterPapir,
  visBuyPapirForm,
  købEllerSælg,
  visVærdipapirDetaljer
};
