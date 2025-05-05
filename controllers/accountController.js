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

// Viser en konto og de tilhørende transaktioner
async function visEnKonto(req, res) {
  const kontoID = parseInt(req.params.id, 10);

  const konto = await accountModel.hentKontoMedID(kontoID);
  if (!konto) {
    return res.status(404).send("Konto med ID " + kontoID + " blev ikke fundet.");
  }

  const transaktioner = await accountModel.hentTransaktionerForKonto(kontoID);
  res.render("konti", { konto, transaktioner });
}

// Viser siden hvor man kan indsætte penge
async function visIndsætFormular(req, res) {
  const kontoID = parseInt(req.params.id, 10);
  try {
    const konto = await accountModel.hentKontoMedID(kontoID);
    res.render("insertValue", { konto });
  } catch (err) {
    console.error("Fejl ved visning af indsæt-side:", err);
    res.status(500).send("Kunne ikke finde kontoen");
  }
}

// Brugeren kan indsætte penge
async function indsætVærdi(req, res) {
  const kontoID = parseInt(req.body.kontoID, 10);
  const beløb = parseFloat(req.body.beløb);
  const valuta = req.body.valuta;

  try {
    const konto = await accountModel.hentKontoMedID(kontoID);
    const porteføljeID = konto.porteføljeID;

    if (!konto || isNaN(kontoID) || isNaN(porteføljeID)) {
      return res.status(400).send("Ugyldige data");
    }

    await accountModel.opdaterSaldo(kontoID, beløb);
    await accountModel.gemTransaktion({
      type: "Indsæt",
      porteføljeID,
      beløb,
      kontoID,
      valuta
    });

    res.redirect(`/konto/${kontoID}`);
  } catch (err) {
    console.error("Fejl ved indsættelse:", err);
    res.status(500).send("Kunne ikke indsætte penge");
  }
}

// Viser siden hvor man kan hæve penge
async function visHævFormular(req, res) {
  const kontoID = parseInt(req.params.id, 10);
  try {
    const konto = await accountModel.hentKontoMedID(kontoID);
    res.render("withdrawValue", { konto });
  } catch (err) {
    console.error("Fejl ved visning af hæv-side:", err);
    res.status(500).send("Kunne ikke finde kontoen");
  }
}

// Brugeren vil hæve penge
async function hævVærdi(req, res) {
  const kontoID = parseInt(req.body.kontoID, 10);
  const beløb = parseFloat(req.body.beløb);
  const valuta = req.body.valuta;

  try {
    const konto = await accountModel.hentKontoMedID(kontoID);
    const porteføljeID = konto.porteføljeID;

    if (!konto || isNaN(kontoID) || isNaN(porteføljeID)) {
      return res.status(400).send("Ugyldige data");
    }

    await accountModel.opdaterSaldo(kontoID, -beløb);
    await accountModel.gemTransaktion({
      type: "Hæv",
      porteføljeID,
      beløb,
      kontoID,
      valuta
    });

    res.redirect(`/konto/${kontoID}`);
  } catch (err) {
    console.error("Fejl ved hævning:", err);
    res.status(500).send("Kunne ikke hæve penge");
  }
}


//viser siden hvor man kan oprette en konto
async function visOpretFormular(req, res) {
    const brugerID = req.cookies.brugerID;
  
    try {
      const db = await sql.connect(sqlConfig);
      const result = await db.request()
        .input("brugerID", sql.Int, brugerID)
        .query(`SELECT porteføljeID FROM dbo.porteføljer WHERE brugerID = @brugerID`);
  
      const porteføljeID = result.recordset[0]?.porteføljeID;
  
      if (!porteføljeID) {
        return res.status(404).send("Ingen portefølje fundet for denne bruger.");
      }
  
      res.render("opretKonto", { porteføljeID });
    } catch (err) {
      console.error("Fejl ved hentning af porteføljeID:", err);
      res.status(500).send("Noget gik galt");
    }
  }
  

//når brugeren opretter en ny konto
async function opretKonto(req, res) {
    try {
      const brugerID = req.cookies.brugerID; // eller hvor du gemmer brugerID

      console.log("brugerID fra session:", req.cookies.brugerID);

  
      if (!brugerID) {
        return res.status(401).send("Bruger ikke logget ind");
      }
  
      const nyKontoID = await accountModel.opretNyKonto(req.body, brugerID);

        if (!nyKontoID || isNaN(nyKontoID)) {
        throw new Error("Konto blev ikke oprettet korrekt");
}

  
      res.redirect(`/konto/${nyKontoID}`);
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
