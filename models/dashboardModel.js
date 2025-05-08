//importerer nødvendige moduler
const sql = require("mssql"); 
const sqlConfig = require("../sqlConfig/sqlConfig"); 


async function hentDB() { //funktion, der opretter forbindelse til databasen
  return await sql.connect(sqlConfig); //opretter forbindelse til databasen ved hjælp af sqlConfig
}


class DashboardData { //dashboardData-klasse, der indeholder funktioner relateret til dashboard data
  

  async hentPorteføljerMedAktierForBruger(brugerID) {  //henter porteføljer med aktier for en given bruger
    const db = await hentDB(); 
    const result = await db.request()
      .input("brugerID", sql.Int, brugerID) //angiver parameteren brugerID som skal bruges i SQL forespørgslen
      .query(`
        SELECT p.navn, v.tickerSymbol, v.pris, v.antal
        FROM dbo.porteføljer p
        JOIN dbo.værdipapir v ON p.porteføljeID = v.porteføljeID
        WHERE p.brugerID = @brugerID
      `); //SQL-forespørgsel der henter porteføljens navn, værdipapirernes tickerSymbol, pris og antal for en given bruger

    return result.recordset; // Returnerer resultaterne som en liste (recordset) af porteføljer og aktier
  }
}

//eksporterer en instans af DashboardData-klassen for at kunne bruge den i andre filer
module.exports = new DashboardData();
