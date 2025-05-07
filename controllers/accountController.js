const accountModel = require("../models/accountModel"); //importerer account model hvor der er funktioner der bruges til at arbejde med konto data

//funktion som viser en oversigt over alle konti
async function visAlleKonti(req, res) {
  try {
    const konti = await accountModel.hentAlleKonti(); //kalder på en funktion fra accountmodel, som henter alle konti fra vores database
    res.render("kontiOversigt", { konti }); //sender kontiobjekt til vores kontiOversigt.ejs så det vises i browseren 
  } catch (err) {
    //console.error("Fejl ved hentning af konti:", err); //til eget brug så  
    res.status(500).send("Noget gik galt");
  }
}


//funktion som viser en konto og de tilhørende transaktioner
async function visEnKonto(req, res) {
  const kontoID = parseInt(req.params.id, 10); //tager kontoID fra url (ruten), som sendes ved forespørgslen, og laver den om fra string til heltal

  const konto = await accountModel.hentKontoMedID(kontoID); //henter konto med funktionen fra accountmodel, ved at tage fat i det kontoID der gives i url
  if (!konto) {
    return res.status(404).send("Konto med ID " + kontoID + " blev ikke fundet.");
  }
  const transaktioner = await accountModel.hentTransaktionerForKonto(kontoID); //finder transaktion for den bestemte konto med funktion fra accountmodel.
  res.render("konti", { konto, transaktioner }); //sender konto og transaktions obejkt videre til konti.ejs
}


//funktion som viser en formular når man ønsker at indsætte penge
async function visIndsætFormular(req, res) {
  const kontoID = parseInt(req.params.id, 10); //tager fat i kontoID fra URL, omformer fra string til heltal
  try { 
    const konto = await accountModel.hentKontoMedID(kontoID);
    res.render("insertValue", { konto }); //viser siden insertValue og sender konto data med til visning
  } catch (err) { 
    //console.error("Fejl ved visning af indsæt-side:", err); //således vi kunne se fejlen
    res.status(500).send("Konto kunne ikke findes");
  }
}


//funktion hvor penge sættes ind på konto
async function indsætVærdi(req, res) { 
  const kontoID = parseInt(req.body.kontoID, 10);//tager fat i kontoID ud fra formularen som sendes (hidden input, POST rute), laver om fra string til helttal
  const beløb = parseFloat(req.body.beløb); //henter beløb fra formularen og konventerer til kommatal
  const valuta = req.body.valuta;

  try { 
    const konto = await accountModel.hentKontoMedID(kontoID);
    const porteføljeID = konto.porteføljeID; //udtrækker porteføljeID fra den hentede konti så det kan bruges videre i funktionaliteten 

    if (!konto || isNaN(kontoID) || isNaN(porteføljeID)) { //hvis konto ikke eksisterer eller hvis kontoID ikke er et tal eller hvis porteføljeID ikke er et tal, sendes følgende statuskode med fejl meddelse 
      return res.status(400).send("Noget gik galt");
    }

    if(konto.aktiv === false){ //hvis konto ikke er aktiv, sendes følgende
        return res.status(400).send("Konto er lukket og der kan dermed ikke indsættes værdi")
    }

    await accountModel.opdaterSaldo(kontoID, beløb); //når penge er indsat på konto, skal saldo opdateres bestemt med kontoID 
    await accountModel.gemTransaktion({ //transaktion skal gemmes efter indsættelse med følgende attributter: 
      type: "Indsæt", 
      porteføljeID, 
      beløb, 
      kontoID,
      valuta
    });

    res.redirect(`/konto/${kontoID}`); //efter penge er indsat på konto, skal brugeres dirigeres til den opdaterede konto.ejs
  } catch (err) { 
    //console.error("Indsæt værdi", err); //til eget brug
    res.status(500).send("Kunne ikke indsætte penge");
  }
}


