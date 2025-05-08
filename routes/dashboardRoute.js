const express = require("express"); //importerer Express pakken for at håndtere HTTP-ruter
const router = express.Router(); //opretter en en router til at håndtere routerne
const dashboardController = require("../controllers/dashboardController"); //importerer dashboardController, der indeholder logikken for dashboardet

router.get("/", dashboardController.visDashboard); //routen for at vise dashboardet: Når en GET-anmodning modtages på "/", bliver visDashboard funktionen i dashboardController kaldt

//eksporterer routeren, så den kan bruges i app.js
module.exports = router;
