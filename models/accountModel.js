const sql = require("mssql"); //importere mysql pakken
const sqlConfig = require("../sqlConfig/sqlConfig"); //importere oplysninger der bruges til at oprette forbindelse til databasen


//hent alle konti fra databasen
async function hentAlleKonti() {
  const db = await sql.connect(sqlConfig); //opretter forbindelse til databasen
  const result = await db.request().query(`
    SELECT * FROM eksamenSQL.konto
  `); //SQL forspørgsel der henter alle konti
  return result.recordset; //retunere en liste af alle konti
}


//henter en konto ud fra kontoID 
async function hentKontoMedID(kontoID) {
  const db = await sql.connect(sqlConfig);
  const result = await db.request()
    .input("id", sql.Int, kontoID) //henter den parameter som forspørgslen kommer til at indeholde 
    .query(`
      SELECT * FROM eksamenSQL.konto WHERE kontoID = @id 
    `); //forspørgsel der henter konto som matcher id

  return result.recordset[0]; //retunere selve kontoen 
}


//henter alle transaktioner for en konto 
async function hentTransaktionerForKonto(kontoID) {
  const db = await sql.connect(sqlConfig);
  const result = await db.request()
  .input("id", sql.Int, kontoID) //angiver parameter til forspørgsel 
  .query(`
    SELECT * FROM eksamenSQL.transaktioner 
    WHERE (sælgerKontoID = @id OR modtagerKontoID = @id)
      AND transaktionstype IN ('hæv', 'indsæt')
  `); //henter alle transaktioner hvor kontoen enten er modtager eller sælger 

  return result.recordset; //retunere en liste af transaktioner 
}


//lig penge til eller trække penge fra saldoen 
async function opdaterSaldo(kontoID, beløb) {
  const db = await sql.connect(sqlConfig);
  await db.request()
    .input("id", sql.Int, kontoID) 
    .input("beløb", sql.Decimal(18, 2), beløb) //parameter beløb til forspørgsel, enten positivt eller negativt tal
    .query(`
      UPDATE eksamenSQL.konto 
      SET saldo = saldo + @beløb 
      WHERE kontoID = @id
    `); //opdatere saldoen ved at ligge beløbet til uanset om det er + eller - 
}


//gemmer en ny transaktion i vores database 
async function gemTransaktion(data) {
  const db = await sql.connect(sqlConfig);
  const nu = new Date(); //tager nuværende data og tid 
  await db.request() 
    .input("sælgerID", sql.Int, data.type === "Hæv" ? data.kontoID : null) //hvis der er en hævning er kontoen afsender 
    .input("modtagerID", sql.Int, data.type === "Indsæt" ? data.kontoID : null) //hvis der er en indsættelse er kontoen modtager 
    .input("type", sql.VarChar(20), data.type) 
    .input("dato", sql.Date, nu)
    .input("tid", sql.Time, nu)
    .input("valuta", sql.VarChar(10), data.valuta || "DKK") //valuta standard er DKK
    .input("beløb", sql.Decimal(18, 2), data.beløb) 
    .input("gebyr", sql.Int, 0) //gebyr stanard 0kr. 
    .query(`
      INSERT INTO eksamenSQL.transaktioner
      (sælgerKontoID, modtagerKontoID, transaktionstype, dato, tidspunkt, værditype, pris, gebyr)
      VALUES (@sælgerID, @modtagerID, @type, @dato, @tid, @valuta, @beløb, @gebyr)
    `); //indsætter en ny transaktion i databasen 
}


//opret en ny konto 
async function opretNyKonto(formData, brugerID) {
    const db = await sql.connect(sqlConfig);
    const result = await db.request()
      .input("navn", sql.NVarChar, formData.navn)
      .input("saldo", sql.Decimal(18, 2), parseFloat(formData.saldo))
      .input("valuta", sql.NVarChar, formData.valuta)
      .input("dato", sql.Date, new Date())
      .input("bankref", sql.NVarChar, formData.bankreference)
      .input("brugerID", sql.Int, brugerID)
      .query(`
        INSERT INTO eksamenSQL.konto
        (kontonavn, saldo, valuta, oprettelsesdato, bankreference, brugerID)
        VALUES (@navn, @saldo, @valuta, @dato, @bankref, @brugerID)
      `); //opretter en ny konto i databasen 
  
    return result.recordset?.[0]?.kontoID; //returner kontoID efter oprettelsen så det kan bruges til at vise kontoen 
  }
  

//ændrer en kontos status så den er åben/lukket
async function sætAktivStatus(kontoID, aktiv) {
    const db = await sql.connect(sqlConfig);
    await db.request()
      .input("id", sql.Int, kontoID)
      .input("aktiv", sql.Bit, aktiv) //booleanværdi er true(1)=aktiv, false(0)=inaktiv
      .query(`
        UPDATE eksamenSQL.konto
        SET aktiv = @aktiv
        WHERE kontoID = @id
      `); //opdaterer aktiv status i databasen
  }
  

//gør det muligt at eksportere, så de kan bruges i controller
module.exports = {
  hentAlleKonti,
  hentKontoMedID,
  hentTransaktionerForKonto,
  opdaterSaldo,
  gemTransaktion,
  opretNyKonto,
  sætAktivStatus
};

