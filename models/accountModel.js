const sql = require("mssql");
const sqlConfig = require("../sqlConfig/sqlConfig");

// Hent alle konti fra databasen
async function hentAlleKonti() {
  const db = await sql.connect(sqlConfig);
  const result = await db.request().query(`
    SELECT * FROM eksamenSQL.konto
  `);

  return result.recordset; // returnér listen af konti
}

// Hent én konto ud fra ID
async function hentKontoMedID(kontoID) {
  const db = await sql.connect(sqlConfig);
  const result = await db.request()
    .input("id", sql.Int, kontoID)
    .query(`
      SELECT * FROM eksamenSQL.konto WHERE kontoID = @id
    `);

  return result.recordset[0]; // returnér selve kontoen
}

// Hent alle transaktioner for én konto
async function hentTransaktionerForKonto(kontoID) {
  const db = await sql.connect(sqlConfig);
  const result = await db.request()
    .input("id", sql.Int, kontoID)
    .query(`
      SELECT * FROM eksamenSQL.transaktioner 
      WHERE sælgerKontoID = @id OR modtagerKontoID = @id
    `);

  return result.recordset;
}

// Læg penge til eller træk penge fra saldoen
async function opdaterSaldo(kontoID, beløb) {
  const db = await sql.connect(sqlConfig);
  await db.request()
    .input("id", sql.Int, kontoID)
    .input("beløb", sql.Decimal(18, 2), beløb)
    .query(`
      UPDATE eksamenSQL.konto 
      SET saldo = saldo + @beløb 
      WHERE kontoID = @id
    `);
}

// Gem en ny transaktion i databasen
async function gemTransaktion(data) {
  const db = await sql.connect(sqlConfig);
  const nu = new Date();

  await db.request()
    .input("sælgerID", sql.Int, data.type === "Hæv" ? data.kontoID : null)
    .input("modtagerID", sql.Int, data.type === "Indsæt" ? data.kontoID : null)
    .input("type", sql.VarChar(20), data.type)
    .input("dato", sql.Date, nu)
    .input("tid", sql.Time, nu)
    .input("valuta", sql.VarChar(10), data.valuta || "DKK")
    .input("beløb", sql.Decimal(18, 2), data.beløb)
    .input("gebyr", sql.Int, 0)
    .query(`
      INSERT INTO eksamenSQL.transaktioner
      (sælgerKontoID, modtagerKontoID, transaktionstype, dato, tidspunkt, værditype, pris, gebyr)
      VALUES (@sælgerID, @modtagerID, @type, @dato, @tid, @valuta, @beløb, @gebyr)
    `);
}

// Opret en ny konto
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
      `);
  
    return result.recordset?.[0]?.kontoID;
  }
  
  

async function sætAktivStatus(kontoID, aktiv) {
    const db = await sql.connect(sqlConfig);
    await db.request()
      .input("id", sql.Int, kontoID)
      .input("aktiv", sql.Bit, aktiv)
      .query(`
        UPDATE eksamenSQL.konto
        SET aktiv = @aktiv
        WHERE kontoID = @id
      `);
  }
  

// Gør funktionerne synlige for controlleren
module.exports = {
  hentAlleKonti,
  hentKontoMedID,
  hentTransaktionerForKonto,
  opdaterSaldo,
  gemTransaktion,
  opretNyKonto,
  sætAktivStatus
};

