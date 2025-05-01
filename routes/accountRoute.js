const express = require("express");
const router = express.Router();
const accountController = require("../controllers/accountController");

// Viser oversigt over alle konti
router.get("/oversigt", accountController.visAlleKonti);

// Viser siden hvor man kan indsætte penge
router.get("/insert/:id", accountController.visIndsætFormular);
router.post("/insert", accountController.indsætVærdi);

// Viser siden hvor man kan hæve penge
router.get("/withdraw/:id", accountController.visHævFormular);
router.post("/withdraw", accountController.hævVærdi);

// Viser siden hvor man kan oprette en ny konto
router.get("/opret", accountController.visOpretFormular);
router.post("/opret", accountController.opretKonto);

router.get("/close/:id", accountController.lukKonto);
router.get("/open/:id", accountController.åbnKonto);

// Viser én konto og dens transaktioner
router.get("/:id", accountController.visEnKonto);

module.exports = router;
