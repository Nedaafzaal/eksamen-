const brugerData = require("../models/userModel");

// Viser login-siden
function visLoginSide(req, res) {
  res.render("login", { fejl: null }); // fejl er tom i starten
}

// Når brugeren prøver at logge ind
async function login(req, res) {
  const { brugernavn, adgangskode } = req.body;
  const bruger = await brugerData.hentBruger(brugernavn);

  if (!bruger) {
    return res.render("login", { fejl: "Forkert brugernavn" });
  }

  if (adgangskode === bruger.adgangskode) {
    // ✅ Sæt cookie med brugerID (gemmes i browseren)
    res.cookie("brugerID", bruger.brugerID, { httpOnly: true });
    return res.redirect("/dashboard");
  } else {
    return res.render("login", { fejl: "Forkert adgangskode" });
  }
}

// Viser siden hvor man kan oprette en ny bruger
function visOpretBrugerSide(req, res) {
  res.render("opretbruger"); // ingen ekstra info behøves
}

// Når brugeren udfylder og sender formularen for at blive oprettet
async function opretBruger(req, res) {
  try {
    await brugerData.opretBruger(req.body); // vi gemmer det brugeren skrev i databasen
    res.redirect("/dashboard"); // send brugeren videre
  } catch (err) {
    console.error("Noget gik galt:", err);
    res.status(500).send("Der skete en fejl, prøv igen senere");
  }
}

// Når brugeren vil skifte adgangskode
async function skiftAdgangskode(req, res) {
  const { brugernavn, gammelAdgangskode, nyAdgangskode } = req.body;

  const adgangskodePasser = await brugerData.tjekAdgangskode(brugernavn, gammelAdgangskode);

  if (!adgangskodePasser) {
    // den gamle kode var forkert
    return res.render("indstillinger", {
      alert: "Forkert adgangskode",
      brugernavn: brugernavn,
    });
  }

  try {
    await brugerData.opdaterAdgangskode(brugernavn, nyAdgangskode);
    res.render("indstillinger", {
      alert: "Adgangskode opdateret!",
      brugernavn: brugernavn,
    });
  } catch (err) {
    console.error("Fejl:", err);
    res.status(500).send("Noget gik galt med opdatering af kode");
  }
}

// Viser indstillinger-siden
function visIndstillinger(req, res) {
  res.render("indstillinger", {
    brugernavn: "", // tom til at starte med
    alert: null
  });
}

// Eksporter alle funktioner samlet i bunden
module.exports = {
  visLoginSide,
  login,
  visOpretBrugerSide,
  opretBruger,
  skiftAdgangskode,
  visIndstillinger
};
