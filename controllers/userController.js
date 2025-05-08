// Importer model, der håndterer brugerdata fra databasen
const brugerData = require("../models/userModel");

//funktion, der viser login-siden, funktionen håndterer GET-anmodninger for login-siden
function visLoginSide(req, res) {
  res.render("login", { fejl: null }); // sætter fejl til null i starten
}

//funktion, der håndterer login-processen og håndterer POST-anmodningen for login, når brugeren forsøger at logge ind
async function login(req, res) {
  const { brugernavn, adgangskode } = req.body; //henter brugernavn og adgangskode fra formularen
  const bruger = await brugerData.hentBruger(brugernavn); //henter brugeren fra databasen

  //tjekker om brugernavnet findes
  if (!bruger) {
    return res.render("login", { fejl: "Forkert brugernavn" }); //hvis brugeren ikke findes, vis fejlmeddelelse
  }

  //tjekker om adgangskoden matcher med den indtastede
  if (adgangskode === bruger.adgangskode) { //hvis login lykkes, sættes der en cookie med brugerens ID, så det gemmes i den enkelte browser
    res.cookie("brugerID", bruger.brugerID, { httpOnly: true });//cookie bruges til at holde brugeren logget ind
    return res.redirect("/dashboard");//efter login, sendes brugeren til dashboard
  } else {
   
    return res.render("login", { fejl: "Forkert adgangskode" });//hvis adgangskoden er forkert, vis fejlmeddelelse
  }
}

//funktion til at vise oprettelsesformularen for en ny bruger
function visOpretBrugerSide(req, res) {
  res.render("opretbruger");//render opretbruger-siden 
}

//funktion til at oprette en ny bruger
//når brugeren udfylder formularen, bliver denne funktion kaldt for at gemme brugerdata
async function opretBruger(req, res) {
  try {
    await brugerData.opretBruger(req.body);//gemmer brugerens data i databasen
    res.redirect("/dashboard");//hvis oprettelsen lykkedes bliver brugeren videresendt til dashboardet.
  } catch (err) {
    console.error("Noget gik galt:", err);
    res.status(500).send("Der skete en fejl, prøv igen senere");
  }
}

//funktion til at skifte adgangskode
async function skiftAdgangskode(req, res) {
  const { brugernavn, gammelAdgangskode, nyAdgangskode } = req.body; //henter gamle og nye adgangskoder fra formularen

  //tjekker om den gamle adgangskode er korrekt
  const adgangskodePasser = await brugerData.tjekAdgangskode(brugernavn, gammelAdgangskode);

  
  if (!adgangskodePasser) {// his den gamle kode ikke passer, vises fejlmeddelelse
    return res.render("indstillinger", {
      alert: "Forkert adgangskode", 
      brugernavn: brugernavn, //beholder brugernavnet for at forhindre, at brugeren skal skrive det igen
    });
  }

  try {
   
    await brugerData.opdaterAdgangskode(brugernavn, nyAdgangskode); //opdaterer adgangskoden i databasen
    
    res.render("indstillinger", {
      alert: "Adgangskode opdateret!", //bekræftelse af, at koden er ændret og viser en alert besked
      brugernavn: brugernavn,
    });
  } catch (err) {
    console.error("Fejl:", err); 
    res.status(500).send("Noget gik galt med opdatering af kode"); //fejlmeddelelse, hvis der opstår problemer med opdateringen
  }
}

//funktion, der viser indstillings-siden, hvor brugeren kan ændre sine oplysninger
function visIndstillinger(req, res) {
  res.render("indstillinger", {
    brugernavn: "", //tomt til at starte med, vil blive udfyldt, når brugeren navigerer til siden
    alert: null //ingen advarsler ved indlæsning
  });
}

module.exports = {
  visLoginSide,
  login,
  visOpretBrugerSide,
  opretBruger,
  skiftAdgangskode,
  visIndstillinger
};
