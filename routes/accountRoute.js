const express = require("express"); //importere express
const router = express.Router(); //importere denne funktion fra express der gør det mere overskueligt at definere ruter
const accountController = require("../controllers/accountController"); //importere controlleren med funktionerne til at håndterer konto-logik

//viser oversigt over alle konti
router.get("/oversigt", accountController.visAlleKonti); //når brugeren går til /oversigt, vises alle konti via controlleren 

//viser siden og formularen hvor man kan indsætte penge 
router.get("/insert/:id", accountController.visIndsætFormular);
router.post("/insert/", accountController.indsætVærdi);

//viser siden og formulaen hvor man kan hæve penge 
router.get("/withdraw/:id", accountController.visHævFormular);
router.post("/withdraw", accountController.hævVærdi);

//viser siden og formularen hvor man kan oprette en ny konto
router.get("/opret", accountController.visOpretFormular);
router.post("/opret", accountController.opretKonto);

//deaktivere og åbner en konto med et givent kontoD
router.get("/close/:id", accountController.lukKonto);
router.get("/open/:id", accountController.åbnKonto);

//viser en konto med tilhørerende transaktioner 
router.get("/:id", accountController.visEnKonto);

module.exports = router; //gør routeren tilgængelig for app.js 
