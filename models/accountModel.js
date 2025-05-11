//impoterer Node.js-pakken Microsoft SQL Server-database
//importerer vores databaseoplysninger
const sql = require("mssql");
const sqlConfig = require("../sqlConfig/sqlConfig");

//laver en funktion som connecter til vores database, således vi kan kalde på den hver gang der skal forbindes til DB
async function hentDB() {
  return await sql.connect(sqlConfig);
}

class KontoData {
  //metode som henter alle konti for brugeren, på baggrund af brugerens ID
  async hentAlleKontiForBruger(brugerID) {
    const db = await hentDB();
    const result = await db.request().input("brugerID", sql.Int, brugerID)
      .query(` 
        SELECT * FROM dbo.konto 
        WHERE brugerID = @brugerID
    `);
    return result.recordset; //retunerer en liste af alle konti
  }


  //metode som henter en bestemt konto for brugeren
  async hentKontoMedID(kontoID) {
    const db = await hentDB();
    const result = await db.request().input("kontoID", sql.Int, kontoID).query(`
            SELECT kontoID, kontonavn, saldo, valuta, oprettelsesdato, bankreference, brugerID, aktiv 
            FROM dbo.konto 
            WHERE kontoID = @kontoID
        `);
    return result.recordset[0]; //her forventes kun en konto, hvorfor vi returnerer element med [0].
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


  //metode der gemmer indsæt eller hæv for konti
  async gemKontoTransaktion(data) {
    const db = await hentDB();
    const nu = new Date();

    await db
      .request()
      .input("kontoID", sql.Int, data.kontoID)
      .input("beløb", sql.Decimal(18, 2), data.beløb)
      .input("transaktionstype", sql.NVarChar(10), data.type) //indsæt eller hæv
      .input("dato", sql.Date, nu)
      .input("tidspunkt", sql.DateTime, nu)
      .input("valuta", sql.NVarChar(10), data.valuta).query(`
            INSERT INTO dbo.kontoTransaktioner (kontoID, beløb, transaktionstype, dato, tidspunkt, valuta)
            VALUES (@kontoID, @beløb, @transaktionstype, @dato, @tidspunkt, @valuta)
        `);
  }


  //metode som henter alle transaktioner for en konto
  async hentKontoTransaktionerForKonto(kontoID) {
    const db = await hentDB();
    const result = await db.request().input("kontoID", sql.Int, kontoID).query(`
            SELECT * FROM dbo.kontoTransaktioner 
            WHERE kontoID = @kontoID
            ORDER BY tidspunkt DESC
        `);
    return result.recordset;
  }


  //metode som sætter penge til eller fra saldo, alt efter transaktionstypen: indsæt, hæv, køb eller salg. Beløbets fortegn bestemmes i controller
  async opdaterSaldo(kontoID, beløb) {
    const db = await hentDB();
    await db
      .request()
      .input("kontoID", sql.Int, kontoID)
      .input("beløb", sql.Decimal(10, 2), beløb).query(`
        UPDATE dbo.konto 
        SET saldo = saldo + @beløb 
        WHERE kontoID = @kontoID
        `);
  }


  //metode som henter alle transaktioner for en konto
  async hentTransaktionerForKonto(kontoID) {
    const db = await hentDB();
    const result = await db.request().input("kontoID", sql.Int, kontoID).query(`
        SELECT * FROM dbo.transaktioner 
        WHERE (sælgerKontoID = @kontoID OR modtagerKontoID = @kontoID)
    `);
    return result.recordset;
  }


  //metode som opretter ny konto ud fra brugerID og det brugeren afsender i formularen. Benytter OUTPUT INSERTED.kontoID til at returnere det automatisk generede kontoID
  async opretNyKonto(formularData, brugerID) {
    const db = await hentDB();
    const result = await db
      .request()
      .input("navn", sql.NVarChar, formularData.navn)
      .input("saldo", sql.Decimal(18, 2), parseFloat(formularData.saldo))
      .input("valuta", sql.NVarChar, formularData.valuta)
      .input("dato", sql.Date, new Date())
      .input("bankref", sql.NVarChar, formularData.bankreference)
      .input("brugerID", sql.Int, brugerID).query(`
            INSERT INTO dbo.konto
            (kontonavn, saldo, valuta, oprettelsesdato, bankreference, brugerID)
            OUTPUT INSERTED.kontoID
            VALUES (@navn, @saldo, @valuta, @dato, @bankref, @brugerID)
        `);

    return result.recordset[0].kontoID; //returnerer kontoID på nyoprettet konto
  }

  
  //metode der ændrer en kontos status vha. BIT, 1=true=aktiv 0=false=deaktiv
  async sætAktivStatus(kontoID, aktiv) {
    const db = await hentDB();
    await db
      .request()
      .input("kontoID", sql.Int, kontoID)
      .input("aktiv", sql.Bit, aktiv).query(`
            UPDATE dbo.konto
            SET aktiv = @aktiv
            WHERE kontoID = @kontoID
        `);
  }
}

module.exports = new KontoData();
