const sql = require("mssql"); //importere mysql pakken
const sqlConfig = require("../sqlConfig/sqlConfig"); //importere oplysninger der bruges til at oprette forbindelse til databasen

async function hentDB(){
    return await sql.connect(sqlConfig);
}

//hent alle konti fra databasen
async function hentAlleKonti() {
    const db = await hentDB(); //opretter forbindelse til databasen
    const result = await db.request().query(`
    SELECT * FROM dbo.konto
  `); //SQL forspørgsel der henter alle konti
  return result.recordset; //retunere en liste af alle konti
}


//henter en konto ud fra kontoID 
async function hentKontoMedID(kontoID) {
  const db = await hentDB();
  const result = await db.request()
    .input("ID", sql.Int, kontoID) //henter den parameter som forspørgslen kommer til at indeholde 
    .query(`
        SELECT kontoID, porteføljeID, kontonavn, saldo, valuta, oprettelsesdato, bankreference, brugerID, aktiv 
        FROM dbo.konto 
        WHERE kontoID = @ID
    `); //forspørgsel der henter konto som matcher id
    
  return result.recordset[0]; //retunere selve kontoen 
}


//henter alle transaktioner for en konto 
async function hentTransaktionerForKonto(kontoID) {
  const db = await hentDB();
  const result = await db.request()
  .input("ID", sql.Int, kontoID) //angiver parameter til forspørgsel 
  .query(`
    SELECT * FROM dbo.transaktioner 
    WHERE (sælgerKontoID = @ID OR modtagerKontoID = @ID)
      AND transaktionstype IN ('hæv', 'indsæt', 'køb', 'salg')
  `); //henter alle transaktioner hvor kontoen enten er modtager eller sælger 

  return result.recordset; //retunere en liste af transaktioner 
}


//lig penge til eller trække penge fra saldoen 
async function opdaterSaldo(kontoID, beløb) {
  const db = await hentDB();
  await db.request()
    .input("ID", sql.Int, kontoID) 
    .input("beløb", sql.Decimal(18, 2), beløb) //parameter beløb til forspørgsel, enten positivt eller negativt tal
    .query(`
      UPDATE dbo.konto 
      SET saldo = saldo + @beløb 
      WHERE kontoID = @ID
    `); //opdatere saldoen ved at ligge beløbet til uanset om det er + eller - 
}


//gemmer en ny transaktion i vores database 
async function gemTransaktion(data) {
    const db = await hentDB();
    const nu = new Date(); // nuværende dato og tid
  
    // Gem selve transaktionen
    await db.request() 
      .input("porteføljeID", sql.Int, data.porteføljeID)
      .input("kontoID", sql.Int, data.kontoID)
      .input("sælgerID", sql.Int, data.type === "Hæv" ? data.kontoID : null)
      .input("modtagerID", sql.Int, data.type === "Indsæt" ? data.kontoID : null)
      .input("type", sql.VarChar(20), data.type)
      .input("dato", sql.Date, nu)
      .input("tid", sql.Time, nu)
      .input("valuta", sql.VarChar(10), data.valuta || "DKK")
      .input("beløb", sql.Decimal(18, 2), data.beløb)
      .input("gebyr", sql.Int, 0)
      .query(`
        INSERT INTO dbo.transaktioner
        (porteføljeID, kontoID, sælgerKontoID, modtagerKontoID, transaktionstype, dato, tidspunkt, værditype, pris, gebyr)
        VALUES (@porteføljeID, @kontoID, @sælgerID, @modtagerID, @type, @dato, @tid, @valuta, @beløb, @gebyr)
      `);
  
    // Opdater sidsteHandelsDato i porteføljen
    await db.request()
      .input("porteføljeID", sql.Int, data.porteføljeID)
      .input("dato", sql.Date, nu)
      .query(`
        UPDATE dbo.porteføljer
        SET sidsteHandelsDato = @dato
        WHERE porteføljeID = @porteføljeID
      `);
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
  .input("porteføljeID", sql.Int, formData.porteføljeID)
  .query(`
    INSERT INTO dbo.konto
    (kontonavn, saldo, valuta, oprettelsesdato, bankreference, brugerID, porteføljeID)
    OUTPUT INSERTED.kontoID
    VALUES (@navn, @saldo, @valuta, @dato, @bankref, @brugerID, @porteføljeID)
  `);

return result.recordset[0].kontoID;
}
  

//ændrer en kontos status så den er åben/lukket
async function sætAktivStatus(kontoID, aktiv) {
    const db = await hentDB();
    await db.request()
      .input("ID", sql.Int, kontoID)
      .input("aktiv", sql.Bit, aktiv) //booleanværdi er true(1)=aktiv, false(0)=inaktiv
      .query(`
        UPDATE dbo.konto
        SET aktiv = @aktiv
        WHERE kontoID = @ID
      `); //opdaterer aktiv status i databasen
  }

  async function hentPorteføljeIDForBruger(brugerID) {
    const db = await sql.connect(sqlConfig);
    const result = await db.request()
      .input("brugerID", sql.Int, brugerID)
      .query(`SELECT porteføljeID FROM dbo.porteføljer WHERE brugerID = @brugerID`);
  
    return result.recordset[0]?.porteføljeID || null;
  }
  
  

//gør det muligt at eksportere, så de kan bruges i controller
module.exports = {
  hentAlleKonti,
  hentKontoMedID,
  hentTransaktionerForKonto,
  opdaterSaldo,
  gemTransaktion,
  opretNyKonto,
  sætAktivStatus,
  hentPorteføljeIDForBruger
};

