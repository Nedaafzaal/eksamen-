const fetch = require("node-fetch"); // Vi bruger fetch til at hente data fra internettet

const API_KEY = "VIF5KCDTH18ZUONC"; // Dette er vores hemmelige nøgle til API'en
const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA']; // Liste af aktier vi vil kigge på

// Denne funktion viser dashboardet
exports.visDashboard = async (req, res) => {
  try {
    const resultater = []; // Her gemmer vi alle aktie-data

    // Vi går igennem hver aktie én ad gangen
    for (const symbol of symbols) {
      // Vi laver et link til aktie-info på Alpha Vantage
      const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${API_KEY}`;

      // Vi sender forespørgsel og venter på svar
      const response = await fetch(url);
      const data = await response.json();
      console.log(data);

      // Hvis vi fik et svar med markedsværdi (MarketCapitalization), så gemmer vi den
      if (data.MarketCapitalization) {
        resultater.push({
          symbol: symbol,           
          name: data.Name,         
          marketCap: Number(data.MarketCapitalization) // Laves om til tal
        });
      }
    }

    // Vi sorterer listen så de største aktier kommer først, og tager de 5 største
    const top5 = resultater.sort((a, b) => b.marketCap - a.marketCap).slice(0, 5);

    // Vi sender listen til dashboard-siden, så den kan vises med EJS
    res.render("dashboard", { top5: top5 });
  } catch (err) {
    // Hvis noget går galt, viser vi en fejl
    console.error("Fejl i dashboard:", err);
    res.status(500).send("Noget gik galt med dashboardet.");
  }
};
