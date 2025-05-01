const sql = require("mssql");
const sqlConfig = require("../sqlConfig/sqlConfig");

// Hent alle porteføljer fra databasen
async function hentAllePortefoljer() {
  const db = await sql.connect(sqlConfig);
  const result = await db.request().query(`
    SELECT * FROM eksamenSQL.porteføljer
  `);

  return result.recordset;
}

// Hent én portefølje baseret på ID
async function hentPortefoljeMedID(id) {
  const db = await sql.connect(sqlConfig);
  const result = await db.request()
    .input("id", sql.Int, id)
    .query(`
      SELECT * FROM eksamenSQL.porteføljer
      WHERE porteføljeID = @id
    `);

  return result.recordset[0];
}

// Hent alle værdipapirer, der tilhører en bestemt portefølje
async function hentVærdipapirerTilPortefølje(porteføljeID) {
  const db = await sql.connect(sqlConfig);
  const result = await db.request()
    .input("porteføljeID", sql.Int, porteføljeID)
    .query(`
      SELECT navn, tickerSymbol, type, antal, pris, forventetVærdi, GAK, urealiseretPorteføljeGevinstTab
      FROM eksamenSQL.værdipapir
      WHERE porteføljeID = @porteføljeID
    `);

  return result.recordset;
}

// Hent samlet værdi for alle porteføljer ud fra værdipapirer
async function hentSamletVærdiForAllePorteføljer() {
  const db = await sql.connect(sqlConfig);
  const result = await db.request().query(`
    SELECT porteføljeID, SUM(forventetVærdi) AS samletVærdi
    FROM eksamenSQL.værdipapir
    GROUP BY porteføljeID
  `);
  return result.recordset;
}

// Opret en ny portefølje i databasen
async function opretNyPortefolje(data) {
  const db = await sql.connect(sqlConfig);
  await db.request()
    .input("navn", sql.NVarChar, data.navn)
    .input("kontotilknytning", sql.NVarChar, data.kontotilknytning)
    .input("forventetVærdi", sql.Decimal(18, 2), data.forventetVærdi)
    .input("værdipapirNavn", sql.NVarChar, "Ingen endnu")
    .query(`
      INSERT INTO eksamenSQL.porteføljer
      (navn, kontotilknytning, forventetVærdi, værdipapirNavn)
      VALUES (@navn, @kontotilknytning, @forventetVærdi, @værdipapirNavn)
    `);
}

module.exports = {
  hentAllePortefoljer,
  hentPortefoljeMedID,
  hentVærdipapirerTilPortefølje,
  hentSamletVærdiForAllePorteføljer,
  opretNyPortefolje
};
