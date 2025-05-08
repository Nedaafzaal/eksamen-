const accountModel = require("../models/accountModel"); //importerer account model hvor der er funktioner der bruges til at arbejde med konto- og transaktionsdata

//funktion som viser en oversigt over alle konti
async function visAlleKonti(req, res) {
    try {
<<<<<<< Updated upstream
      const brugerID = parseInt(req.cookies.brugerID); //henter brugerens ID fra cookies og konveterer det til heltal
      if (!brugerID) {
        return res.status(401).send("Bruger ikke logget ind.");//hvis ingen brugerID findes sendes en fejlmeddelelse
      }
  
      const konti = await accountModel.hentAlleKontiForBruger(brugerID); //henter alle konti for den pågældende bruger. 
      res.render("kontiOversigt", { konti }); //sørger for at konti bliver vist vha. kontoOversigt.ejs
  
    } catch (err) {
      console.error("Fejl ved hentning af konti:", err);
      res.status(500).send("Noget gik galt"); //fejl ved hentning
=======
      const brugerID = parseInt(req.cookies.brugerID);
      if (!brugerID) {
        return res.status(401).send("Bruger ikke logget ind.");
      }
  
      const konti = await accountModel.hentAlleKontiForBruger(brugerID);
      res.render("kontiOversigt", { konti });
  
    } catch (err) {
      console.error("Fejl ved hentning af konti:", err);
      res.status(500).send("Noget gik galt");
>>>>>>> Stashed changes
    }
  }
  


//funktion som viser en konto og dets tilhørende transaktioner
async function visEnKonto(req, res) {
  const kontoID = parseInt(req.params.id);//tager kontoID fra url (ruten), som sendes ved forespørgslen, og laver den om fra string til heltal

  const konto = await accountModel.hentKontoMedID(kontoID);//henter konto med funktionen fra accountmodel, ved at tage fat i det kontoID der gives i url
  if (!konto) {
    return res.status(404).send("Konto med ID " + kontoID + " blev ikke fundet.");
  }
  const transaktioner = await accountModel.hentTransaktionerForKonto(kontoID); //finder transaktion for den bestemte konto med funktion fra accountmodel.
  res.render("konti", { konto, transaktioner }); //sender konto og transaktions obejkt videre til konti.ejs
}


//funktion som viser en formular når man ønsker at indsætte penge
async function visIndsætFormular(req, res) {
<<<<<<< Updated upstream
  const kontoID = parseInt(req.params.id);//tager fat i kontoID fra URL, omformer fra string til heltal
=======
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
>>>>>>> Stashed changes
  try { 
    const konto = await accountModel.hentKontoMedID(kontoID);
    res.render("insertValue", { konto });//viser siden insertValue og sender konto data med til visning
  } catch (err) { 
    //console.error("Fejl ved visning af indsæt-side:", err); //således vi kunne se fejlen
    res.status(500).send("Konto kunne ikke findes");
  }
}

//funktion behandler indsætning af værdi på en konto
async function indsætVærdi(req, res) {
    const kontoID = parseInt(req.body.kontoID); 

    const beløb = parseFloat(req.body.beløb);//konveterer beløb fra formular til kommatal
    const valuta = req.body.valuta;
  
    try {
      const konto = await accountModel.hentKontoMedID(kontoID);
      if (!konto || isNaN(kontoID)) {
        return res.status(400).send("Konto blev ikke fundet.");
      }
  
      if (!konto.aktiv) {
        return res.status(400).send("Kontoen er lukket."); //sørger for at man ikke kan indsætte en værdi på en lukket konto
      }
  
 
      await accountModel.opdaterSaldo(kontoID, beløb); //opdaterer saldo ved at lægge det nye beløb til
  
      await accountModel.gemTransaktion({ //gemmer transaktionen som 'indsæt' unden porteføljeID
        type: "indsæt",
        kontoID,
        valuta,
        beløb
      });
  
      res.redirect(`/konto/${kontoID}`); //omdirigerer brugeren til kontosiden efter værdien er indsat
    } catch (err) {
      console.error("Fejl under indsæt:", err); //sender en fejl, hvis indsættelsen ikke kunne gå igennem
      res.status(500).send("Kunne ikke indsætte penge");
    }
  }
  
  
