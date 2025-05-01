const sql = require("mssql");
const sqlConfig = require("../sqlConfig/sqlConfig");

// Hent alle porteføljer fra databasen
async function hentAllePortefoljer() {
  const db = await sql.connect(sqlConfig);
  const result = await db.request().query(`
    SELECT * FROM eksamenSQL.porteføljer
  `);

  return result.recordset; // Vi returnerer listen af porteføljer
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

  return result.recordset[0]; // Vi returnerer den ene portefølje vi fandt
}

// Hent alle aktier, der tilhører en bestemt portefølje
async function hentAktierTilPortefolje(portefoljeID) {
    const db = await sql.connect(sqlConfig);
    const result = await db.request()
    .input("porteføljeID", sql.Int, portefoljeID)
    .query(`
        SELECT aktieNavn, antal, nuværendeVærdi
        FROM eksamenSQL.aktier
        WHERE porteføljeID = @porteføljeID
    `);
    
    return result.recordset;
}

//Henter samlet værdi for alle porteføljer
async function hentSamletVærdiForAllePorteføljer() {
    const db = await sql.connect(sqlConfig);
    const result = await db.request().query(`
      SELECT porteføljeID, SUM(antal * nuværendeVærdi) AS samletVærdi
      FROM eksamenSQL.aktier
      GROUP BY porteføljeID
    `);
    return result.recordset; // array med { porteføljeID, samletVærdi }
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
  hentAktierTilPortefolje,
  opretNyPortefolje
};
