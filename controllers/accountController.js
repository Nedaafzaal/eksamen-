const accountModel = require("../models/accountModel"); //importerer account model hvor der er funktioner der bruges til at arbejde med konto data

//Funktion som viser en oversigt over alle konti
async function visAlleKonti(req, res) {
  try {
    const konti = await accountModel.hentAlleKonti(); //kalder på en funktion fra accountmodel, som henter alle konti fra vores database
    res.render("kontiOversigt", { konti }); //sender kontiobjekt til vores kontiOversigt.ejs så det vises i browseren 
  } catch (err) {
    console.error("Fejl ved hentning af konti:", err); //logger fejl i terminalen 
    res.status(500).send("Noget gik galt"); //sender statuskode 500
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
  const kontoID = parseInt(req.body.kontoID, 10);//tager fat i kontoID ud fra formularen som sendes (hidden input, POST rute), laver om fra string til helttal. 
  const beløb = parseFloat(req.body.beløb); 
  const valuta = req.body.valuta;

  try { //beder programmet om at prøve følgende
    const konto = await accountModel.hentKontoMedID(kontoID);
    const porteføljeID = konto.porteføljeID; //porteføljeID er FK i konto-tabellen, og tilgås derfor som attribut i konto objektet. 

    if (!konto || isNaN(kontoID) || isNaN(porteføljeID)) { //hvis konto ikke eksisterer eller hvis kontoID ikke er et tal eller hvis porteføljeID ikke er et tal, sendes følgende statuskode med fejl meddelse. 
      return res.status(400).send("Noget gik galt");
    }

    if(konto.aktiv === false){ //hvis konto ikke er aktiv, sendes følgende
        return res.status(400).send("Konto er lukket og der kan dermed ikke indsættes værdi")
    }

    await accountModel.opdaterSaldo(kontoID, beløb); //når penge er indsat på konto, skal saldo opdateres på valgt konto(med bestemt ID) med valgt beløb, via opdaterSaldo fra accountmodel.  
    await accountModel.gemTransaktion({ //transaktion skal gemmes efter indsættelse med følgende attributter:
      type: "Indsæt", //typen gemmes i databasen som indsæt
      porteføljeID, //porteføljeID skal gemmes
      beløb, 
      kontoID,
      valuta
    });

    res.redirect(`/konto/${kontoID}`); //efter penge er indsat på konto, skal brugeres dirigeres til den opdaterede konto.ejs
  } catch (err) { //hvis ikke det lykkedes, skal følgende meddelse vises
    //console.error("Indsæt værdi", err); til eget brug
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
    const porteføljeID = konto.porteføljeID;

    if (!konto || isNaN(kontoID) || isNaN(porteføljeID)) {
      return res.status(400).send("Noget gik galt");
    }

    if(konto.aktiv===false){
        return res.status(400).send("Konto er lukket og der kan dermed ikke hæves værdi")
    }

    await accountModel.opdaterSaldo(kontoID, -beløb); //kalder funktion som opdaterer beløbet på valgte konto og som trækker det valgte beløb fra saloen
    await accountModel.gemTransaktion({
      type: "Hæv", //transaktionstypen gemmes som hæv
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


//Funktion for formular til at oprette ny konto
async function visOpretFormular(req, res) {
    const brugerID = req.cookies.brugerID; //bruger cookies til at hente brugerID, som tidligere er gemt i browser efter første gangs login.
  
    try { //forsøger at hende porteføljeID for den bestemte bruger via brugerID. Dette gøres da en konto skal tilhøre et bestemt portefølje (FK).
      const porteføljeID = await accountModel.hentPorteføljeIDForBruger(brugerID);
  
      if (!porteføljeID) { //hvis porteføljeID ikke eksisterer, sendes fejl
        return res.status(404).send("Ingen portefølje fundet for denne bruger.");
      }
  
      res.render("opretKonto", { porteføljeID });//sender porteføljeID-objekt videre til opretKonto.ejs.
    } catch (err) {
      //console.error("porteføljeID:", err);
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
