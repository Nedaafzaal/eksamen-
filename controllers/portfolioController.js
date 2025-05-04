const portfolioModel = require("../models/portfolioModel");
const { registrerHandel } = require("../models/portfolioModel");


// Viser alle porteføljer i en liste
exports.visPortefoljeOversigt = async (req, res) => {
  try {
    const portefoljer = await portfolioModel.hentAllePortefoljer(); 

// Hent alle værdipapirer for alle porteføljer og læg deres værdier sammen
let totalVærdi = 0;

for (const p of portefoljer) {
  const papirer = await portfolioModel.hentVærdipapirerTilPortefølje(p.porteføljeID);
  const samlet = papirer.reduce((sum, papir) => sum + (papir.pris * papir.antal), 0);
  totalVærdi += samlet;
}
   
    
    res.render("portefoljeOversigt", { portefoljer, totalVærdi});
  } catch (err) {
    console.error("Fejl ved hentning af porteføljer:", err);
    res.status(500).send("Noget gik galt ved visning af porteføljeoversigten.");
  }
};


// Viser én bestemt portefølje og dens aktier
exports.visEnPortefolje = async (req, res) => {
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

    let samletVærdi = 0;
    for (let i = 0; i < værdipapirer.length; i++) {
      samletVærdi += værdipapirer[i].antal * værdipapirer[i].pris;
    }

    for (let i = 0; i < værdipapirer.length; i++) {
      const symbol = værdipapirer[i].tickerSymbol;
      værdipapirer[i].GAK = await portfolioModel.hentGAK(portefoljeID, symbol);
    }
    
    res.render("portefolje", { portefolje, værdipapirer, samletVærdi });

  } catch (err) {
    console.error("Fejl ved visning af portefølje:", err);
    res.status(500).send("Noget gik galt ved visning af portefølje.");
  }
};

// Viser formularen til at oprette ny portefølje
exports.visOpretPortefoljeFormular = (req, res) => {
  res.render("opretPortefolje");
};

// Når brugeren sender formularen og vil oprette ny portefølje
exports.opretPortefolje = async (req, res) => {
  const { navn, kontotilknytning, forventetVærdi } = req.body;

  try {
    await portfolioModel.opretNyPortefolje({
      navn,
      kontotilknytning,
      forventetVærdi
    });

    res.redirect("/portefolje/oversigt");
  } catch (err) {
    console.error("Fejl ved oprettelse af portefølje:", err);
    res.status(500).send("Kunne ikke oprette portefølje.");
  }
};

// Viser køb/salg transaktioner for en portefølje
exports.hentTransaktionerForPortefølje = async (req, res) => {
    const porteføljeID = parseInt(req.params.id, 10);
  
    if (isNaN(porteføljeID)) {
      return res.status(400).send("Ugyldigt portefølje-ID");
    }
  
    try {
      const transaktioner = await portfolioModel.hentTransaktionerForPortefølje(porteføljeID);
      res.render("handelshistorik", { transaktioner, porteføljeID });
    } catch (err) {
      console.error("Fejl ved hentning af handelshistorik:", err);
      res.status(500).send("Kunne ikke hente handelshistorik.");
    }
  };
  
  
  exports.søgEfterPapir = async (req, res) => {
    const søgning = req.query.query; // Det brugeren skriver i søgefeltet
    const porteføljeID = req.params.id; // ID på den portefølje vi søger til
  
    // Hvis brugeren ikke har skrevet noget
    if (!søgning) {
      return res.status(400).send("Skriv venligst noget du vil søge efter.");
    }
  
    try {
      // Først: Søg efter værdipapiret (navn og symbol)
      const søgeLink = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${søgning}&apikey=${process.env.API_KEY}`;
      const svar = await fetch(søgeLink); // Send forespørgslen
      const data = await svar.json(); // Lav om til JSON
      const fundet = data.bestMatches?.[0]; // Tag det første match
  
      // Hvis intet blev fundet
      if (!fundet) {
        return res.send("Ingen værdipapir fundet.");
      }
  
      // Hent symbol og navn fra det fundne papir
      const symbol = fundet["1. symbol"];
      const navn = fundet["2. name"];
  
      // Så: Hent prisen for det papir
      const prisLink = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${process.env.API_KEY}`;
      const prisSvar = await fetch(prisLink);
      const prisData = await prisSvar.json();
      const pris = prisData["Global Quote"]?.["05. price"] || "Ukendt";

      const brugerID = req.cookies.brugerID;

      const konti = await portfolioModel.hentKontiForBruger(brugerID);
      
      const kontoID = konti?.[0]?.kontoID || null;

  
      // Send information videre til en EJS-side
      res.render("searchPapir", {
        result: { symbol, navn, pris },
        porteføljeID,
        kontoID
      });
  
    } catch (fejl) {
      console.error(fejl);
      res.status(500).send("Noget gik galt under søgningen.");
    }
  };
  
  //funktion som henter køb formular
  exports.visBuyPapirForm = async (req, res) => {
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
  };
  
  exports.købEllerSælg = async (req, res) => {
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
      res.redirect(`/portefolje/${data.porteføljeID}`);
    } catch (err) {
      console.error("Fejl under handel:", err.message);
      res.status(400).send("Noget gik galt: " + err.message);
    }
  };
  
  exports.visVærdipapirDetaljer = async (req, res) => {
    const værdipapirID = parseInt(req.params.id, 10);
    
    console.log("param:", req.params.værdipapirID);

    if (isNaN(værdipapirID)) {
      return res.status(400).send("Ugyldigt værdipapir-ID");
    }
  
    try {
      const værdipapir = await portfolioModel.hentVærdipapirMedID(værdipapirID);
      if (!værdipapir) {
        return res.status(404).send("Værdipapir ikke fundet.");
      }
  
      res.render("valueInfo", { værdipapir }); 
    } catch (err) {
      console.error(err);
      res.status(500).send("Fejl ved visning af værdipapir.");
    }
  };
  
  
  
  






 
  
  
  