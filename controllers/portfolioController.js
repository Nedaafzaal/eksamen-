//importerer moduler fra modeller for porteføljer og værdipapirer
const portefoljeData = require("../models/portfolioModel");
const { værdipapirData } = require("../models/stockModel");

//funktion til at vise alle porteføljer for brugeren
async function visPorteføljeOversigt(req, res) {
  try {
    const brugerID = parseInt(req.cookies.brugerID);

    if (!brugerID) {
      return res.status(401).send("Bruger er ikke logget ind");
    }

    const porteføljer = await portefoljeData.hentAllePorteføljerForBruger(
      brugerID
    );

    //ydre forloop som gennemgår hver portefølje og henter dens tilknyttede aktier
    for (const portefølje of porteføljer) {
      const aktier = await værdipapirData.hentVærdipapirTilPortefølje(
        portefølje.porteføljeID
      );
      let samletVærdi = 0;

      //indre forloop som gennemgår hvert aktie i porteføljens aktier og lægger værdien af hver aktie til totalen, samletVærdi
      for (const aktie of aktier) {
        samletVærdi += aktie.pris * aktie.antal;
      }

      portefølje.totalValue = samletVærdi; //gemmer samlet værdi som totalValue, som egenskab til portefølje
    }

    let totalVærdi = 0;

    //gennemgår hver portefølje og lægger deres værdi sammen
    for (const portefølje of porteføljer) {
      if (portefølje.totalValue) {
        totalVærdi += portefølje.totalValue; //lægger til hvis der findes en værdi
      } else {
        totalVærdi += 0; //lægger 0 til hvis ingen værdi findes
      }
    }

    res.render("portefoljeOversigt", { porteføljer, totalVærdi });
  } catch (err) {
    console.error("Fejl ved hentning af porteføljer", err);
    res
      .status(500)
      .send("Noget gik galt ved visning af din porteføljeoversigt");
  }
}

//funktion som henter portefølje og dens tihørende aktier
async function visEtPortefølje(req, res) {
  const porteføljeID = parseInt(req.params.id);

  if (isNaN(porteføljeID)) {
    return res.status(400).send("Ugyldigt porteføljeID");
  }

  try {
    const portefølje = await portefoljeData.hentPorteføljeMedID(porteføljeID);
    if (!portefølje) {
      return res.status(404).send("Portefølje blev ikke fundet");
    }

    const værdipapirer = await værdipapirData.hentVærdipapirTilPortefølje(
      porteføljeID
    );
    const historik = await værdipapirData.hentVærdiHistorik(porteføljeID);

    let samletVærdi = 0;

    //beregner samlet værdi for alle værdipapirer med forloop igennem alle værdipapirer
    for (let i = 0; i < værdipapirer.length; i++) {
      samletVærdi += værdipapirer[i].antal * værdipapirer[i].pris;
    }
    res.render("portefolje", {
      portefølje,
      værdipapirer,
      samletVærdi,
      historik,
    });
  } catch (err) {
    console.error("Fejl under visning af portefølje", err);
    res.status(500).send("Noget gik galt ved visning af portefølje");
  }
}

//funktion som viser formular for oprettelse af portefølje
async function visOpretPorteføljeFormular(req, res) {
  const brugerID = parseInt(req.cookies.brugerID);
  try {
    const konti = await portefoljeData.hentKontiForBruger(brugerID);
    res.render("opretportefolje", { konti });
  } catch (err) {
    console.error("Fejl ved hentning af konto", err);
    res.status(500).send("Kunne ikke hente den ønskede konto");
  }
}

//funktion hvor oprettelsen sker af portefølje
async function opretPortefølje(req, res) {
  const navn = req.body.navn;
  const kontoID = req.body.kontoID;
  const brugerID = req.cookies.brugerID;

  if (!brugerID) {
    return res.status(401).send("Bruger er ikke logget ind");
  }

  try {
    //sender det hentede navn og kontoID videre til modellen
    await portefoljeData.opretNyPortefølje({
      navn,
      kontoID: parseInt(kontoID),
    });
    res.redirect("/portefolje/oversigt"); //brugeren bliver redirectet til oversigten
  } catch (err) {
    console.error("Fejl ved oprettelse af portefølje", err);
    res.status(500).send("Kunne ikke oprette den ønskede portefølje");
  }
}

//funktion som henter transaktioner for portefølje
async function hentTransaktionerForPortefølje(req, res) {
  const porteføljeID = parseInt(req.params.id); //tager fat i porteføljeID fra URL og konverterer til heltal
  if (isNaN(porteføljeID)) {
    return res.status(400).send("Ugyldigt porteføljeID");
  }

  try {
    //prøv at hente transaktionerne for portefølje og prøv dernæst at hente oplysningerne om porteføljet
    const transaktioner = await portefoljeData.hentTransaktionerForPortefølje(
      porteføljeID
    );
    const portefølje = await portefoljeData.hentPorteføljeMedID(porteføljeID);
    res.render("handelshistorik", { transaktioner, portefølje });
  } catch (err) {
    //hvis ikke det lykkedes, send statuskdoe og fejl
    console.error("Fejl ved indlæsning af handelshistorik", err);
    res.status(500).send("Kunne ikke hente handelshistorik");
  }
}

module.exports = {
  visPorteføljeOversigt,
  visEtPortefølje,
  visOpretPorteføljeFormular,
  opretPortefølje,
  hentTransaktionerForPortefølje,
};
