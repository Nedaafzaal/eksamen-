//importerer model så metoderne kan benyttes 
const accountModel = require("../models/accountModel"); 

//funktion som viser alle konti for brugeren
async function visAlleKonti(req, res) {
    try {
      const brugerID = parseInt(req.cookies.brugerID); //henter brugerID med cookies fra brugerens browser 
      if (!brugerID) {  
        return res.status(401).send("Bruger er ikke logget ind");
      }

      const konti = await accountModel.hentAlleKontiForBruger(brugerID);
      res.render("kontiOversigt", { konti }); //videresender konti objekt og dermed alle dens egenskaber videre til visning, kontiOversigt.ejs.
  
    } catch (err) {
      console.error("Fejl ved at hente konti", err);
      res.status(500).send("Noget gik galt");
    }
  }
  

//funktion som viser en konto og dens tilhørende transaktioner
async function visEnKonto(req, res) {
  const kontoID = parseInt(req.params.id); //tager konto id'et fra url (ruten), som sendes ved forespørgslen, og laver den om fra string til heltal

  const konto = await accountModel.hentKontoMedID(kontoID);
  if (!konto) {
    return res.status(404).send("Konto med ID: " + kontoID + " blev ikke fundet desværre");
  }
  const transaktioner = await accountModel.hentTransaktionerForKonto(kontoID); 
  res.render("konti", { konto, transaktioner });  //videresender til visning
}


//funktion som viser formular for når bruger ønsker at indsætte penge 
async function visIndsætFormular(req, res) {
  const kontoID = parseInt(req.params.id); 

  //beder program om at prøve at hente konto med ID og sende konto videre
  try { 
    const konto = await accountModel.hentKontoMedID(kontoID);
    res.render("insertValue", { konto }); 

    //hvis ikke konto kan hentes
  } catch (err) { 
    console.error("Fejl ved visning af indsæt-formular", err); 
    res.status(500).send("Konto kunne desværre ikke findes");

  }
}


//funktionen hvor selve indsættelsen af penge foregår
async function indsætVærdi(req, res) {

    //henter kontoID, beløb og valuta fra formularens indsendte body-data
    const kontoID = parseInt(req.body.kontoID);
    const beløb = parseFloat(req.body.beløb);
    const valuta = req.body.valuta;
  
    try {
      const konto = await accountModel.hentKontoMedID(kontoID);
      if (!konto || isNaN(kontoID)) {
        return res.status(400).send("Konto blev desværre ikke fundet");
      }
      
      //hvis konto er deaktiv
      if (!konto.aktiv) {
        return res.status(400).send("Kontoen er lukket");
      }
  
      //hvis konto findes og ID er et tal, opdateres saldo
      await accountModel.opdaterSaldo(kontoID, beløb);
  

      //transaktionen gemmes som typen "indsæt" og med tilhørende egenskaber
      await accountModel.gemTransaktion({
        type: "indsæt",
        kontoID,
        valuta,
        beløb
      });
  
      res.redirect(`/konto/${kontoID}`); //bruger omdirigeres til sin konto side

    } catch (err) {
      console.error("Fejl under indsætning", err);
      res.status(500).send("Kunne ikke indsætte penge desværre");
    }
  }
  
  
//funktion som henter hæv-formular
async function visHævFormular(req, res) {
  const kontoID = parseInt(req.params.id);

  try { 
    const konto = await accountModel.hentKontoMedID(kontoID);
    res.render("withdrawValue", { konto });
  } catch (err) {
    console.error("Fejl ved hæv: ", err);
    res.status(500).send("Kunne ikke finde eksisterende konto");
  }
}


//funktion hvor penge hæves fra konto
async function hævVærdi(req, res) {
    const kontoID = parseInt(req.body.kontoID);
    const beløb = parseFloat(req.body.beløb);
    const valuta = req.body.valuta;
  
    try {
      const konto = await accountModel.hentKontoMedID(kontoID);
  
      if (!konto || isNaN(kontoID)) {
        return res.status(400).send("Noget gik galt");
      }
  
      if (!konto.aktiv) {
        return res.status(400).send("Konto er lukket og der kan dermed ikke hæves en værdi");
      }
      
      await accountModel.opdaterSaldo(kontoID, -beløb); //da der er tale om hæv og der dermed reduceres penge på konto, vil det være minus beløb 
      
      //transaktionen gemmes som typen "hæv" og med tilhørende egenskaber
      await accountModel.gemTransaktion({
        type: "hæv",
        beløb,
        kontoID,
        valuta
      });
      
      res.redirect(`/konto/${kontoID}`); //omdirigerer brugeren til den konto, de har hævet på
    } catch (err) {
        console.log("err ved hæv: ", err);
      res.status(500).send("Kunne ikke hæve penge");
    }
  }
  

//funktion til formular af opret konto
async function visOpretFormular(req, res) {
    try {
      const brugerID = req.cookies.brugerID;
  
      if (!brugerID) {
        return res.status(401).send("Bruger er ikke logget ind");
      }
  
      res.render("opretKonto"); 

    } catch (err) {
      console.error("Fejl ved visning af opret konto-formular", err);
      res.status(500).send("Noget gik galt");
    }

  }

  
//funktion hvor oprettelsen foregår
async function opretKonto(req, res) {
    try {
      const brugerID = req.cookies.brugerID; 
  
      if (!brugerID) { 
        return res.status(401).send("Bruger kan ikke findes i systemet");
      }
      
      //opretter kontoen og gemmer det automatisk generede kontoID
      const nyKontoID = await accountModel.opretNyKonto(req.body, brugerID); 

     if (!nyKontoID || isNaN(nyKontoID)) { 
     throw new Error("Konto blev ikke oprettet");
    }   
    res.redirect(`/konto/${nyKontoID}`); //hvis konto oprettes, sendes brugeren til sin konto side for den nyoprettede konto
    } catch (err) {
      console.error("kontooprettelse:", err);
      res.status(500).send("Kunne ikke oprette konto");
    }
  }
  

//funktion til at lukke konto
async function lukKonto(req, res) {
  const kontoID = req.params.id; 

  try {
    await accountModel.sætAktivStatus(kontoID, false); //venter på status på aktiv bliver sat til false
    res.redirect(`/konto/${kontoID}`); //omdirigerer til den givne konto baseret på kontoID
  } catch (err) {
    console.error("Fejl ved lukning af konto:", err);
    res.status(500).send("Kunne ikke lukke konto");
  }
}


//funktion til at åbne konto
async function åbnKonto(req, res) {
  const kontoID = req.params.id;
  try {
    await accountModel.sætAktivStatus(kontoID, true); //venter på status på aktiv bliver sat til true
    res.redirect(`/konto/${kontoID}`); 
  } catch (err) {
    console.error("fejl ved åbning af konto:", err);
    res.status(500).send("Kunne ikke åbne konto");
  }
}


//funktion som henter indstillinger for bruger uden allerede fyldt brugernavn og uden alert/besked
function visIndstillinger(req, res) {
    res.render("indstillinger", { brugernavn: "", alert: null }); 
  }


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
