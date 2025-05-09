const sql = require("mssql");
const sqlConfig = require("../sqlConfig/sqlConfig");

async function hentDB(){
    return await sql.connect(sqlConfig);
}

class PortefoljeData {

// Hent alle porteføljer fra databasen
async hentAllePorteføljerForBruger(brugerID) {
    const db = await hentDB();
    const result = await db.request()
      .input("brugerID", sql.Int, brugerID)
      .query(`
        SELECT 
          p.porteføljeID,
          p.navn,
          p.sidsteHandelsDato,
          k.kontonavn
        FROM dbo.porteføljer p
        JOIN dbo.konto k ON p.kontoID = k.kontoID
        WHERE p.brugerID = @brugerID
      `);
  
    return result.recordset;
  }
  

// Hent én portefølje baseret på ID
async hentPorteføljeMedID(porteføljeID) {
    const db = await hentDB();
    const result = await db.request()
      .input("porteføljeID", sql.Int, porteføljeID)
      .query(`
          SELECT porteføljeID, navn, kontoID, oprettelsesDato
          FROM dbo.porteføljer 
          WHERE porteføljeID = @porteføljeID
      `);
  
    return result.recordset[0];
  }
  

// Hent alle værdipapirer, der tilhører en bestemt portefølje
async hentVærdipapirTilPortefølje(porteføljeID) {
    const db = await hentDB();
    const result = await db.request()
      .input("porteføljeID", sql.Int, porteføljeID)
      .query(`
        SELECT 
          værdipapirID AS id, 
          navn, 
          tickerSymbol, 
          type, 
          antal, 
          pris, 
          datoKøbt,
          GAK, 
          urealiseretPorteføljeGevinstTab
        FROM dbo.værdipapir
        WHERE porteføljeID = @porteføljeID AND antal > 0
      `);
  
    return result.recordset;
  }

// Hent samlet værdi for alle porteføljer ud fra værdipapirer
async hentSamletVærdiForAllePorteføljer() {
  const db = await hentDB();
  const result = await db.request().query(`
    SELECT porteføljeID, SUM(forventetVærdi) AS samletVærdi
    FROM dbo.værdipapir
    GROUP BY porteføljeID
  `);
  return result.recordset;
}

// Opret en ny portefølje i databasen
async opretNyPortefølje(data) {
    const db = await hentDB();
    await db.request()
  .input("navn", sql.NVarChar, data.navn)
  .input("kontoID", sql.Int, data.kontoID)
  .input("brugerID", sql.Int, data.brugerID) // VIGTIGT!
  .input("oprettelsesDato", sql.Date, new Date())
  .query(`
    INSERT INTO dbo.porteføljer (navn, kontoID, brugerID, oprettelsesDato)
    VALUES (@navn, @kontoID, @brugerID, @oprettelsesDato)
  `);
  }
  

// Hent alle transaktioner for et portefølje
async hentTransaktionerForPortefølje(porteføljeID) {
    const db = await hentDB();
    const result = await db.request()
      .input("id", sql.Int, porteføljeID)
      .query(`
        SELECT t.*, k.kontonavn
        FROM dbo.transaktioner t
        JOIN dbo.konto k ON t.kontoID = k.kontoID
        WHERE t.porteføljeID = @id
          AND t.transaktionstype IN ('køb', 'salg')
        ORDER BY t.tidspunkt DESC
      `);
  
    return result.recordset;
  }  

  async tilføjVærdipapirTilPortefølje(data) {
    const db = await hentDB();
    await db.request()
      .input("porteføljeID", sql.Int, data.porteføljeID)
      .input("navn", sql.NVarChar, data.navn)
      .input("tickerSymbol", sql.NVarChar, data.symbol)
      .input("pris", sql.Decimal(18, 2), data.pris)
      .input("antal", sql.Int, data.antal)
      .query(`
        INSERT INTO dbo.værdipapir (porteføljeID, navn, tickerSymbol, pris, antal)
        VALUES (@porteføljeID, @navn, @tickerSymbol, @pris, @antal)
      `);
  }
  
