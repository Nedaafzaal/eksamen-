const sql = require("mssql");
const sqlConfig = require("../sqlConfig/sqlConfig");

async function hentDB() {
  return await sql.connect(sqlConfig);
}

class PortefoljeData {
  //metode som henter alle porteføljer for brugeren, ved at join portefølje med konto tabel via kontoID
  async hentAllePorteføljerForBruger(brugerID) {
    const db = await hentDB();
    const result = await db.request().input("brugerID", sql.Int, brugerID)
      .query(`
        SELECT 
          p.porteføljeID,
          p.navn,
          p.sidsteHandelsDato,
          k.kontonavn
        FROM dbo.porteføljer p
        JOIN dbo.konto k ON p.kontoID = k.kontoID
        WHERE k.brugerID = @brugerID
      `);

    return result.recordset;
  }


  //metode som henter portefølje med ID
  async hentPorteføljeMedID(porteføljeID) {
    const db = await hentDB();
    const result = await db
      .request()
      .input("porteføljeID", sql.Int, porteføljeID).query(`
          SELECT porteføljeID, navn, kontoID, oprettelsesDato
          FROM dbo.porteføljer 
          WHERE porteføljeID = @porteføljeID
      `);

    return result.recordset[0];
  }


  //metode som opretter ny portefølje
  async opretNyPortefølje(data) {
    const db = await hentDB();
    await db
      .request()
      .input("navn", sql.NVarChar, data.navn)
      .input("kontoID", sql.Int, data.kontoID)
      .input("oprettelsesDato", sql.Date, new Date()).query(`
        INSERT INTO dbo.porteføljer (navn, kontoID, oprettelsesDato)
        VALUES (@navn, @kontoID, @oprettelsesDato)
      `);
  }


  //metode der henter alle køb- og salgstransaktioner for brugerens portefølje ved at joine konto og transaktion, sorteret fra nyeste til ældste
  async hentTransaktionerForPortefølje(porteføljeID) {
    const db = await hentDB();
    const result = await db
      .request()
      .input("porteføljeID", sql.Int, porteføljeID).query(`
        SELECT t.*, k.kontonavn
        FROM dbo.transaktioner t
        JOIN dbo.porteføljer p ON t.porteføljeID = p.porteføljeID
        JOIN dbo.konto k ON p.kontoID = k.kontoID
        WHERE t.porteføljeID = @porteføljeID
        ORDER BY t.tidspunkt DESC


      `);

    return result.recordset; //returnerer listen af transaktioner for givet portefølje
  }


  //metode som henter konti ejet af brugeren der er logget ind
  async hentKontiForBruger(brugerID) {
    const db = await hentDB();
    const result = await db.request().input("brugerID", sql.Int, brugerID)
      .query(`
        SELECT * FROM dbo.konto WHERE brugerID = @brugerID
      `);
    return result.recordset;
  }

  
  //metode der opdaterer sidste handels dato
  async opdaterSidsteHandelsDato(porteføljeID) {
    const db = await hentDB();
    await db
      .request()
      .input("porteføljeID", sql.Int, porteføljeID)
      .input("dato", sql.Date, new Date()).query(`
        UPDATE dbo.porteføljer
        SET sidsteHandelsDato = @dato
        WHERE porteføljeID = @porteføljeID
      `);
  }
}

module.exports = new PortefoljeData();
