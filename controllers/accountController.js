//importerer model så der er kommunikation til databasen
const accountModel = require("../models/accountModel"); 

//funktion som viser konti for brugeren
async function visAlleKonti(req, res) {
    try {
      const brugerID = parseInt(req.cookies.brugerID);
      if (!brugerID) {
        return res.status(401).send("Bruger ikke logget ind.");
      }
  
      const konti = await accountModel.hentAlleKontiForBruger(brugerID);
      res.render("kontiOversigt", { konti }); //videresender konti obejkt og dermed alle dens egenskaber videre til frontend, kontiOversigt.ejs.
  
    } catch (err) {
      //console.error("Fejl ved hent af konti:", err);
      res.status(500).send("Noget gik galt");
    }
  }
  

//funktion som viser en konto og dens tilhørende transaktioner
async function visEnKonto(req, res) {
  const kontoID = parseInt(req.params.id, 10); //tager konto id'et fra url (ruten), som sendes ved forespørgslen, og laver den om fra string til heltal. 

  const konto = await accountModel.hentKontoMedID(kontoID); //henter konto med funktionen fra accountmodel, ved at tage fat i det kontoID der gives i url
  if (!konto) {
    return res.status(404).send("Konto med ID: " + kontoID + " blev ikke fundet.");
  }

  const transaktioner = await accountModel.hentTransaktionerForKonto(kontoID); //finder transaktion for den bestemte konto med funktion fra accountmodel.
  res.render("konti", { konto, transaktioner }); //sender konto og transaktions obejkt - fx navn, saldo, type, dato osv. - videre til konti.ejs.
}

//funktion som viser formular for når bruger ønsker at indsætte penge. 
async function visIndsætFormular(req, res) {
  const kontoID = parseInt(req.params.id, 10); 

  //beder program om at prøve at køre følgende kode
  try { 
    const konto = await accountModel.hentKontoMedID(kontoID);
    res.render("insertValue", { konto }); 

    //hvis ikke konto kan hentes:
  } catch (err) { 
    //console.error("Fejl ved visning af indsæt-side:", err); //således vi kunne se fejlen
    res.status(500).send("Konto kunne ikke findes");
  }
}

//funktionen hvor selve indsættelsen af penge sker
async function indsætVærdi(req, res) {
    const kontoID = parseInt(req.body.kontoID); // sletter 10
    //console.log(kontoID)
    const beløb = parseFloat(req.body.beløb);
    const valuta = req.body.valuta;
  
    try {
      const konto = await accountModel.hentKontoMedID(kontoID);
      if (!konto || isNaN(kontoID)) {
        return res.status(400).send("Konto blev ikke fundet.");
      }
      
      //hvis konto er deaktiv
      if (!konto.aktiv) {
        return res.status(400).send("Kontoen er lukket.");
      }
  
      //ellers opdateres saldo
      await accountModel.opdaterSaldo(kontoID, beløb);
  

      //transaktion gemmes 
      await accountModel.gemTransaktion({
        type: "indsæt",
        kontoID,
        valuta,
        beløb
      });
  
      res.redirect(`/konto/${kontoID}`);

    } catch (err) {
      console.error("Fejl under indsæt:", err);
      res.status(500).send("Kunne ikke indsætte penge");
    }
  }
  
  
//funktion som henter hæv formular
async function visHævFormular(req, res) {
  const kontoID = parseInt(req.params.id, 10);
  try { 
    const konto = await accountModel.hentKontoMedID(kontoID);
    res.render("withdrawValue", { konto });
  } catch (err) {
    //console.error(err);
    res.status(500).send("Kunne ikke finde kontoen");
  }
}

