const express = require("express");
const router = express.Router();
const portfolioController = require("../controllers/portfolioController");
const { route } = require("./dashboardRoute");

router.get("/oversigt", portfolioController.visPortefoljeOversigt);

router.get("/opret", portfolioController.visOpretPortefoljeFormular);

router.post("/opret", portfolioController.opretPortefolje);

router.get("/vaerdipapir/:id", portfolioController.visVærdipapirDetaljer);


router.get("/:id/buyPapir", portfolioController.visBuyPapirForm);

router.post("/:id/buyPapir", portfolioController.købEllerSælg);

router.get("/:id/handelshistorik", portfolioController.hentTransaktionerForPortefølje);

router.get("/:id/searchPapir", portfolioController.søgEfterPapir);

// Denne route til sidst!
router.get("/:id", portfolioController.visEnPortefolje);



module.exports = router;
