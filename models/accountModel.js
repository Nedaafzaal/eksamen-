//impoterer Node.js-pakken Microsoft SQL Server-database
//importerer vores databaseoplysninger
const sql = require("mssql"); 
const sqlConfig = require("../sqlConfig/sqlConfig"); 

//laver en funktion som connecter til vores database
async function hentDB(){ 
    return await sql.connect(sqlConfig);
}

class KontoData {

//metode som henter alle konti for brugeren, på baggrund af brugerens ID
async hentAlleKontiForBruger(brugerID) {
    const db = await hentDB(); 
    const result = await db.request()
    .input("brugerID", sql.Int, brugerID) 
    .query(` 
    SELECT * FROM dbo.konto 
    WHERE brugerID = @brugerID
  `); 
  return result.recordset; //retunerer en liste af alle konti
}

//metode som henter en bestemt konto for brugeren
async hentKontoMedID(kontoID) {
  const db = await hentDB();
  const result = await db.request()
    .input("kontoID", sql.Int, kontoID) 
    .query(`
        SELECT kontoID, kontonavn, saldo, valuta, oprettelsesdato, bankreference, brugerID, aktiv 
        FROM dbo.konto 
        WHERE kontoID = @kontoID
    `);
  return result.recordset[0]; //her forventes kun en konto, hvorfor vi returnerer element med [0].
}

//metode som henter alle transaktioner for en konto
async hentTransaktionerForKonto(kontoID) {
  const db = await hentDB();
  const result = await db.request()
  .input("kontoID", sql.Int, kontoID)
  .query(`
    SELECT * FROM dbo.transaktioner 
    WHERE (sælgerKontoID = @kontoID OR modtagerKontoID = @kontoID)
  `); 
  return result.recordset; 
}

//metode som sætter penge til eller fra saldo, alt efter transaktionstypen: indsæt, hæv, køb eller salg. Beløbets fortegn bestemmes i controller
async opdaterSaldo(kontoID, beløb) {
  const db = await hentDB();
  await db.request()
    .input("kontoID", sql.Int, kontoID) 
    .input("beløb", sql.Decimal(10, 2), beløb) 
    .query(`
      UPDATE dbo.konto 
      SET saldo = saldo + @beløb 
      WHERE kontoID = @kontoID
    `);
}

//metode der gemmer transaktioner
async gemTransaktion(data) {
    const db = await hentDB();
    const nu = new Date(); //tager tidspunkt som det tidspunkt, hvor transaktionen udføres
    
    //da denne metode både benyttes til handel og indsæt/hæv, må vi skelne mellem hvilken type. Derfor laver vi en konstant "harPortefølje". Hvis konstanten er sand, må det betyde der er tale om handel, da handler er afhængige af porteføljeID, mens indsæt/hæv ikke er:
    const harPortefølje = data.porteføljeID !== undefined && data.porteføljeID !== null; 

    //starter opbygning af SQL-request
    const request = db.request()
      .input("kontoID", sql.Int, data.kontoID)
      .input("sælgerID", sql.Int, data.type === "hæv" ? data.kontoID : null) //hvis transaktionstypen = "hæv", skal sælgerID = kontoID
      .input("modtagerID", sql.Int, data.type === "indsæt" ? data.kontoID : null) //hvis transaktionstypen = "indsæt", skal modtagerID = kontoID
      .input("type", sql.VarChar(20), data.type)
      .input("dato", sql.Date, nu)
      .input("tid", sql.Time, nu)
      .input("valuta", sql.VarChar(10), data.valuta)
      .input("beløb", sql.Decimal(18, 2), data.beløb)
      .input("gebyr", sql.Int, 0);

    //definerer SQL-sætning afhængig af om der findes porteføljeID
    let insertSql = "";

    if (harPortefølje) {
        request.input("porteføljeID", sql.Int, data.porteføljeID);
        insertSql = `
          INSERT INTO dbo.transaktioner
          (porteføljeID, kontoID, sælgerKontoID, modtagerKontoID, transaktionstype, dato, tidspunkt, værditype, pris, gebyr)
          VALUES (@porteføljeID, @kontoID, @sælgerID, @modtagerID, @type, @dato, @tid, @valuta, @beløb, @gebyr)
        `;
    } else {
        insertSql = `
          INSERT INTO dbo.transaktioner
          (kontoID, sælgerKontoID, modtagerKontoID, transaktionstype, dato, tidspunkt, værditype, pris, gebyr)
          VALUES (@kontoID, @sælgerID, @modtagerID, @type, @dato, @tid, @valuta, @beløb, @gebyr)
        `;
    }

    //udfører selve INSERT
    await request.query(insertSql);

    //og porteføljens handelsdato opdateres
    if (harPortefølje) {
      await db.request()
        .input("porteføljeID", sql.Int, data.porteføljeID)
        .input("dato", sql.Date, nu)
        .query(`
          UPDATE dbo.porteføljer
          SET sidsteHandelsDato = @dato
          WHERE porteføljeID = @porteføljeID
        `);
    }
}


    //metode som opretter ny konto ud fra brugerID og det brugeren afsender i formularen. Benytter OUTPUT INSERTED.kontoID til at returnere det automatisk generede kontoID
    async opretNyKonto(formularData, brugerID) {
        const db = await hentDB();
        const result = await db.request()
        .input("navn", sql.NVarChar, formularData.navn) //tekstværdi
        .input("saldo", sql.Decimal(18, 2), parseFloat(formularData.saldo))
        .input("valuta", sql.NVarChar, formularData.valuta)
        .input("dato", sql.Date, new Date())
        .input("bankref", sql.NVarChar, formularData.bankreference)
        .input("brugerID", sql.Int, brugerID)
        .query(`
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
        await db.request()
        .input("kontoID", sql.Int, kontoID)
        .input("aktiv", sql.Bit, aktiv) 
        .query(`
            UPDATE dbo.konto
            SET aktiv = @aktiv
            WHERE kontoID = @kontoID
        `); 
    }
}

//opretter ny instans og eksporterer den således vi kan benytte os af objektet i controller
module.exports = new KontoData();
