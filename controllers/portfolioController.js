const portfolioModel = require("../models/portfolioModel");

// Viser alle porteføljer i en liste
exports.visPortefoljeOversigt = async (req, res) => {
  try {
    const portefoljer = await portfolioModel.hentAllePortefoljer();
    
    res.render("portefoljeOversigt", { portefoljer });
  } catch (err) {
    console.error("Fejl ved hentning af porteføljer:", err);
    res.status(500).send("Noget gik galt ved visning af porteføljeoversigten.");
  }
};

// Viser én bestemt portefølje og dens værdipapirer
exports.visEnPortefolje = async (req, res) => {
  const portefoljeID = parseInt(req.params.id, 10);

  if (isNaN(portefoljeID)) {
    return res.status(400).send("Ugyldigt portefølje-ID");
  }

  try {
    const portefolje = await portfolioModel.hentPortefoljeMedID(portefoljeID);

    if (!portefolje) {
      return res.status(404).send("Portefølje ikke fundet.");
    }

    const værdipapirer = await portfolioModel.hentVærdipapirerTilPortefølje(portefoljeID);

    let samletVærdi = 0;
    for (let i = 0; i < værdipapirer.length; i++) {
      samletVærdi += værdipapirer[i].antal * værdipapirer[i].pris;
    }

    res.render("portefolje", { portefolje, værdipapirer, samletVærdi });

  } catch (err) {
    console.error("Fejl ved visning af portefølje:", err);
    res.status(500).send("Noget gik galt ved visning af portefølje.");
  }
};

// Viser formularen til at oprette ny portefølje
exports.visOpretPortefoljeFormular = (req, res) => {
  res.render("opretPortefolje");
};

// Når brugeren sender formularen og vil oprette ny portefølje
exports.opretPortefolje = async (req, res) => {
  const { navn, kontotilknytning, forventetVærdi } = req.body;

  try {
    await portfolioModel.opretNyPortefolje({
      navn,
      kontotilknytning,
      forventetVærdi
    });

    res.redirect("/portefolje/oversigt");
  } catch (err) {
    console.error("Fejl ved oprettelse af portefølje:", err);
    res.status(500).send("Kunne ikke oprette portefølje.");
  }
};
