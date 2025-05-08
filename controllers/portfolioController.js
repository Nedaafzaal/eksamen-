const portfolioModel = require("../models/portfolioModel");
const accountModel = require("../models/accountModel");


//viser alle porteføljer i en liste for den enkelte bruger
async function visPorteføljeOversigt(req, res) {
    try {
      const brugerID = parseInt(req.cookies.brugerID);//finder brugerID fra cookies
      if (!brugerID) {
        return res.status(401).send("Bruger ikke logget ind.");
      }
  
      const porteføljer = await portfolioModel.hentAllePorteføljerForBruger(brugerID);//henter brugerens porteføljer
  
      for (const p of porteføljer) {
        const papirer = await portfolioModel.hentVærdipapirerTilPortefølje(p.porteføljeID); //henter tilhørende værdipapirer for hver portefølje 
        p.totalValue = papirer.reduce((sum, papir) => sum + (papir.pris * papir.antal), 0);//udregner porteføljens samlede værdi
      }
  
      const totalVærdi = porteføljer.reduce((sum, p) => sum + (p.totalValue || 0), 0); //totalværdi på tværs af alle porteføljer 
      res.render("portefoljeOversigt", { porteføljer, totalVærdi }); //sender data til view
    } catch (err) {
      console.error("Fejl ved hentning af porteføljer:", err); //logger fejl
      res.status(500).send("Noget gik galt ved visning af porteføljeoversigten."); //sender fejlsvar
    }
  }
  
  
//viser en bestemt portefølje og dens aktier
async function visEtPortefølje(req, res) {
  const porteføljeID = parseInt(req.params.id); //læser porteføljeID fra URL og konventere til heltal 
  if (isNaN(porteføljeID)) {
    return res.status(400).send("Ugyldigt portefølje-ID");
  }
  try {
    const portefølje = await portfolioModel.hentPorteføljeMedID(porteføljeID); //henter porteføljens oplsyninger fra databasen 
    if (!portefølje) {
      return res.status(404).send("Portefølje ikke fundet.");
    }
    const værdipapirer = await portfolioModel.hentVærdipapirerTilPortefølje(porteføljeID); //henter værdipapir relateret til portefølje 
    const historik = await portfolioModel.hentVærdiHistorik(porteføljeID); //henter historik værdi over tid fra porteføljen
    let samletVærdi = 0; //samlet værdi til 0
    for (let i = 0; i < værdipapirer.length; i++) { //loop der løber gennem alle værdipapirer 
      samletVærdi += værdipapirer[i].antal * værdipapirer[i].pris; //lægger værdien af hvert værdipapir til samlet værdi
    }
    res.render("portefolje", { portefølje, værdipapirer, samletVærdi,historik }); //sender data til view så det kan vises
  } catch (err) {
    console.error("Fejl ved visning af portefølje:", err);
    res.status(500).send("Noget gik galt ved visning af portefølje.");
  }
}

//viser formularen til at oprette ny portefølje
async function visOpretPorteføljeFormular(req, res) {
    const brugerID = parseInt(req.cookies.brugerID); //henter brugerid fra cookies
  
    try {
      const konti = await portfolioModel.hentKontiForBruger(brugerID); //henter alle konti fra den pågældende bruger 
      res.render("opretportefolje", { konti }); //sender konti til visning så brugeren kan vælge konto i formularen
    } catch (err) {
      console.error("Fejl ved hentning af konti:", err);
      res.status(500).send("Kunne ikke hente konti");
    }
  }

