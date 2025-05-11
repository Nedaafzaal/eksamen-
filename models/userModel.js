const sql = require("mssql");
const sqlConfig = require("../sqlConfig/sqlConfig");

async function hentDB() {
  return await sql.connect(sqlConfig);
}

class BrugerData {
  //metode som henter brugerens informationer ud fra brugernavn
  async hentBruger(brugernavn) {
    const database = await sql.connect(sqlConfig);
    const resultat = await database
      .request()
      .input("brugernavn", sql.NVarChar, brugernavn).query(`
        SELECT * FROM dbo.bruger
        WHERE brugernavn = @brugernavn
      `);
    return resultat.recordset[0];
  }


  //metode der henter en bruger med brugerID
  async hentBrugerMedID(brugerID) {
    const db = await hentDB();
    const resultat = await db.request().input("brugerID", sql.Int, brugerID)
      .query(`
        SELECT brugernavn FROM dbo.bruger
        WHERE brugerID = @brugerID
      `);

    return resultat.recordset[0];
  }


  //metode som opretter ny bruger
  async opretBruger(data) {
    const db = await hentDB();
    const result = await db
      .request()
      .input("fornavn", sql.NVarChar, data.fornavn)
      .input("efternavn", sql.NVarChar, data.efternavn)
      .input("brugernavn", sql.NVarChar, data.opretbrugernavn)
      .input("adgangskode", sql.NVarChar, data.opretadgangskode)
      .input("email", sql.NVarChar, data.email)
      .input("fødselsdato", sql.Date, data.fødselsdag)
      .input("telefonnummer", sql.NVarChar, data.telefonnummer)
      .query(`
        INSERT INTO dbo.bruger (fornavn, efternavn, brugernavn, adgangskode, email, fødselsdato, telefonnummer)
        OUTPUT INSERTED.brugerID
        VALUES (@fornavn, @efternavn, @brugernavn, @adgangskode, @email, @fødselsdato, @telefonnummer)
      `);

    return { brugerID: result.recordset[0].brugerID }; 
  }


  //metode for validering af adgangskode for når bruger prøver at logge ind
  async tjekAdgangskode(brugernavn, adgangskode) {
    const db = await hentDB();
    const resultat = await db
      .request()
      .input("brugernavn", sql.NVarChar, brugernavn)
      .input("adgangskode", sql.NVarChar, adgangskode).query(`
        SELECT * FROM dbo.bruger
        WHERE brugernavn = @brugernavn AND adgangskode = @adgangskode
      `);
    return resultat.recordset.length > 0; //returnerer true hvis adgangskode passer overens med brugernavn
  }
  

  //metode til når bruger ønsker at opdatere/skifte sin adgangskode, som går ind i tabellen bruger og sætter adgangskoden til nyKode, der hvor brugernavn i databasen er = brugerens brugernavn
  async opdaterAdgangskode(brugernavn, nyKode) {
    const db = await hentDB();
    await db
      .request()
      .input("brugernavn", sql.NVarChar, brugernavn)
      .input("nyKode", sql.NVarChar, nyKode).query(`
        UPDATE dbo.bruger
        SET adgangskode = @nyKode
        WHERE brugernavn = @brugernavn
      `);
  }
}

module.exports = new BrugerData();
