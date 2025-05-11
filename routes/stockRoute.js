const express = require("express");
const router = express.Router();
const stockController = require("../controllers/stockController");

//viser formular til salg af et værdipapir baseret på ID 
router.get("/vaerdipapir/:id/sellPapir", stockController.sælgPapirForm);
//håndtere POST anmodning for salg
router.post("/vaerdipapir/:id/sellPapir", stockController.købEllerSælg);
//viser detaljer om et bestemt værdipapir
router.get("/vaerdipapir/:id", stockController.visVærdipapirDetaljer);
//henter kursudvikling baseret på symbol
router.get("/vaerdipapir/:symbol/historik", stockController.hentKursudvikling);

//viser en søgefunktion til at finde værdipapirer
router.get("/:id/searchPapir", stockController.søgEfterPapir);
//viser formular til køb af værdipapir
router.get("/:id/buyPapir", stockController.visBuyPapirForm);
//håndtere POST anmodning for køb
router.post("/:id/buyPapir", stockController.købEllerSælg);

module.exports = router;
