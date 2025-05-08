const express = require("express"); 
const router = express.Router(); 
const portfolioController = require("../controllers/portfolioController"); //impoterer portofolioController, der indeholder logikken for porteføljer

//GET-anmodningene sørger for at de enkelte funktioner bliver kaldt i de enkelte controllers, når man er på den pågældende rute.
router.get("/oversigt", portfolioController.visPorteføljeOversigt);

router.get("/opret", portfolioController.visOpretPorteføljeFormular);

router.post("/opret", portfolioController.opretPortefølje);

router.get("/vaerdipapir/:id", portfolioController.visVærdipapirDetaljer);

router.get("/:id/buyPapir", portfolioController.visBuyPapirForm);

//når der sker et POST kald fra det enkelte ID sørges der for at der bliver kaldt på den forespurgte funktion
router.post("/:id/buyPapir", portfolioController.købEllerSælg);

router.get("/:id/handelshistorik", portfolioController.hentTransaktionerForPortefølje);

router.get("/:id/searchPapir", portfolioController.søgEfterPapir);

router.get("/vaerdipapir/:id/sellPapir", portfolioController.sælgPapirForm);

router.post("/vaerdipapir/:id/sellPapir", portfolioController.købEllerSælg);


// Denne route til sidst!
router.get("/:id", portfolioController.visEtPortefølje);


module.exports = router;