  // Tilføj ny handel til transaktioner
 // Denne funktion bruges til at købe eller sælge værdipapirer
 async registrerHandel(data) {
    const db = await hentDB();

    data.antal = parseInt(data.antal);

    // Fast gebyr-regel
    if (data.type === "salg") {
        data.gebyr = 19;
    } else {
        data.gebyr = 0;
    }
  
    //console.log("Handelsdata:", data);
  
    // 1. Hent saldo
    const result = await db.request()
      .input("kontoID", sql.Int, data.kontoID)
      .query("SELECT saldo FROM dbo.konto WHERE kontoID = @kontoID");
  
    const pengePåKonto = result.recordset[0]?.saldo;
    if (pengePåKonto == null) throw new Error("Der er ikke penge på den valgte konto.");
  
    const prisMedGebyr = data.type === "salg"
    ? data.pris - data.gebyr
    : data.pris + data.gebyr;

  
    // 2. Valider køb
    if (data.type === "køb" && pengePåKonto < prisMedGebyr) {
      throw new Error("Du har ikke nok penge til at købe.");
    }
  
    // 3. Valider og håndter salg
    if (data.type === "salg") {
      const eksisterende = await db.request()
        .input("porteføljeID", sql.Int, data.porteføljeID)
        .input("ticker", sql.NVarChar, data.tickerSymbol)
        .query(`
          SELECT antal FROM dbo.værdipapir
          WHERE porteføljeID = @porteføljeID AND tickerSymbol = @ticker
        `);
  
      const antalEjet = eksisterende.recordset[0]?.antal;
      if (antalEjet == null) throw new Error("Du ejer ikke dette værdipapir.");
      if (antalEjet < data.antal) throw new Error("Du forsøger at sælge flere aktier end du ejer.");
  
      // Træk fra beholdning
      await db.request()
        .input("porteføljeID", sql.Int, data.porteføljeID)
        .input("ticker", sql.NVarChar, data.tickerSymbol)
        .input("antal", sql.Int, data.antal)
        .query(`
          UPDATE dbo.værdipapir
          SET antal = antal - @antal
          WHERE porteføljeID = @porteføljeID AND tickerSymbol = @ticker
        `);
  
      // Beregn og opdater gevinst/tab FØR sletning
      const gevinstResult = await db.request()
        .input("porteføljeID", sql.Int, data.porteføljeID)
        .input("ticker", sql.NVarChar, data.tickerSymbol)
        .query(`
          SELECT antal, GAK FROM dbo.værdipapir
          WHERE porteføljeID = @porteføljeID AND tickerSymbol = @ticker
        `);
  
      const { antal, GAK } = gevinstResult.recordset[0] || {};
      if (!isNaN(antal) && !isNaN(GAK)) {
        const gevinst = (antal * data.pris) - (antal * GAK);
        await db.request()
          .input("gevinst", sql.Decimal(18, 2), gevinst)
          .input("porteføljeID", sql.Int, data.porteføljeID)
          .input("ticker", sql.NVarChar, data.tickerSymbol)
          .query(`
            UPDATE dbo.værdipapir
            SET urealiseretPorteføljeGevinstTab = @gevinst
            WHERE porteføljeID = @porteføljeID AND tickerSymbol = @ticker
          `);
      }
  
      // Slet værdipapir hvis antal = 0
      if (antal === 0) {
        await db.request()
          .input("porteføljeID", sql.Int, data.porteføljeID)
          .input("ticker", sql.NVarChar, data.tickerSymbol)
          .query(`
            DELETE FROM dbo.værdipapir
            WHERE porteføljeID = @porteføljeID AND tickerSymbol = @ticker
          `);
      }
    }
  
    // 4. Opdater saldo
    const nySaldo = data.type === "køb"
      ? pengePåKonto - prisMedGebyr
      : pengePåKonto + prisMedGebyr;
  
    await db.request()
      .input("kontoID", sql.Int, data.kontoID)
      .input("saldo", sql.Decimal(18, 2), nySaldo)
      .query("UPDATE dbo.konto SET saldo = @saldo WHERE kontoID = @kontoID");
  
    // 5. Registrer transaktion
    const sælgerID = (data.type === 'salg' || data.type === 'hæv') ? data.kontoID : null;
    const modtagerID = (data.type === 'køb' || data.type === 'indsæt') ? data.kontoID : null;

    await db.request()
    .input("porteføljeID", sql.Int, data.porteføljeID)
    .input("kontoID", sql.Int, data.kontoID)
    .input("type", sql.NVarChar, data.type)
    .input("pris", sql.Decimal(18, 2), data.pris)
    .input("gebyr", sql.Decimal(18, 2), data.gebyr || 0)
    .input("dato", sql.Date, new Date())
    .input("tid", sql.DateTime, new Date())
    .input("antal", sql.Int, data.antal)
    .input("ticker", sql.NVarChar, data.tickerSymbol)
    .input("værditype", sql.NVarChar, data.værditype)
    .input("sælgerKontoID", sql.Int, sælgerID)
    .input("modtagerKontoID", sql.Int, modtagerID)
    .query(`
        INSERT INTO dbo.transaktioner
        (porteføljeID, kontoID, transaktionstype, pris, gebyr, dato, tidspunkt, antal, sælgerKontoID, modtagerKontoID, tickerSymbol, værditype)
        VALUES (@porteføljeID, @kontoID, @type, @pris, @gebyr, @dato, @tid, @antal, @sælgerKontoID, @modtagerKontoID, @ticker, @værditype)
    `);

  
    // 6. Ved køb: indsæt eller opdater værdipapir
    if (data.type === "køb") {
      const eksisterendePapir = await db.request()
        .input("porteføljeID", sql.Int, data.porteføljeID)
        .input("ticker", sql.NVarChar, data.tickerSymbol)
        .query(`
          SELECT værdipapirID FROM dbo.værdipapir
          WHERE porteføljeID = @porteføljeID AND tickerSymbol = @ticker
        `);
  
      if (eksisterendePapir.recordset.length === 0) {
        await db.request()
          .input("porteføljeID", sql.Int, data.porteføljeID)
          .input("navn", sql.NVarChar, data.navn)
          .input("symbol", sql.NVarChar, data.tickerSymbol)
          .input("pris", sql.Decimal(18, 2), data.pris)
          .input("antal", sql.Int, data.antal)
          .input("type", sql.NVarChar, data.værditype)
          .input("dato", sql.Date, new Date())
          .query(`
            INSERT INTO dbo.værdipapir
            (porteføljeID, navn, tickerSymbol, pris, antal, type, datoKøbt)
            VALUES (@porteføljeID, @navn, @symbol, @pris, @antal, @type, @dato)
          `);
      } else {
        await db.request()
          .input("porteføljeID", sql.Int, data.porteføljeID)
          .input("ticker", sql.NVarChar, data.tickerSymbol)
          .input("antal", sql.Int, data.antal)
          .input("pris", sql.Decimal(18, 2), data.pris)
          .input("dato", sql.Date, new Date())
          .query(`
            UPDATE dbo.værdipapir
            SET antal = antal + @antal,
                pris = @pris,
                datoKøbt = @dato
            WHERE porteføljeID = @porteføljeID AND tickerSymbol = @ticker
          `);
      }
  
      // 7. Genberegn og opdater GAK
      const gakResult = await db.request()
        .input("porteføljeID", sql.Int, data.porteføljeID)
        .input("ticker", sql.NVarChar, data.tickerSymbol)
        .query(`
          SELECT 
            CAST(SUM(pris * antal) AS FLOAT) / SUM(antal) AS GAK
            FROM dbo.transaktioner
            WHERE porteføljeID = @porteføljeID
            AND tickerSymbol = @ticker
            AND transaktionstype = 'køb'
        `);
  
      const nyGAK = gakResult.recordset[0]?.GAK;
      if (nyGAK !== null && nyGAK !== undefined) {
        await db.request()
          .input("GAK", sql.Decimal(18, 2), nyGAK)
          .input("porteføljeID", sql.Int, data.porteføljeID)
          .input("ticker", sql.NVarChar, data.tickerSymbol)
          .query(`
            UPDATE dbo.værdipapir
            SET GAK = @GAK
            WHERE porteføljeID = @porteføljeID AND tickerSymbol = @ticker
          `);
      }
  
      // 8. Opdater urealiseret gevinst/tab ved køb
      const gevinstResult = await db.request()
        .input("porteføljeID", sql.Int, data.porteføljeID)
        .input("ticker", sql.NVarChar, data.tickerSymbol)
        .query(`
          SELECT antal, GAK FROM dbo.værdipapir
          WHERE porteføljeID = @porteføljeID AND tickerSymbol = @ticker
        `);
  
      const { antal, GAK } = gevinstResult.recordset[0] || {};
      if (!isNaN(antal) && !isNaN(GAK)) {
        const gevinst = (antal * data.pris) - (antal * GAK);
        await db.request()
          .input("gevinst", sql.Decimal(18, 2), gevinst)
          .input("porteføljeID", sql.Int, data.porteføljeID)
          .input("ticker", sql.NVarChar, data.tickerSymbol)
          .query(`
            UPDATE dbo.værdipapir
            SET urealiseretPorteføljeGevinstTab = @gevinst
            WHERE porteføljeID = @porteføljeID AND tickerSymbol = @ticker
          `);
      }
    }
  }
  