//håndtere oprettelsen af en ny portefølje når formularen indsendes 
  async function opretPortefølje(req, res) {
    const { navn, kontoID, forventetVærdi } = req.body; //udtrækker data fra formularen som brugeren har udfyldt 
    const brugerID = req.cookies.brugerID; //henter id fra cookies 
  
    if (!brugerID) { //hvis brugerid ikke findes sendes statuskode
      return res.status(401).send("Bruger ikke logget ind.");
    }
  
    try {
      await portfolioModel.opretNyPortefølje({ //kalder på modellen og opretter en ny portefølje i databasen
        navn,
        kontoID: parseInt(kontoID),
        forventetVærdi: parseFloat(forventetVærdi),
        brugerID: parseInt(brugerID)
      });
  
      res.redirect("/portefolje/oversigt"); //når porteføljen er oprettet sendes brugeren tilbage til porteføljeoversigt 
    } catch (err) {
      console.error("Fejl ved oprettelse af portefølje:", err);
      res.status(500).send("Kunne ikke oprette portefølje.");
    }
  }
  

//viser køb/salg transaktioner for en portefølje
async function hentTransaktionerForPortefølje(req, res) {
    const porteføljeID = parseInt(req.params.id); //henter id fra URL 
    if (isNaN(porteføljeID)) { 
      return res.status(400).send("Ugyldigt portefølje-ID");
    }
  
    try {
      const transaktioner = await portfolioModel.hentTransaktionerForPortefølje(porteføljeID); //henter alle køb/salg for den givne portefølje 
      const portefølje = await portfolioModel.hentPorteføljeMedID(porteføljeID); //henter basisoplysninger om porteføljen for 
      res.render("handelshistorik", { transaktioner, portefølje }); //sender transaktioner og portefølje til view så det kan vises 
    } catch (err) {
      console.error("Fejl ved hentning af handelshistorik:", err);
      res.status(500).send("Kunne ikke hente handelshistorik.");
    }
  }


//søger efter værdipapir med API og viser søgeresultat
async function søgEfterPapir(req, res) {
  const søgning = req.query.query; //henter søgeteksten indtastet af brugeren fra URL query og gemmer den i variablen søgning
  const porteføljeID = req.params.id; //henter id fra URL
  if (!søgning) {
      return res.status(400).send("Skriv venligst noget du vil søge efter.");
    }

    try {
        const søgeLink = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${søgning}&apikey=${process.env.API_KEY}`; //bygger url til alphavantageapi for at søge værdipapir
        const svar = await fetch(søgeLink); //sender HTTP-anmodning til API
        const data = await svar.json(); //gør svaret til json
 
    const fundet = data.bestMatches?.[0]; //første fundet resultat fra søgningen gennes i fundet
    if (!fundet) {
      return res.send("Ingen værdipapir fundet.");
    }
    const symbol = fundet["1. symbol"]; //udtrækker symbol 
    const navn = fundet["2. name"]; //udtrækker navn

    const prisLink = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${process.env.API_KEY}`; //bygegr url til at hente pris fra api
    const prisSvar = await fetch(prisLink); //henter pris fra aktuel symbol 
    const prisData = await prisSvar.json(); //gør svaret til json
    const pris = prisData["Global Quote"]?.["05. price"] || "Ukendt"; //forsøg at hente aktuel pris på værdipapiret fra API svaret og hvis den ikke findes, brug 'Ukendt' som standardværdi, 0.5 er en json nøgle

    const brugerID = req.cookies.brugerID; 
    const konti = await portfolioModel.hentKontiForBruger(brugerID); //henter brugeren konti fra databasen 
    const kontoID = konti?.[0]?.kontoID || null; //tager det første kontiID og null hvis ingen findes

    res.render("searchPapir", { //render resultatet i et view så relevant data vises
      result: { symbol, navn, pris },
      porteføljeID,
      kontoID
    });
  } catch (fejl) {
    console.error(fejl);
    res.status(500).send("Noget gik galt under søgningen.");
  }
}


