const express = require("express");
const router = express.Router();
const portfolioController = require("../controllers/portfolioController");

// Viser alle porteføljer i en oversigt
router.get("/oversigt", portfolioController.visPortefoljeOversigt);

// Viser formularen til at oprette en ny portefølje
router.get("/opret", portfolioController.visOpretPortefoljeFormular);

// Når brugeren sender formularen og opretter en portefølje
router.post("/opret", portfolioController.opretPortefolje);

router.get("/:id/handelshistorik", portfolioController.hentTransaktionerForPortefølje);

router.get("/:id/searchPapir", portfolioController.søgEfterPapir);


// Viser én bestemt portefølje og dens aktier
router.get("/:id", portfolioController.visEnPortefolje);


module.exports = router;
