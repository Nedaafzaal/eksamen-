const portfolioModel = require("../models/portfolioModel");
const accountModel = require("../models/accountModel");


// Viser alle porteføljer i en liste
async function visPorteføljeOversigt(req, res) {
    try {
      const brugerID = parseInt(req.cookies.brugerID); // HENT BRUGER ID
      if (!brugerID) {
        return res.status(401).send("Bruger ikke logget ind.");
      }
  
      const porteføljer = await portfolioModel.hentAllePorteføljerForBruger(brugerID); // SEND MED
  
      for (const p of porteføljer) {
        const papirer = await portfolioModel.hentVærdipapirTilPortefølje(p.porteføljeID);
        p.totalValue = papirer.reduce((sum, papir) => sum + (papir.pris * papir.antal), 0);
      }
  
      const totalVærdi = porteføljer.reduce((sum, p) => sum + (p.totalValue || 0), 0);
      res.render("portefoljeOversigt", { porteføljer, totalVærdi });
    } catch (err) {
      console.error("Fejl ved hentning af porteføljer:", err);
      res.status(500).send("Noget gik galt ved visning af porteføljeoversigten.");
    }
  }
  
  
// Viser én bestemt portefølje og dens aktier
async function visEtPortefølje(req, res) {
  const porteføljeID = parseInt(req.params.id, 10);
  if (isNaN(porteføljeID)) {
    return res.status(400).send("Ugyldigt portefølje-ID");
  }
  try {
    const portefølje = await portfolioModel.hentPorteføljeMedID(porteføljeID);
    if (!portefølje) {
      return res.status(404).send("Portefølje ikke fundet.");
    }
    const værdipapirer = await portfolioModel.hentVærdipapirTilPortefølje(porteføljeID);
    const historik = await portfolioModel.hentVærdiHistorik(porteføljeID);
    let samletVærdi = 0;
    for (let i = 0; i < værdipapirer.length; i++) {
      samletVærdi += værdipapirer[i].antal * værdipapirer[i].pris;
    }
    res.render("portefolje", { portefølje, værdipapirer, samletVærdi,historik });
  } catch (err) {
    console.error("Fejl ved visning af portefølje:", err);
    res.status(500).send("Noget gik galt ved visning af portefølje.");
  }
}

