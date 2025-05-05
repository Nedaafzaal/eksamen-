const sql = require("mssql");
const sqlConfig = require("../sqlConfig/sqlConfig");

// Hent alle porteføljer fra databasen
async function hentAllePortefoljer() {
  const db = await sql.connect(sqlConfig);
  const result = await db.request().query(`
    SELECT * FROM dbo.porteføljer
  `);

  return result.recordset;
}

// Hent én portefølje baseret på ID
async function hentPortefoljeMedID(ID) {
  const db = await sql.connect(sqlConfig);
  const result = await db.request()
    .input("porteføljeID", sql.Int, ID)
    .query(`
        SELECT porteføljeID, navn, oprettelsesDato 
        FROM dbo.porteføljer 
        WHERE porteføljeID = @porteføljeID
    `);
      

  return result.recordset[0];
}

// Hent alle værdipapirer, der tilhører en bestemt portefølje
async function hentVærdipapirerTilPortefølje(porteføljeID) {
    const db = await sql.connect(sqlConfig);
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
          forventetVærdi, 
          datoKøbt,
          GAK, 
          urealiseretPorteføljeGevinstTab
        FROM dbo.værdipapir
        WHERE porteføljeID = @porteføljeID
      `);
  
    return result.recordset;
  }  

// Hent samlet værdi for alle porteføljer ud fra værdipapirer
async function hentSamletVærdiForAllePorteføljer() {
  const db = await sql.connect(sqlConfig);
  const result = await db.request().query(`
    SELECT porteføljeID, SUM(forventetVærdi) AS samletVærdi
    FROM dbo.værdipapir
    GROUP BY porteføljeID
  `);
  return result.recordset;
}

// Opret en ny portefølje i databasen
async function opretNyPortefolje(data) {
    const db = await sql.connect(sqlConfig);
    await db.request()
      .input("navn", sql.NVarChar, data.navn)
      .input("kontotilknytning", sql.NVarChar, data.kontotilknytning)
      .input("brugerID", sql.Int, data.brugerID)
      .input("oprettelsesDato", sql.Date, new Date())
      .query(`
        INSERT INTO dbo.porteføljer (navn, kontotilknytning, brugerID, oprettelsesDato)
        VALUES (@navn, @kontotilknytning, @brugerID, @oprettelsesDato)
      `);
  }
  

// Hent alle transaktioner for et portefølje
async function hentTransaktionerForPortefølje(porteføljeID) {
    const db = await sql.connect(sqlConfig);
    const result = await db.request()
      .input("id", sql.Int, porteføljeID)
      .query(`
        SELECT * FROM dbo.transaktioner 
        WHERE porteføljeID = @id
          AND transaktionstype IN ('køb', 'salg')
      `);
  
    return result.recordset;
  }

  async function tilføjVærdipapirTilPortefølje(data) {
    const db = await sql.connect(sqlConfig);
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
async function registrerHandel(data) {
    const db = await sql.connect(sqlConfig);

    console.log(data);
  
    // 1. Find ud af hvor mange penge der er på kontoen
    const result = await db.request()
      .input("kontoID", sql.Int, data.kontoID)
      .query("SELECT saldo FROM dbo.konto WHERE kontoID = @kontoID");
  
    const pengePåKonto = result.recordset[0]?.saldo;
    console.log("Saldo:", pengePåKonto);

  
    if (pengePåKonto == null) {
      throw new Error("Der er ikke nok penge på konto.");
    }
  
    const prisMedGebyr = data.pris + (data.gebyr || 0);
  
    // 2. Tjek om vi har penge nok til at købe
    if (pengePåKonto < prisMedGebyr) {
      throw new Error("Du har ikke nok penge til at købe.");
    }
  
    // 3. Regn ud hvor mange penge der er tilbage
    const nySaldo = data.type === "køb"
      ? pengePåKonto - prisMedGebyr
      : pengePåKonto + prisMedGebyr;
  
    // 4. Gem den nye saldo
    await db.request()
      .input("kontoID", sql.Int, data.kontoID)
      .input("saldo", sql.Decimal(18, 2), nySaldo)
      .query("UPDATE dbo.konto SET saldo = @saldo WHERE kontoID = @kontoID");
  
    // 5. Gem handlen i transaktionstabellen
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
      .query(`
        INSERT INTO dbo.transaktioner
        (porteføljeID, kontoID, transaktionstype, pris, gebyr, dato, tidspunkt, antal, sælgerKontoID, modtagerKontoID, tickerSymbol, værditype)
        VALUES (@porteføljeID, @kontoID, @type, @pris, @gebyr, @dato, @tid, @antal, NULL, NULL, @ticker, @værditype)
      `);
  
    // 6. Hvis det er et køb, så læg værdipapiret ind i porteføljen
    if (data.type === "køb") {
      // Tjek om værdipapiret allerede findes
      const eksisterendePapir = await db.request()
        .input("porteføljeID", sql.Int, data.porteføljeID)
        .input("ticker", sql.NVarChar, data.tickerSymbol)
        .query(`
          SELECT værdipapirID FROM dbo.værdipapir
          WHERE porteføljeID = @porteføljeID AND tickerSymbol = @ticker
        `);
    
      if (eksisterendePapir.recordset.length === 0) {
        // Papiret findes ikke – indsæt nyt
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
        // Papiret findes – opdater antal og pris
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
    
      // 7. Beregn og opdater GAK i værdipapir-tabellen
      const result = await db.request()
        .input("porteføljeID", sql.Int, data.porteføljeID)
        .input("ticker", sql.NVarChar, data.tickerSymbol)
        .query(`
          SELECT AVG(pris) AS GAK
          FROM dbo.transaktioner
          WHERE porteføljeID = @porteføljeID
            AND tickerSymbol = @ticker
            AND transaktionstype = 'køb'
        `);
    
      const nyGAK = result.recordset[0]?.GAK;
    
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

          // 8. Beregn og opdater urealiseret gevinst/tab
      const aktuelPris = data.pris;
      const result2 = await db.request()
        .input("porteføljeID", sql.Int, data.porteføljeID)
        .input("ticker", sql.NVarChar, data.tickerSymbol)
        .query(`
          SELECT antal, GAK FROM dbo.værdipapir
          WHERE porteføljeID = @porteføljeID AND tickerSymbol = @ticker
        `);

      const { antal, GAK } = result2.recordset[0] || {};

      if (!isNaN(antal) && !isNaN(GAK)) {
        const gevinst = (antal * aktuelPris) - (antal * GAK);

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
    
    }
  
  // Hent alle konti for en bestemt bruger
async function hentKontiForBruger(brugerID) {
    const db = await sql.connect(sqlConfig);
    const result = await db.request()
      .input("brugerID", sql.Int, brugerID)
      .query(`
        SELECT * FROM dbo.konto WHERE brugerID = @brugerID
      `);
  
    return result.recordset;
  }
  
  async function hentVærdipapirMedID(id) {
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
  

  async function hentVærdiHistorik(porteføljeID) {
    const db = await sql.connect(sqlConfig);
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
  
  async function opdaterSidsteHandelsDato(porteføljeID) {
    const db = await sql.connect(sqlConfig);
    await db.request()
      .input("porteføljeID", sql.Int, porteføljeID)
      .input("dato", sql.Date, new Date())
      .query(`
        UPDATE dbo.porteføljer
        SET sidsteHandelsDato = @dato
        WHERE porteføljeID = @porteføljeID
      `);
  }
  

  module.exports = {
    hentAllePortefoljer,
    hentPortefoljeMedID,
    hentVærdipapirerTilPortefølje,
    hentSamletVærdiForAllePorteføljer,
    opretNyPortefolje,
    hentTransaktionerForPortefølje,
    tilføjVærdipapirTilPortefølje,
    registrerHandel,
    hentKontiForBruger,
    hentVærdipapirMedID,
    hentVærdiHistorik,
    opdaterSidsteHandelsDato
  };
  