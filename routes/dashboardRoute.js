const express = require("express");
const router = express.Router();
const dashboardModel = require("../models/dashboardModel");



// Når brugeren går til /dashboard
router.get("/", async (req, res) => {
  try {
const top5 = await dashboardModel.hentTopAktier();
const top5Profit = await dashboardModel.hentTopUrealiseretGevinst();

res.render("dashboard", {
  top5: top5 || [],
  top5Profit: top5Profit || []
});

  } catch (err) {
    console.error("Fejl ved hentning af data:", err);
    res.status(500).send("Der skete en fejl");
  }
});

module.exports = router;