// Viser formularen til at oprette ny portefølje
async function visOpretPorteføljeFormular(req, res) {
    const brugerID = parseInt(req.cookies.brugerID);
  
    try {
      const konti = await portfolioModel.hentKontiForBruger(brugerID);
      res.render("opretportefolje", { konti });
    } catch (err) {
      console.error("Fejl ved hentning af konti:", err);
      res.status(500).send("Kunne ikke hente konti");
    }
  }

  async function opretPortefølje(req, res) {
    const { navn, kontoID, forventetVærdi } = req.body;
    const brugerID = req.cookies.brugerID;
  
    if (!brugerID) {
      return res.status(401).send("Bruger ikke logget ind.");
    }
  
    try {
      await portfolioModel.opretNyPortefølje({
        navn,
        kontoID: parseInt(kontoID),
        forventetVærdi: parseFloat(forventetVærdi),
        brugerID: parseInt(brugerID)
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
      const portefølje = await portfolioModel.hentPorteføljeMedID(porteføljeID); // <- her bruger du din eksisterende funktion
  
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
        //console.log("Alpha Vantage response:", data);
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
    const porteføljeID = parseInt(req.params.id, 10);
    const symbol = req.query.symbol;
    const navn = req.query.navn;
    const pris = req.query.pris;
  
    if (!symbol || !navn || !pris) {
      return res.status(400).send("Mangler nødvendige oplysninger i URL.");
    }
  
    try {
      const portefølje = await portfolioModel.hentPorteføljeMedID(porteføljeID);
      if (!portefølje) {
        return res.status(404).send("Portefølje ikke fundet.");
      }

      const konto = await accountModel.hentKontoMedID(portefølje.kontoID);
      if(!konto){
        return res.status(404).send("Tilknyttet konto findes ikke");
      }
  
      res.render("buyPapir", {
        tickerSymbol: symbol,
        navn,
        pris,
        porteføljeID,
        konto,
        transaktionstype: "køb",
        værditype: "Aktie",
        gebyr: 0,
        tidspunkt: new Date().toISOString()
      });
  
    } catch (err) {
      console.error("Fejl i visBuyPapirForm:", err);
      res.status(500).send("Noget gik galt ved visning af køb-formular.");
    }
  }
  


async function købEllerSælg(req, res) {
    try {
      const data = {
        porteføljeID: parseInt(req.body.porteføljeID),
        kontoID: parseInt(req.body.kontoID),
        type: req.body.transaktionstype, // "køb" eller "sælg"
        pris: parseFloat(req.body.pris),
        gebyr: parseFloat(req.body.gebyr) || 0,
        antal: parseInt(req.body.antal),
        tickerSymbol: req.body.tickerSymbol,
        værditype: req.body.værditype,
        navn: req.body.navn
      };

      const konto = await accountModel.hentKontoMedID(data.kontoID);
        if (!konto || konto.aktiv===false) {
        return res.status(403).send("Handel er ikke mulig. Kontoen er lukket.");
        }
  
      await portfolioModel.registrerHandel(data);
  
      // Opdater sidste handelsdato
      await portfolioModel.opdaterSidsteHandelsDato(data.porteføljeID);
  
      // Redirect brugeren tilbage til porteføljen
      res.redirect(`/portefolje/${data.porteføljeID}`);
    } catch (err) {
      console.error("Fejl under køb/salg:", err.message);
      res.status(400).send("Fejl under handel: " + err.message);
    }
  }
  

// Viser detaljer for et værdipapir
async function visVærdipapirDetaljer(req, res) {
    const værdipapirID = parseInt(req.params.id, 10);
    if (isNaN(værdipapirID)) {
      return res.status(400).send("Ugyldigt værdipapir-ID");
    }
  
    try {
      // Henter og opdaterer urealiseret gevinst/tab via model
      const værdipapir = await portfolioModel.hentOgOpdaterVærdipapirMedAktuelVærdi(værdipapirID);
      console.log("📦 Forventet værdi:", værdipapir);

  
      if (!værdipapir) {
        return res.status(404).send("Værdipapir ikke fundet.");
      }
  // henter histroik for værdipapir
  const historik = await portfolioModel.hentHistorikForVærdipapir(værdipapirID);
      res.render("valueInfo", { værdipapir, historik });
    } catch (err) {
      console.error(err);
      res.status(500).send("Fejl ved visning af værdipapir.");
    }
  }
  

  async function sælgPapirForm(req, res) {
    const værdipapirID = parseInt(req.params.id, 10);
  
    const værdipapir = await portfolioModel.hentVærdipapirMedID(værdipapirID);   
  
    if (!værdipapir) {
      return res.status(404).send("Værdipapir ikke fundet.");
    }
  
    const porteføljeID = værdipapir.porteføljeID;
  
    // Hent den portefølje værdipapiret tilhører
    const portefølje = await portfolioModel.hentPorteføljeMedID(porteføljeID);
    if (!portefølje) {
      return res.status(404).send("Portefølje ikke fundet.");
    }
  
    // Hent kontoen knyttet til porteføljen
    const konto = await accountModel.hentKontoMedID(portefølje.kontoID);
    if (!konto) {
      return res.status(404).send("Konto ikke fundet.");
    }
  
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
      tidspunkt: new Date().toISOString()
    });
  }
  
  

module.exports = {
  visPorteføljeOversigt,
  visEtPortefølje,
  visOpretPorteføljeFormular,
  opretPortefølje,
  hentTransaktionerForPortefølje,
  søgEfterPapir,
  visBuyPapirForm,
  købEllerSælg,
  visVærdipapirDetaljer,
  sælgPapirForm
};

