const express = require("express");
const router = express.Router();
const dashboardModel = require("../models/dashboardModel");

router.get("/", async (req, res) => {
  try {
    const top5 = await dashboardModel.hentTopAktier();
    const top5Profit = await dashboardModel.hentTopUrealiseretGevinst();

    // Beregn totaler fra urealiseret gevinst-data
    const totalUrealiseret = top5Profit.reduce((sum, aktie) => sum + aktie.gevinst, 0);
    const totalVærdi = top5Profit.reduce((sum, aktie) => sum + aktie.samletVærdi, 0);

    // Dummy for realiseret gevinst
    const totalRealiseret = 0;

    res.render("dashboard", {
      top5: top5 || [],
      top5Profit: top5Profit || [],
      totalUrealiseret,
      totalRealiseret,
      totalVærdi
    });
  } catch (err) {
    console.error("Fejl ved hentning af data:", err);
    res.status(500).send("Der skete en fejl");
  }
});

module.exports = router;
