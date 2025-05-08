const accountModel = require("../models/accountModel"); //importerer account model hvor der er funktioner der bruges til at arbejde med konto data

//Funktion som viser en oversigt over alle konti
async function visAlleKonti(req, res) {
    try {
      const brugerID = parseInt(req.cookies.brugerID);
      if (!brugerID) {
        return res.status(401).send("Bruger ikke logget ind.");
      }
  
      const konti = await accountModel.hentAlleKontiForBruger(brugerID);
      res.render("kontiOversigt", { konti });
  
    } catch (err) {
      console.error("Fejl ved hentning af konti:", err);
      res.status(500).send("Noget gik galt");
    }
  }
  

//Funktion som viser en konto og de tilhørende transaktioner
async function visEnKonto(req, res) {
  const kontoID = parseInt(req.params.id, 10); //tager konto id'et fra url (ruten), som sendes ved forespørgslen, og laver den om fra string til heltal. 

  const konto = await accountModel.hentKontoMedID(kontoID); //henter konto med funktionen fra accountmodel, ved at tage fat i det kontoID der gives i url
  if (!konto) { //hvis ikke konto eksisterer, sendes statuskode 404 (siden ikek fundet) med en besked.
    return res.status(404).send("Konto med ID " + kontoID + " blev ikke fundet.");
  }

  const transaktioner = await accountModel.hentTransaktionerForKonto(kontoID); //finder transaktion for den bestemte konto med funktion fra accountmodel.
  res.render("konti", { konto, transaktioner }); //sender konto og transaktions obejkt - fx navn, saldo, type, dato osv. - videre til konti.ejs.
}

//Funktion som viser formular for når bruger ønsker at indsætte penge. 
async function visIndsætFormular(req, res) {
  const kontoID = parseInt(req.params.id, 10); //tager igen fat i kontoID fra URL, omformer fra string til heltal. 
  try { //beder program om at prøve at køre følgende kode
    const konto = await accountModel.hentKontoMedID(kontoID);
    res.render("insertValue", { konto }); //sender konto-objektet til insertValue.ejs, således vi kan tilgå dets attributter i formularen. 
  } catch (err) { //hvis ikke det over lykkedes, skal følgende ske:
    //console.error("Fejl ved visning af indsæt-side:", err); //således vi kunne se fejlen
    res.status(500).send("Konto kunne ikke findes"); //statuskode sendes til brugeren med fejlmeddelse
  }
}

//Funktionen hvor penge sættes ind på konto
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
  
      if (!konto.aktiv) {
        return res.status(400).send("Kontoen er lukket.");
      }
  
      // 1. Opdater saldo
      await accountModel.opdaterSaldo(kontoID, beløb);
  
      // 2. Gem transaktion (uden porteføljeID)
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
  
  
//Funktion som viser hæv-formular
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

//Funktion som hæver værdi
async function hævVærdi(req, res) {
    const kontoID = parseInt(req.body.kontoID, 10);
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
  
      await accountModel.opdaterSaldo(kontoID, -beløb);
  
      await accountModel.gemTransaktion({
        type: "hæv",
        beløb,
        kontoID,
        valuta
      });
  
      res.redirect(`/konto/${kontoID}`);
    } catch (err) {
      res.status(500).send("Kunne ikke hæve penge");
    }
  }
  


//Funktion for formular til at oprette ny konto
async function visOpretFormular(req, res) {
    try {
      const brugerID = req.cookies.brugerID; // Hent brugerens ID fra cookies
  
      if (!brugerID) {
        return res.status(401).send("Bruger ikke logget ind.");
      }
  
      res.render("opretKonto"); // Ingen porteføljeID sendes, da konto er uafhængig
    } catch (err) {
      console.error("Fejl ved visning af opret konto-formular:", err);
      res.status(500).send("Noget gik galt");
    }
  }
  
  
  

//når brugeren opretter en ny konto
async function opretKonto(req, res) {
    try {
      const brugerID = req.cookies.brugerID; 

      //console.log("brugerID er:", req.cookies.brugerID);

  
      if (!brugerID) { //hvis ikke brugerId eksisterer
        return res.status(401).send("Bruger kan ikke findes");
      }
  
      const nyKontoID = await accountModel.opretNyKonto(req.body, brugerID); //den oprettede konto får et kontoID

     if (!nyKontoID || isNaN(nyKontoID)) { //hvis ikke der oprettes nyt kontoID eller hvis det ikke er et tal, sendes:
     throw new Error("Konto blev ikke oprettet korrekt");
}
      res.redirect(`/konto/${nyKontoID}`); //hvis konto oprettes, sendes brugeren til sin konto side for den nyoprettede konto.
    } catch (err) {
      //console.error("kontooprettelse:", err);
      res.status(500).send("Kunne ikke oprette konto");
    }
  }
  

//når brugeren vil deaktivere sin konto
async function lukKonto(req, res) {
  const kontoID = req.params.id; //tager fat i kontoID fra URL
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