//funktion der hæv-formular
async function visHævFormular(req, res) {
  const kontoID = parseInt(req.params.id); //henter kontoID fra url og konventerer det til heltal 
  try { 
    const konto = await accountModel.hentKontoMedID(kontoID); //henter kontoens data fra databasen baseret på kontoID
    res.render("withdrawValue", { konto }); //viser withdrawValue og sender kontoens data med til visning
  } catch (err) {
    res.status(500).send("Kunne ikke finde kontoen");
  }
}


//funktion, der behandler hævning af penge fra konto
async function hævVærdi(req, res) {
<<<<<<< Updated upstream
    const kontoID = parseInt(req.body.kontoID);
=======
    const kontoID = parseInt(req.body.kontoID, 10);
>>>>>>> Stashed changes
    const beløb = parseFloat(req.body.beløb);
    const valuta = req.body.valuta;
  
    try {
      const konto = await accountModel.hentKontoMedID(kontoID);
  
<<<<<<< Updated upstream
      if (!konto || isNaN(kontoID)) { //Hvis kontoen ikke findes eller kontoID'et ikke findes sendes der en fejlmeddelse
        return res.status(400).send("Noget gik galt");
      }
  
      if (konto.aktiv === false) { //hvis kontoen er inaktiv sendes der en fejl
        return res.status(400).send("Konto er lukket og der kan dermed ikke hæves værdi");
      }
  
      await accountModel.opdaterSaldo(kontoID, -beløb); //sørger for at saldoen bliver opdateret
  
      await accountModel.gemTransaktion({ //gemmer transaktionen som 'hæv'
=======
      if (!konto || isNaN(kontoID)) {
        return res.status(400).send("Noget gik galt");
      }
  
      if (konto.aktiv === false) {
        return res.status(400).send("Konto er lukket og der kan dermed ikke hæves værdi");
      }
  
      await accountModel.opdaterSaldo(kontoID, -beløb);
  
      await accountModel.gemTransaktion({
>>>>>>> Stashed changes
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
  


//funktion der viser formular til at oprette ny konto
async function visOpretFormular(req, res) {
<<<<<<< Updated upstream
    const brugerID = req.cookies.brugerID; //bruger cookies til at hente brugerID, som tidligere er gemt i browser efter første gangs login
  
    try { 
      const porteføljeID = await accountModel.hentPorteføljeIDForBruger(brugerID); //forsøger at hente porteføljeID for den bestemte bruger via brugerID
  
      if (!porteføljeID) { 
        return res.status(404).send("Ingen portefølje fundet for denne bruger.");
      }
  
      res.render("opretKonto", { porteføljeID });//sender porteføljeID-objekt videre til opretKonto.ejs til visning
=======
    try {
      const brugerID = req.cookies.brugerID; // Hent brugerens ID fra cookies
  
      if (!brugerID) {
        return res.status(401).send("Bruger ikke logget ind.");
      }
  
      res.render("opretKonto"); // Ingen porteføljeID sendes, da konto er uafhængig
>>>>>>> Stashed changes
    } catch (err) {
      console.error("Fejl ved visning af opret konto-formular:", err);
      res.status(500).send("Noget gik galt");
    }
  }
  
<<<<<<< Updated upstream
=======
  
  
>>>>>>> Stashed changes

//behandler oprettelsen af ny konto
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
  

//sørger for at deaktiver en konto
async function lukKonto(req, res) {
  const kontoID = req.params.id; 
  try {
    await accountModel.sætAktivStatus(kontoID, false); //sætter kontoens aktiv-status til false
    res.redirect(`/konto/${kontoID}`); //viser kontoen som lukket
  } catch (err) {
    //console.error("Fejl lukning:", err);
    res.status(500).send("Kunne ikke lukke konto");
  }
}


//genaktiverer en en tidligere lukket konto
async function åbnKonto(req, res) {
  const kontoID = req.params.id;
  try {
    await accountModel.sætAktivStatus(kontoID, true); //venter på status bliver sat til true som betyder kontoen er åben igen
    res.redirect(`/konto/${kontoID}`); 
  } catch (err) {
    //console.error("fejl ved åbning:", err);
    res.status(500).send("Kunne ikke åbne konto");
  }
}


//viser siden med brugerens indstillinger
function visIndstillinger(req, res) {
    res.render("indstillinger",
      { brugernavn: "", alert: null }); //sender to objekter til indstillinger.ejs: brugernavn som er et tom string til senere login-navn og alert til at sende meddelse om at adgangskode er opdateret (sættes til null da den ikke skal alert endnu)
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
