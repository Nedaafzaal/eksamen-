const express = require("express");
const router = express.Router();
const stockController = require("../controllers/stockController");

router.get("/vaerdipapir/:id/sellPapir", stockController.sælgPapirForm);
router.post("/vaerdipapir/:id/sellPapir", stockController.købEllerSælg);
router.get("/vaerdipapir/:id", stockController.visVærdipapirDetaljer);
router.get("/vaerdipapir/:symbol/historik", stockController.hentKursudvikling);

router.get("/:id/searchPapir", stockController.søgEfterPapir);
router.get("/:id/buyPapir", stockController.visBuyPapirForm);
router.post("/:id/buyPapir", stockController.købEllerSælg);

module.exports = router;
