const express = require("express"); 
const router = express.Router(); 

//impoterer portofolioController, der indeholder logikken for porteføljer
const portfolioController = require("../controllers/portfolioController"); 

//GET-anmodningene sørger for at de enkelte funktioner bliver kaldt i de enkelte controllers, når man er på den pågældende rute.
router.get("/oversigt", portfolioController.visPorteføljeOversigt);

router.get("/opret", portfolioController.visOpretPorteføljeFormular);

router.post("/opret", portfolioController.opretPortefølje);


//når der sker et POST kald fra det enkelte ID sørges der for at der bliver kaldt på den forespurgte funktion

router.get("/:id/handelshistorik", portfolioController.hentTransaktionerForPortefølje);

router.get("/:id", portfolioController.visEtPortefølje);

module.exports = router;

