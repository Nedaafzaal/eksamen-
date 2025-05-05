const sql = require("mssql");
const sqlConfig = require("../sqlConfig/sqlConfig");

class BrugerData {
  // Hent én bruger fra databasen ud fra brugernavn
  async hentBruger(brugernavn) {
    const database = await sql.connect(sqlConfig);
    const resultat = await database.request()
      .input("brugernavn", sql.NVarChar, brugernavn)
      .query(`
        SELECT * FROM [dbo].[bruger]
        WHERE brugernavn = @brugernavn
      `);

    return resultat.recordset[0]; // returnér den første (eller undefined hvis ingen findes)
  }

  // Opret en ny bruger med info fra formularen
  async opretBruger(data) {
    const database = await sql.connect(sqlConfig);
    await database.request()
      .input("fornavn", sql.NVarChar, data.fornavn)
      .input("efternavn", sql.NVarChar, data.efternavn)
      .input("brugernavn", sql.NVarChar, data.opretbrugernavn)
      .input("adgangskode", sql.NVarChar, data.opretadgangskode)
      .input("email", sql.NVarChar, data.email)
      .input("fødselsdato", sql.Date, data.fødselsdag)
      .input("telefonnummer", sql.NVarChar, data.telefonnummer)
      .query(`
        INSERT INTO [dbo].[bruger]
        (fornavn, efternavn, brugernavn, adgangskode, email, fødselsdato, telefonnummer)
        VALUES (@fornavn, @efternavn, @brugernavn, @adgangskode, @email, @fødselsdato, @telefonnummer)
      `);
  }

  // Tjek om brugernavn OG adgangskode passer sammen
  async tjekAdgangskode(brugernavn, adgangskode) {
    const database = await sql.connect(sqlConfig);
    const resultat = await database.request()
      .input("brugernavn", sql.NVarChar, brugernavn)
      .input("adgangskode", sql.NVarChar, adgangskode)
      .query(`
        SELECT * FROM [dbo].[bruger]
        WHERE brugernavn = @brugernavn AND adgangskode = @adgangskode
      `);

    return resultat.recordset.length > 0; // returnér true hvis der findes én
  }

  // Skift brugerens adgangskode
  async opdaterAdgangskode(brugernavn, nyKode) {
    const database = await sql.connect(sqlConfig);
    await database.request()
      .input("brugernavn", sql.NVarChar, brugernavn)
      .input("nyKode", sql.NVarChar, nyKode)
      .query(`
        UPDATE [dbo].[bruger]
        SET adgangskode = @nyKode
        WHERE brugernavn = @brugernavn
      `);
  }
}

module.exports = new BrugerData();