//funktion som viser hæv-formular
async function visHævFormular(req, res) {
  const kontoID = parseInt(req.params.id, 10); //henter kontoID fra url og konventerer det til heltal 
  try { 
    const konto = await accountModel.hentKontoMedID(kontoID); //henter kontoens data fra databasen baseret på kontoID
    res.render("withdrawValue", { konto }); //viser withdrawValue og sender kontoens data med til visning
  } catch (err) {
    //console.error(err);
    res.status(500).send("Kunne ikke finde kontoen");
  }
}


//funktion som hæver værdi
async function hævVærdi(req, res) {
  const kontoID = parseInt(req.body.kontoID, 10);
  const beløb = parseFloat(req.body.beløb);
  const valuta = req.body.valuta;

  try {
    const konto = await accountModel.hentKontoMedID(kontoID);
    const porteføljeID = konto.porteføljeID; //udtrækker porteføljeID fra den hentede konti så det kan bruges videre i funktionaliteten 

    if (!konto || isNaN(kontoID) || isNaN(porteføljeID)) { //hvis konto ikke eksisterer eller hvis kontoID ikke er et tal eller hvis porteføljeID ikke er et tal, sendes følgende statuskode med fejl meddelse 
      return res.status(400).send("Noget gik galt");
    }

    if(konto.aktiv===false){ //hvis konto ikke er aktiv sendes denne status kode
        return res.status(400).send("Konto er lukket og der kan dermed ikke hæves værdi")
    }

    await accountModel.opdaterSaldo(kontoID, -beløb); //kalder funktion som opdaterer saldo ved at trække beløbet fra saldoen på det valgte kontoID
    await accountModel.gemTransaktion({ //funktion der gemmer transaktionen
      type: "Hæv", 
      porteføljeID,
      beløb,
      kontoID,
      valuta
    });

    res.redirect(`/konto/${kontoID}`);
  } catch (err) {
    //console.error("Hævningfejl:", err);
    res.status(500).send("Kunne ikke hæve penge");
  }
}


//funktion for formular til at oprette ny konto
async function visOpretFormular(req, res) {
    const brugerID = req.cookies.brugerID; //bruger cookies til at hente brugerID, som tidligere er gemt i browser efter første gangs login
  
    try { 
      const porteføljeID = await accountModel.hentPorteføljeIDForBruger(brugerID); //forsøger at hente porteføljeID for den bestemte bruger via brugerID
  
      if (!porteføljeID) { 
        return res.status(404).send("Ingen portefølje fundet for denne bruger.");
      }
  
      res.render("opretKonto", { porteføljeID });//sender porteføljeID-objekt videre til opretKonto.ejs til visning
    } catch (err) {
      //console.error("porteføljeID:", err);
      res.status(500).send("Noget gik galt");
    }
  }
  

//når brugeren opretter en ny konto
async function opretKonto(req, res) {
    try {
      const brugerID = req.cookies.brugerID; 

      if (!brugerID) { //hvis brugerID ikke eksisterer sendes status kode nedenfor
        return res.status(401).send("Bruger kan ikke findes");
      }
  
      const nyKontoID = await accountModel.opretNyKonto(req.body, brugerID); //opretter en ny konto i databasen med data fra formularen og brugerensID

     if (!nyKontoID || isNaN(nyKontoID)) { //hvis ikke der oprettes nyt kontoID eller hvis det ikke er et tal, sendes en fejl
     throw new Error("Konto blev ikke oprettet korrekt");
}
      res.redirect(`/konto/${nyKontoID}`); //hvis konto oprettes, sendes brugeren til sin konto side for den nyoprettede konto
    } catch (err) {
      //console.error("kontooprettelse:", err);
      res.status(500).send("Kunne ikke oprette konto");
    }
  }
  

//når brugeren vil deaktivere sin konto
async function lukKonto(req, res) {
  const kontoID = req.params.id; //tager fat i kontoID fra URL
  try {
    await accountModel.sætAktivStatus(kontoID, false); //opdatere kontoen i databasen og sætter dens aktiv status til false
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
  

//eksporter alle funktioner så de kan bruges i routes og dermed vises for brugeren
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
