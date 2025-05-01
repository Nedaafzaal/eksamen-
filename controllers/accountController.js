const accountModel = require("../models/accountModel");

// Vis alle konti i en oversigt
exports.visAlleKonti = async (req, res) => {
  try {
    const konti = await accountModel.hentAlleKonti();
    res.render("kontiOversigt", { konti });
  } catch (err) {
    console.error("Fejl ved hentning af konti:", err);
    res.status(500).send("Noget gik galt");
  }
};

// Vis én konto og dens transaktioner
exports.visEnKonto = async (req, res) => {
  const kontoID = req.params.id;
  const konto = await accountModel.hentKontoMedID(kontoID);
  if (!konto) {
    return res.status(404).send("Konto med ID " + kontoID + " blev ikke fundet.");
  }

  const transaktioner = await accountModel.hentTransaktionerForKonto(kontoID);
  res.render("konti", { konto, transaktioner });
};



// Vis siden hvor man kan indsætte penge
exports.visIndsætFormular = async (req, res) => {
  const kontoID = req.params.id;

  try {
    const konto = await accountModel.hentKontoMedID(kontoID);
    res.render("insertValue", { konto });
  } catch (err) {
    console.error("Fejl ved visning af indsæt-side:", err);
    res.status(500).send("Kunne ikke finde kontoen");
  }
};

// Når brugeren indsætter penge
exports.indsætVærdi = async (req, res) => {
  const { beløb, valuta, kontoID } = req.body;

  try {
    await accountModel.opdaterSaldo(kontoID, +beløb); // Lægger til saldo
    await accountModel.gemTransaktion({
      type: "Indsæt",
      beløb,
      kontoID,
      valuta
    });

    res.redirect(`/konto/${kontoID}`);
  } catch (err) {
    console.error("Fejl ved indsættelse:", err);
    res.status(500).send("Kunne ikke indsætte penge");
  }
};

// Vis siden hvor man kan hæve penge
exports.visHævFormular = async (req, res) => {
  const kontoID = req.params.id;

  try {
    const konto = await accountModel.hentKontoMedID(kontoID);
    res.render("withdrawValue", { konto });
  } catch (err) {
    console.error("Fejl ved visning af hæv-side:", err);
    res.status(500).send("Kunne ikke finde kontoen");
  }
};

// Når brugeren hæver penge
exports.hævVærdi = async (req, res) => {
  const { beløb, valuta, kontoID } = req.body;

  try {
    await accountModel.opdaterSaldo(kontoID, -beløb); // Trækker fra saldo
    await accountModel.gemTransaktion({
      type: "Hæv",
      beløb,
      kontoID,
      valuta
    });

    res.redirect(`/konto/${kontoID}`);
  } catch (err) {
    console.error("Fejl ved hævning:", err);
    res.status(500).send("Kunne ikke hæve penge");
  }
};

// Vis siden hvor man kan oprette en konto
exports.visOpretFormular = (req, res) => {
  res.render("opretKonto");
};

// Når brugeren opretter en ny konto
exports.opretKonto = async (req, res) => {
    try {
      const nyKontoID = await accountModel.opretNyKonto(req.body);
      //console.log("Ny konto ID:", nyKontoID);
  
      if (!nyKontoID || isNaN(nyKontoID)) {
        throw new Error("Konto blev ikke oprettet korrekt");
      }
  
      res.redirect(`/konto/${nyKontoID}`);
    } catch (err) {
      console.error("Fejl ved oprettelse af konto:", err);
      res.status(500).send("Kunne ikke oprette konto");
    }
  };
  

exports.lukKonto = async (req, res) => {
    const kontoID = req.params.id;
    try {
      await accountModel.sætAktivStatus(kontoID, false);
      res.redirect(`/konto/${kontoID}`);
    } catch (err) {
      console.error("Fejl ved lukning:", err);
      res.status(500).send("Kunne ikke lukke konto");
    }
  };
  
  exports.åbnKonto = async (req, res) => {
    const kontoID = req.params.id;
    try {
      await accountModel.sætAktivStatus(kontoID, true);
      res.redirect(`/konto/${kontoID}`);
    } catch (err) {
      console.error("Fejl ved åbning:", err);
      res.status(500).send("Kunne ikke åbne konto");
    }
  };

  // Viser siden med brugerens indstillinger
exports.visIndstillinger = (req, res) => {
    // Her kan du sende evt. brugernavn og tom alert
    res.render("indstillinger.ejs", {
      brugernavn: "", // eller fx req.session.brugernavn, hvis du bruger sessions
      alert: null
    });
  };
  