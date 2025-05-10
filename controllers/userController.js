//importerer model
const brugerData = require("../models/userModel");

//funktion til at vise login side
function visLoginSide(req, res) {
  res.render("login", { fejl: null }); //fejl sættes til null til at starte med
}


//funktion der sikrer bruger logger ind med rigtig brugernavn og adgangskode
async function login(req, res) {
  const brugernavn = req.body.brugernavn;
  const adgangskode = req.body.adgangskode;

  //henter bruger fra databasen ud fra det brugernavn, der logges ind med
  const bruger = await brugerData.hentBruger(brugernavn);

  if (!bruger) {
    return res.render("login", { fejl: "Forkert brugernavn, prøv venligst igen" });
  }

  //hvis adgangskoden passer til den eksisterende brugers adgangskode, gemmes brugerens ID i en cookie, således bruger kan forblive logget ind
  if (adgangskode === bruger.adgangskode) {
    res.cookie("brugerID", bruger.brugerID, { httpOnly: true });
    return res.redirect("/dashboard");
  } else {
    return res.render("login", { fejl: "Forkert adgangskode, prøv venligst igen" }); //hvis ikke adgangskode passer, sendes fejl meddelelse
  }
}


//funktion som henter siden til opret bruger side
function visOpretBrugerSide(req, res) {
  res.render("opretbruger"); 
}


//funktion der opretter bruger
async function opretBruger(req, res) {
  try {
    await brugerData.opretBruger(req.body); // gemmer det brugeren skrev i databasen
    res.redirect("/dashboard"); //omdirigerer brugeren videre til dashboard 
  } catch (err) {
    console.error("Noget gik galt", err); 
    res.status(500).send("Der skete en fejl, prøv igen senere");
  }
}


//viser indstillinger-siden
function visIndstillinger(req, res) {
  res.render("indstillinger", {
    brugernavn: "", //tom til at starte med
    alert: null
  });
}

//funktion til ændring af adgangskode
async function skiftAdgangskode(req, res) {
  const brugernavn = req.body.adgangskode;
  const gammelAdgangskode = req.body.gammelAdgangskode;
  const nyAdgangskode = req.body.nyAdgangskode;

  const adgangskodeKorrekt = await brugerData.tjekAdgangskode(brugernavn, gammelAdgangskode);

  if (!adgangskodeKorrekt) { //hvis gammel adgangskode ikke stemmer overens med databasen, sendes alert
    return res.render("indstillinger", {
      alert: "Forkert adgangskode",
      brugernavn: brugernavn,
    });
  }
  try {
    //forsøger at opdatere den nye adgangskode i databasen
    await brugerData.opdaterAdgangskode(brugernavn, nyAdgangskode); 
    res.render("indstillinger", {
      alert: "Adgangskode opdateret!",
      brugernavn: brugernavn,
    });

  } catch (err) { 
    //ellers sendes en fejlmeddelse
    console.error("Fejl", err);
    res.status(500).send("Noget gik galt med opdatering af kode, prøv igen");
  }
}

module.exports = {
  visLoginSide,
  login,
  visOpretBrugerSide,
  opretBruger,
  visIndstillinger,
  skiftAdgangskode
};
