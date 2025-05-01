const express = require("express");
const router = express.Router();
const fetch = require("node-fetch"); // vigtigt for at hente live data
const dashboardModel = require("../models/dashboardModel");

const API_KEY = "VIFKRO19ZTBKWXQL2SE"; // din Alpha Vantage nøgle

router.get("/", async (req, res) => {
  try {
    const top5 = await dashboardModel.hentTopAktier();
    const top5Profit = await dashboardModel.hentTopUrealiseretGevinst();

    const aktier = await dashboardModel.hentPorteføljerMedAktier(); // henter dine aktier fra databasen

    let totalVærdi = 0;
    let totalUrealiseret = 0;

    for (const aktie of aktier) {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${aktie.symbol}&apikey=${API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      const quote = data["Global Quote"];
      const aktuelPris = parseFloat(quote?.["05. price"]);

      if (!isNaN(aktuelPris)) {
        const værdi = aktuelPris * aktie.antal;
        totalVærdi += værdi;
        totalUrealiseret += (aktuelPris - aktie.købspris) * aktie.antal;
      }
    }

    const totalRealiseret = 0; // (Kan implementeres senere)

    res.render("dashboard", {
      top5: top5 || [],
      top5Profit: top5Profit || [],
      totalVærdi,
      totalUrealiseret,
      totalRealiseret
    });

  } catch (err) {
    console.error("Fejl ved hentning af dashboarddata:", err);
    res.status(500).send("Der skete en fejl");
  }
});

module.exports = router;
