const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

// Login
router.get("/login", userController.visLoginSide);
router.post("/login", userController.login);

// Opret bruger
router.get("/opretbruger", userController.visOpretBrugerSide);
router.post("/opretbruger", userController.opretBruger);

// Skift adgangskode og viser indstillinger siden
router.get("/indstillinger", userController.visIndstillinger); 
router.post("/indstillinger", userController.skiftAdgangskode);


// Redirect fra forsiden
router.get("/", (req, res) => res.redirect("/login"));

module.exports = router;