  // Hent alle konti for en bestemt bruger
async hentKontiForBruger(brugerID) {
    const db = await hentDB();
    const result = await db.request()
      .input("brugerID", sql.Int, brugerID)
      .query(`
        SELECT * FROM dbo.konto WHERE brugerID = @brugerID
      `);
  
    return result.recordset;
  }
  
  async hentVærdipapirMedID(id) {
    const db = await sql.connect(sqlConfig);
    const result = await db.request()
      .input("id", sql.Int, id)
      .query(`SELECT 
        værdipapirID,
        porteføljeID, 
        navn, 
        tickerSymbol, 
        type, antal, 
        pris, 
        GAK, 
        urealiseretPorteføljeGevinstTab
        FROM dbo.værdipapir
        WHERE værdipapirID = @id`);
  
    return result.recordset[0];
  }
  
  async hentVærdiHistorik(porteføljeID) {
    const db = await hentDB();
    const result = await db.request()
      .input("porteføljeID", sql.Int, porteføljeID)
      .query(`
        SELECT 
          CONVERT(date, datoKøbt) as dato,
          SUM(urealiseretPorteføljeGevinstTab) as værdi
        FROM dbo.værdipapir
        WHERE porteføljeID = @porteføljeID
        GROUP BY CONVERT(date, datoKøbt)
        ORDER BY dato
      `);
    return result.recordset;
  }
  
