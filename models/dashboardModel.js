const sql = require("mssql");
const sqlConfig = require("../sqlConfig/sqlConfig");

async function hentPorteføljerMedAktier() {
  const db = await sql.connect(sqlConfig);
  const result = await db.request().query(`
    SELECT p.navn, v.tickerSymbol, v.pris, v.antal
    FROM eksamenSQL.porteføljer p
    JOIN eksamenSQL.værdipapir v ON p.porteføljeID = v.porteføljeID
  `);
  return result.recordset;
}

module.exports = {
  hentPorteføljerMedAktier
};
