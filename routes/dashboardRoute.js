const express = require("express");
const router = express.Router();
const dashboardModel = require("../models/dashboardModel");

// Når brugeren går til /dashboard
router.get("/", async (req, res) => {
  try {
    const top5 = await dashboardModel.hentTopAktier(); // Vi henter top 5 aktier
    res.render("dashboard", { top5: top5 || [] });     // Vi viser dem i dashboard.ejs
  } catch (err) {
    console.error("Fejl ved hentning af data:", err);
    res.status(500).send("Der skete en fejl");
  }
});

module.exports = router;
