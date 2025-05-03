const sql = require("mssql");
const sqlConfig = require("../sqlConfig/sqlConfig");

// Hent alle porteføljer fra databasen
async function hentAllePortefoljer() {
  const db = await sql.connect(sqlConfig);
  const result = await db.request().query(`
    SELECT * FROM eksamenSQL.porteføljer
  `);

  return result.recordset;
}

// Hent én portefølje baseret på ID
async function hentPortefoljeMedID(id) {
  const db = await sql.connect(sqlConfig);
  const result = await db.request()
    .input("id", sql.Int, id)
    .query(`
      SELECT * FROM eksamenSQL.porteføljer
      WHERE porteføljeID = @id
    `);

  return result.recordset[0];
}

// Hent alle værdipapirer, der tilhører en bestemt portefølje
async function hentVærdipapirerTilPortefølje(porteføljeID) {
  const db = await sql.connect(sqlConfig);
  const result = await db.request()
    .input("porteføljeID", sql.Int, porteføljeID)
    .query(`
      SELECT navn, tickerSymbol, type, antal, pris, forventetVærdi, GAK, urealiseretPorteføljeGevinstTab
      FROM eksamenSQL.værdipapir
      WHERE porteføljeID = @porteføljeID
    `);

  return result.recordset;
}

// Hent samlet værdi for alle porteføljer ud fra værdipapirer
async function hentSamletVærdiForAllePorteføljer() {
  const db = await sql.connect(sqlConfig);
  const result = await db.request().query(`
    SELECT porteføljeID, SUM(forventetVærdi) AS samletVærdi
    FROM eksamenSQL.værdipapir
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
    .input("forventetVærdi", sql.Decimal(18, 2), data.forventetVærdi)
    .input("værdipapirNavn", sql.NVarChar, "Ingen endnu")
    .query(`
      INSERT INTO eksamenSQL.porteføljer
      (navn, kontotilknytning, forventetVærdi, værdipapirNavn)
      VALUES (@navn, @kontotilknytning, @forventetVærdi, @værdipapirNavn)
    `);
}

// Hent alle transaktioner for et portefølje
async function hentTransaktionerForPortefølje(porteføljeID) {
    const db = await sql.connect(sqlConfig);
    const result = await db.request()
      .input("id", sql.Int, porteføljeID)
      .query(`
        SELECT * FROM eksamenSQL.transaktioner 
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
        INSERT INTO eksamenSQL.værdipapir (porteføljeID, navn, tickerSymbol, pris, antal)
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
      .query("SELECT saldo FROM eksamenSQL.konto WHERE kontoID = @kontoID");
  
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
      .query("UPDATE eksamenSQL.konto SET saldo = @saldo WHERE kontoID = @kontoID");
  
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
      .input("tickerSymbol", sql.NVarChar, data.tickerSymbol)
      .query(`
        INSERT INTO eksamenSQL.transaktioner
        (porteføljeID, kontoID, transaktionstype, pris, gebyr, dato, tidspunkt, antal, tickerSymbol, sælgerKontoID, modtagerKontoID)
        VALUES (@porteføljeID, @kontoID, @type, @pris, @gebyr, @dato, @tid, @antal,@tickerSymbol, NULL, NULL)
      `);
  
    // 6. Hvis det er et køb, så læg værdipapiret ind i porteføljen
    if (data.type === "køb") {
      await db.request()
        .input("porteføljeID", sql.Int, data.porteføljeID)
        .input("navn", sql.NVarChar, data.navn)
        .input("symbol", sql.NVarChar, data.tickerSymbol)
        .input("pris", sql.Decimal(18, 2), data.pris)
        .input("antal", sql.Int, data.antal)
        .input("type", sql.NVarChar, data.værditype)
        .input("dato", sql.Date, new Date())
        .query(`
          INSERT INTO eksamenSQL.værdipapir
          (porteføljeID, navn, tickerSymbol, pris, antal, type, datoKøbt)
          VALUES (@porteføljeID, @navn, @symbol, @pris, @antal, @type, @dato)
        `);
    }
  }
  
  // Hent alle konti for en bestemt bruger
async function hentKontiForBruger(brugerID) {
    const db = await sql.connect(sqlConfig);
    const result = await db.request()
      .input("brugerID", sql.Int, brugerID)
      .query(`
        SELECT * FROM eksamenSQL.konto WHERE brugerID = @brugerID
      `);
  
    return result.recordset;
  }
  
  //henter GAK
  async function hentGAK(porteføljeID, symbol) {
    const db = await sql.connect(sqlConfig);
    const result = await db.request()
      .input("id", sql.Int, porteføljeID)
      .input("symbol", sql.NVarChar, symbol)
      .query(`
        SELECT pris, antal
        FROM eksamenSQL.transaktioner
        WHERE porteføljeID = @id
          AND transaktionstype = 'køb'
          AND tickerSymbol = @symbol
      `);
  
    const handler = result.recordset;
  
    let totalPris = 0;
    let totalAntal = 0;
  
    handler.forEach(h => {
      totalPris += h.pris * h.antal;
      totalAntal += h.antal;
    });
  
    const gak = totalAntal > 0 ? (totalPris / totalAntal) : null;
    return gak;
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
    hentGAK
  };
  