//funktion hvor bruger kan hæve 
async function hævVærdi(req, res) {
    const kontoID = parseInt(req.body.kontoID);
    const beløb = parseFloat(req.body.beløb);
    const valuta = req.body.valuta;
  
    try {
      const konto = await accountModel.hentKontoMedID(kontoID);
  
      if (!konto || isNaN(kontoID)) {
        return res.status(400).send("Noget gik galt");
      }
  
      if (konto.aktiv === false) {
        return res.status(400).send("Konto er lukket og der kan dermed ikke hæves værdi");
      }
      
      //da der er tale om hæv og der dermed reduceres penge på konto, vil det være minus beløb. 
      await accountModel.opdaterSaldo(kontoID, -beløb);
      
      //transaktionen gemmes som typen hæv
      await accountModel.gemTransaktion({
        type: "hæv",
        beløb,
        kontoID,
        valuta
      });
      
      //når bruger har hævet, skal de omdirigeres til den konto, hvorpå de har hævet. 
      res.redirect(`/konto/${kontoID}`);
    } catch (err) {
      res.status(500).send("Kunne ikke hæve penge");
    }
  }
  


//funktion til formular af opret konto
async function visOpretFormular(req, res) {
    try {
      const brugerID = req.cookies.brugerID;
  
      if (!brugerID) {
        return res.status(401).send("Bruger ikke logget ind.");
      }
  
      res.render("opretKonto"); 

    } catch (err) {
      console.error("Fejl ved visning af opret konto-formular:", err);
      res.status(500).send("Noget gik galt");
    }

  }
  
  
  
//funktion hvor oprettelsen foregår
async function opretKonto(req, res) {
    try {
      const brugerID = req.cookies.brugerID; 
  
      if (!brugerID) { 
        return res.status(401).send("Bruger kan ikke findes");
      }
      
      //opretter/genere et nyt kontoID når ny konto oprettes
      const nyKontoID = await accountModel.opretNyKonto(req.body, brugerID); 

     if (!nyKontoID || isNaN(nyKontoID)) { 
     throw new Error("Konto blev ikke oprettet korrekt");
    }   

    ////hvis konto oprettes, sendes brugeren til sin konto side for den nyoprettede konto.
    res.redirect(`/konto/${nyKontoID}`); 

    } catch (err) {
      //console.error("kontooprettelse:", err);
      res.status(500).send("Kunne ikke oprette konto");
    }
  }
  

//når brugeren vil deaktivere/lukke sin konto
async function lukKonto(req, res) {
  const kontoID = req.params.id; 
  
  try {
    await accountModel.sætAktivStatus(kontoID, false); //venter på status bliver sat til false som betyder lukket.
    res.redirect(`/konto/${kontoID}`); //omdirigerer til den givne konto baseret på kontoID
  } catch (err) {
    //console.error("Fejl lukning:", err);
    res.status(500).send("Kunne ikke lukke konto");
  }
}

//når brugeren vil åbne sin konto igen 
async function åbnKonto(req, res) {
  const kontoID = req.params.id;
  try {
    await accountModel.sætAktivStatus(kontoID, true); //venter på status bliver sat til true som betyder kontoen er åben igen
    res.redirect(`/konto/${kontoID}`); //omdirigerer til den givne konto baseret på kontoID
  } catch (err) {
    //console.error("fejl ved åbning:", err);
    res.status(500).send("Kunne ikke åbne konto");
  }
}

//viser siden med brugerens indstillinger
function visIndstillinger(req, res) {
    res.render("indstillinger", { brugernavn: "", alert: null }); //sender to objekter til indstillinger.ejs: brugernavn som er et tom string til senere login-navn og alert til at sende meddelse om at adgangskode er opdateret (sættes til null da den ikke skal alert endnu)
  }
  

//Eksporter alle funktioner så de kan bruges i routes og dermed vises for brugeren. 
module.exports = {
  visAlleKonti,
  visEnKonto,
  visIndsætFormular,
  indsætVærdi,
  visHævFormular,
  hævVærdi,
  visOpretFormular,
  opretKonto,
  lukKonto,
  åbnKonto,
  visIndstillinger
};
