const sql = require("mssql");
const sqlConfig = require("../sqlConfig/sqlConfig");

//funktion som forbinder til vores database
async function hentDB() {
  return await sql.connect(sqlConfig);
}

class DashboardData {
  //metode som henter porteføljer med aktier for den bruger som er logget ind, da porteføljetabellen ikke har brugerID som FK, må porteføljer joines med konto- og værdipapirtabel
  async hentPorteføljerMedAktierForBruger(brugerID) {
    const db = await hentDB();
    const result = await db.request().input("brugerID", sql.Int, brugerID)
      .query(`
            SELECT p.navn, v.tickerSymbol, v.pris, v.antal
            FROM dbo.porteføljer p
            JOIN dbo.værdipapir v ON p.porteføljeID = v.porteføljeID
            JOIN dbo.konto k ON p.kontoID = k.kontoID
            WHERE k.brugerID = @brugerID
          `);
    return result.recordset;
  }
}
module.exports = new DashboardData();