//viser formular til at købe værdipapir
async function visBuyPapirForm(req, res) {
    const porteføljeID = parseInt(req.params.id); //henter ID fra URL
    const symbol = req.query.symbol; //henter symbol fra søgning query
    const navn = req.query.navn; //henter navn fra søgning query
    const pris = req.query.pris; //henter pris fra søgning query
  
    if (!symbol || !navn || !pris) { //tjekker om alle nødvendige oplysninger er til stede
      return res.status(400).send("Mangler nødvendige oplysninger i URL.");
    }
  
    try {
      const portefølje = await portfolioModel.hentPorteføljeMedID(porteføljeID); //henter portefølje fra databasen 
      if (!portefølje) {
        return res.status(404).send("Portefølje ikke fundet.");
      }

      const konto = await accountModel.hentKontoMedID(portefølje.kontoID); //henter kontoen der er tilknyttet til porteføljen 
      if(!konto){
        return res.status(404).send("Tilknyttet konto findes ikke");
      }
  
      res.render("buyPapir", { //sender data til view så det kan vises i formualren
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
  

//håndtere køb og salg af værdipapirer baseret på data fra formular
async function købEllerSælg(req, res) {
    try {
     //udtrækker og formaterer inputdata fra formularen i request-body
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

      const konto = await accountModel.hentKontoMedID(data.kontoID); //henter kontoen fra databasen og ser om den er aktiv
        if (!konto || konto.aktiv===false) { //hvis kontoen ikke findes eller er lukket 
        return res.status(403).send("Handel er ikke mulig. Kontoen er lukket.");
        }
  
    //udfører selve handlen via modellen 
      await portfolioModel.registrerHandel(data);
  
      //opdaterer sidste handelsdato for porteføljen
      await portfolioModel.opdaterSidsteHandelsDato(data.porteføljeID);
  
      //sender brugeren tilbage til den aktuelle portefølje efter handlen er udført
      res.redirect(`/portefolje/${data.porteføljeID}`);
    } catch (err) {
      console.error("Fejl under køb/salg:", err.message);
      res.status(400).send("Fejl under handel: " + err.message);
    }
  }
  

//viser detaljer for et værdipapir
async function visVærdipapirDetaljer(req, res) {
    const værdipapirID = parseInt(req.params.id); //henter ID fra url 
    if (isNaN(værdipapirID)) {
      return res.status(400).send("Ugyldigt værdipapir-ID");
    }
    try {
      //henter og opdaterer værdipapir det via model
      const værdipapir = await portfolioModel.hentOgOpdaterVærdipapirMedAktuelVærdi(værdipapirID);
  
      if (!værdipapir) {
        return res.status(404).send("Værdipapir ikke fundet.");
      }
  //henter histroik for værdipapirets tdiligere udvikling 
  const historik = await portfolioModel.hentHistorikForVærdipapir(værdipapirID);

      res.render("valueInfo", { værdipapir, historik }); //sender værdipapir og historik til view så det kan vises 
    } catch (err) {
      console.error(err);
      res.status(500).send("Fejl ved visning af værdipapir.");
    }
  }
  

//viser formularen til at sælge et bestemt værdipapir
  async function sælgPapirForm(req, res) {
    const værdipapirID = parseInt(req.params.id); //henter  id fra url 
  
    const værdipapir = await portfolioModel.hentVærdipapirMedID(værdipapirID); //henter værdipapiret baseret på id fra databasen 
  
    if (!værdipapir) {
      return res.status(404).send("Værdipapir ikke fundet.");
    }
  
    const porteføljeID = værdipapir.porteføljeID; //henter tilknyttede porteføljeId for værdipapiret 
  
    // Hent den portefølje værdipapiret tilhører
    const portefølje = await portfolioModel.hentPorteføljeMedID(porteføljeID);
    if (!portefølje) {
      return res.status(404).send("Portefølje ikke fundet.");
    }
  
    
    const konto = await accountModel.hentKontoMedID(portefølje.kontoID); //henter kontoen der er tilknyttet porteføljen 
    if (!konto) {
      return res.status(404).send("Konto ikke fundet.");
    }
  
    res.render("sellPapirForm", { //sender alle nødvendige oplysninger så det kan vises i formularen 
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