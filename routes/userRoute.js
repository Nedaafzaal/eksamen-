const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

//hhv. get og post anmodninger for login
router.get("/login", userController.visLoginSide);
router.post("/login", userController.login);

//hhv. get og post anmodninger for opret bruger
router.get("/opretbruger", userController.visOpretBrugerSide);
router.post("/opretbruger", userController.opretBruger);

//hhv. get og post anmodninger for indstillinger og skiftadgangskode
router.get("/indstillinger", userController.visIndstillinger);
router.post("/indstillinger", userController.skiftAdgangskode);

//redirct fra forsiden
router.get("/", (req, res) => res.redirect("/login"));

module.exports = router;
