const accountModel = require("../models/accountModel"); //importerer account model hvor der er funktioner der bruges til at arbejde med konto data

//Viser en oversigt over alle konti
async function visAlleKonti(req, res) {
  try {
    const konti = await accountModel.hentAlleKonti(); //henter alle konti fra vores database
    res.render("kontiOversigt", { konti }); //sender konti til vores kontiOversigt.ejs så det vises i browseren 
  } catch (err) {
    console.error("Fejl ved hentning af konti:", err); //logger fejl i terminalen 
    res.status(500).send("Noget gik galt"); //sender statuskode 500
  }
}

//viser en konto og de tilhørende transaktioner
async function visEnKonto(req, res) {
  const kontoID = req.params.id; //henter brugerens kontiID fra URL

  const konto = await accountModel.hentKontoMedID(kontoID); //henter kontoen med det specifikke ID
  if (!konto) {
    return res.status(404).send("Konto med ID " + kontoID + " blev ikke fundet."); //hvis kontoen ikke findes sendes status 404
  }

  const transaktioner = await accountModel.hentTransaktionerForKonto(kontoID); //henter alle transaktioner for den givne konto
  res.render("konti", { konto, transaktioner }); //viser kontisiden med transaktioner og konto
}

//viser siden hvor man kan indsætte penge
async function visIndsætFormular(req, res) {
  const kontoID = req.params.id; 
  try {
    const konto = await accountModel.hentKontoMedID(kontoID); 
    res.render("insertValue", { konto }); //viser indsæt værdi siden med info om den givne konto
  } catch (err) {
    console.error("Fejl ved visning af indsæt-side:", err); 
    res.status(500).send("Kunne ikke finde kontoen"); //status kode til klient
  }
}

//brugeren kan indsætte penge
async function indsætVærdi(req, res) {
  const { beløb, valuta, kontoID } = req.body; //trækker værdi ud af formularen 
  try {
    await accountModel.opdaterSaldo(kontoID, +beløb); //lægger beløbet til kontoens saldo
    await accountModel.gemTransaktion({
      type: "Indsæt",
      beløb,
      kontoID,
      valuta
    }); //gemmer transaktionen i vores database

    res.redirect(`/konto/${kontoID}`); //omdirigerer til kontoens side
  } catch (err) {
    console.error("Fejl ved indsættelse:", err);
    res.status(500).send("Kunne ikke indsætte penge"); 
  }
}

//viser siden hvor man kan hæve penge 
async function visHævFormular(req, res) {
  const kontoID = req.params.id;
  try {
    const konto = await accountModel.hentKontoMedID(kontoID);
    res.render("withdrawValue", { konto }); //viser hæv værdi siden med den givne kontos oplysninger
  } catch (err) {
    console.error("Fejl ved visning af hæv-side:", err);
    res.status(500).send("Kunne ikke finde kontoen");
  }
}

//når brugeren vil hæve penge 
async function hævVærdi(req, res) {
  const { beløb, valuta, kontoID } = req.body; //trækker info fra formular ud
  try {
    await accountModel.opdaterSaldo(kontoID, -beløb); //trækker beløbet fra saldoen
    await accountModel.gemTransaktion({
      type: "Hæv",
      beløb,
      kontoID,
      valuta
    }); //gemmer hævningen i databasen 

    res.redirect(`/konto/${kontoID}`); //omdirigerer til kontoens side 
  } catch (err) {
    console.error("Fejl ved hævning:", err);
    res.status(500).send("Kunne ikke hæve penge");
  }
}

//viser siden hvor man kan oprette en konto
function visOpretFormular(req, res) { //viser formularen fra opret konto 
  res.render("opretKonto");
}

//når brugeren opretter en ny konto
async function opretKonto(req, res) {
  try {
    const nyKontoID = await accountModel.opretNyKonto(req.body); //opretter en ny konto baseret på det der er indtastet i formularen

    if (!nyKontoID || isNaN(nyKontoID)) { //hvis kontoen ikke har et validt kontoID eller det ikke er et tal kastes en fejl
      throw new Error("Konto blev ikke oprettet korrekt"); 
    }

    res.redirect(`/konto/${nyKontoID}`); //går til den nye konto
  } catch (err) {
    console.error("Fejl ved oprettelse af konto:", err);
    res.status(500).send("Kunne ikke oprette konto");
  }
}

//når brugeren vil deaktivere sin konto
async function lukKonto(req, res) {
  const kontoID = req.params.id; 
  try {
    await accountModel.sætAktivStatus(kontoID, false); //venter på status bliver sat til false som betyder lukket eller inaktiv
    res.redirect(`/konto/${kontoID}`); //omdirigerer til den givne konto baseret på kontoID
  } catch (err) {
    console.error("Fejl ved lukning:", err);
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
    console.error("Fejl ved åbning:", err);
    res.status(500).send("Kunne ikke åbne konto");
  }
}

//viser siden med brugerens indstillinger
function visIndstillinger(req, res) {
  res.render("indstillinger.ejs", {
    brugernavn: "", 
    alert: null
  });
}

//Eksporter alle funktioner 
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
