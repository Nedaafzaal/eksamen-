const brugerData = require("../models/userModel");

function visLoginSide(req, res) {
  res.render("login", { fejl: null }); //fejl er tom i starten
}

//funktionaliteteer når bruger forsøger at logge ind
async function login(req, res) {
  const { brugernavn, adgangskode } = req.body;
  const bruger = await brugerData.hentBruger(brugernavn);

  if (!bruger) {
    return res.render("login", { fejl: "Forkert brugernavn" });
  }

  if (adgangskode === bruger.adgangskode) {
    
    res.cookie("brugerID", bruger.brugerID, { httpOnly: true });//cookie der sørger for at gemme brugerID
    return res.redirect("/dashboard");
  } else {
    return res.render("login", { fejl: "Forkert adgangskode" });
  }
}
//sørger for at visualisere opret bruger side 
function visOpretBrugerSide(req, res) {
  res.render("opretbruger"); 
}

//hvad der sker når brugeren indtaster oplysninger og forsøger at oprette bruger
async function opretBruger(req, res) {
  try {
    await brugerData.opretBruger(req.body); // gemmer det brugeren skrev i databasen
    res.redirect("/dashboard"); //omdirigerer brugeren videre til dashboard 
  } catch (err) {
    console.error("Noget gik galt:", err); //fejlmeddelse hvis oprettelsen ikke går igennem
    res.status(500).send("Der skete en fejl, prøv igen senere");
  }
}

//når brugeren vil skifte adgangskode
async function skiftAdgangskode(req, res) {
  const { brugernavn, gammelAdgangskode, nyAdgangskode } = req.body;

  const adgangskodePasser = await brugerData.tjekAdgangskode(brugernavn, gammelAdgangskode);

  if (!adgangskodePasser) { //tjekker om den gamle kode var forkert
    return res.render("indstillinger", {
      alert: "Forkert adgangskode",
      brugernavn: brugernavn,
    });
  }

  try {
    await brugerData.opdaterAdgangskode(brugernavn, nyAdgangskode); //forsøger at ændre adgangskode til tilhørende brugerog giver en alert besked, hvis ændringen sker 
    res.render("indstillinger", {
      alert: "Adgangskode opdateret!",
      brugernavn: brugernavn,
    });

  } catch (err) { //ellers sendes en fejlmeddelse
    console.error("Fejl:", err);
    res.status(500).send("Noget gik galt med opdatering af kode");
  }
}

//viser indstillinger-siden
function visIndstillinger(req, res) {
  res.render("indstillinger", {
    brugernavn: "", //tom til at starte med
    alert: null
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
