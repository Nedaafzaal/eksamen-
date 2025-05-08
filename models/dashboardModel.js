const sql = require("mssql");
const sqlConfig = require("../sqlConfig/sqlConfig");

<<<<<<< Updated upstream
async function hentDB(){
  return await sql.connect(sqlConfig);
}

class DashboardData {
async hentPorteføljerMedAktierForBruger(brugerID) {
=======
async function hentPorteføljerMedAktierForBruger(brugerID) {
>>>>>>> Stashed changes
  const db = await sql.connect(sqlConfig);
  const result = await db.request()
  .input("brugerID", sql.Int, brugerID)
  .query(`
    SELECT p.navn, v.tickerSymbol, v.pris, v.antal
    FROM dbo.porteføljer p
    JOIN dbo.værdipapir v ON p.porteføljeID = v.porteføljeID
    WHERE brugerID = @brugerID
  `);
  return result.recordset;
}
}
module.exports = new DashboardData();

<<<<<<< Updated upstream
=======
module.exports = {
  hentPorteføljerMedAktierForBruger
};
>>>>>>> Stashed changes