  async opdaterSidsteHandelsDato(porteføljeID) {
    const db = await hentDB();
    await db.request()
      .input("porteføljeID", sql.Int, porteføljeID)
      .input("dato", sql.Date, new Date())
      .query(`
        UPDATE dbo.porteføljer
        SET sidsteHandelsDato = @dato
        WHERE porteføljeID = @porteføljeID
      `);
  }
  
  async hentOgOpdaterVærdipapirMedAktuelVærdi(værdipapirID) {
    const db = await hentDB();
  
    const værdipapir = await db.request()
      .input("værdipapirID", sql.Int, værdipapirID)
      .query(`
        SELECT 
          værdipapirID,
          porteføljeID, 
          navn, 
          tickerSymbol, 
          type, 
          antal, 
          pris, 
          GAK, 
          urealiseretPorteføljeGevinstTab
        FROM dbo.værdipapir
        WHERE værdipapirID = @værdipapirID
      `).then(res => res.recordset[0]);
  
    if (!værdipapir) return null;
  
    const symbol = værdipapir.tickerSymbol;
    const prisLink = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${process.env.API_KEY}`;
    const prisSvar = await fetch(prisLink);
    const prisData = await prisSvar.json();
    const aktuelPris = parseFloat(prisData["Global Quote"]?.["05. price"]);
  
    const antal = parseFloat(værdipapir.antal);
    const GAK = parseFloat(værdipapir.GAK);
    
  
    if (!isNaN(aktuelPris) && !isNaN(GAK) && !isNaN(antal)) {
      const gevinst = (aktuelPris - GAK) * antal;
  
      // Kun opdater gevinst og pris i databasen
      await db.request()
        .input("gevinst", sql.Decimal(18, 2), gevinst)
        .input("pris", sql.Decimal(18, 2), aktuelPris)
        .input("værdipapirID", sql.Int, værdipapirID)
        .query(`
          UPDATE dbo.værdipapir
          SET urealiseretPorteføljeGevinstTab = @gevinst,
              pris = @pris
          WHERE værdipapirID = @værdipapirID
        `);
  
      // Tilføj dynamiske egenskaber
      værdipapir.aktuelPris = aktuelPris;
      værdipapir.forventetVærdi = aktuelPris * antal;
      værdipapir.urealiseretPorteføljeGevinstTab = gevinst;
      console.log("▶️ Aktuel pris:", aktuelPris);
        console.log("▶️ Antal:", antal);

    }
  
    return værdipapir;
  }
  
  
  async hentHistorikForVærdipapir(værdipapirID) {
    const db = await hentDB();
  
    const meta = await db.request()
      .input("værdipapirID", sql.Int, værdipapirID)
      .query(`SELECT porteføljeID, tickerSymbol FROM dbo.værdipapir WHERE værdipapirID = @værdipapirID`);
  
    if (!meta.recordset[0]) return [];
  
    const { porteføljeID, tickerSymbol } = meta.recordset[0];
  
    const result = await db.request()
      .input("porteføljeID", sql.Int, porteføljeID)
      .input("ticker", sql.NVarChar, tickerSymbol)
      .query(`
        SELECT 
          CONVERT(date, dato) AS dato,
          SUM(antal * pris) AS værdi
        FROM dbo.transaktioner
        WHERE tickerSymbol = @ticker
          AND porteføljeID = @porteføljeID
          AND transaktionstype = 'køb'
          AND dato >= DATEADD(year, -1, GETDATE())
        GROUP BY CONVERT(date, dato)
        ORDER BY dato
      `);
  
    return result.recordset;
  }
  
  async hentTotalRealiseretGevinst(brugerID) {
    const db = await hentDB();
    const result = await db.request()
      .input("brugerID", sql.Int, brugerID)
      .query(`
        SELECT 
          SUM(CASE WHEN t.transaktionstype = 'salg' THEN (t.pris - t.gebyr) ELSE 0 END) AS totalSalg,
          SUM(CASE WHEN t.transaktionstype = 'køb' THEN (t.pris + t.gebyr) ELSE 0 END) AS totalKøb
        FROM dbo.transaktioner t
        JOIN dbo.porteføljer p ON t.porteføljeID = p.porteføljeID
        WHERE p.brugerID = @brugerID
      `);
  
    const { totalSalg, totalKøb } = result.recordset[0];
    return (totalSalg || 0) - (totalKøb || 0);
  }
}

module.exports = new PortefoljeData();
