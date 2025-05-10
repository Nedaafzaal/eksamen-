const sql = require("mssql");
const sqlConfig = require("../sqlConfig/sqlConfig");

async function hentDB(){
    return await sql.connect(sqlConfig);
}

//laver en klasse PortefoljeData
class PortefoljeData {

  //metode som henter alle porteføljer for brugeren, ved at join portefølje med konto tabel via kontoID
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
        WHERE k.brugerID = @brugerID
      `);
  
    return result.recordset;
  }

  //metode som henter portefølje med ID
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

  //metode som henter alle værdipapirer og deres informationer, der tilhører en bestemt portefølje
  async hentVærdipapirTilPortefølje(porteføljeID) {
    const db = await hentDB();
    const result = await db.request()
      .input("porteføljeID", sql.Int, porteføljeID)
      .query(`
        SELECT værdipapirID AS id, navn, tickerSymbol, type, antal, pris, datoKøbt, GAK,  urealiseretPorteføljeGevinstTab
        FROM dbo.værdipapir
        WHERE porteføljeID = @porteføljeID AND antal > 0
      `);
  
    return result.recordset;
  }

  //metode som henter samlet værdi for alle porteføljer, ved at tage summen af hvert porteføljes forventet værdi = samlet værdi, som grupperes efter porteføljeID
  async hentSamletVærdiForAllePorteføljer() {
    const db = await hentDB();
    const result = await db.request().query(`
      SELECT porteføljeID, SUM(forventetVærdi) AS samletVærdi
      FROM dbo.værdipapir
      GROUP BY porteføljeID
    `);
    return result.recordset;
  }

  //metode osm opretter ny portefølje
  async opretNyPortefølje(data) {
    const db = await hentDB();
    await db.request()
      .input("navn", sql.NVarChar, data.navn)
      .input("kontoID", sql.Int, data.kontoID)
      .input("oprettelsesDato", sql.Date, new Date())
      .query(`
        INSERT INTO dbo.porteføljer (navn, kontoID, oprettelsesDato)
        VALUES (@navn, @kontoID, @oprettelsesDato)
      `);
  }

  //metode der henter alle køb- og salgstransaktioner for brugerens portefølje, ved at joine konto tabellen med transaktionstabellen, således vi kan få fat i det kontoID, som porteføljet er tilknyttet til. Dette skal sorteres fra størst til mindst
  async hentTransaktionerForPortefølje(porteføljeID) {
    const db = await hentDB();
    const result = await db.request()
      .input("porteføljeID", sql.Int, porteføljeID)
      .query(`
        SELECT t.*, k.kontonavn
        FROM dbo.transaktioner t
        JOIN dbo.konto k ON t.kontoID = k.kontoID
        WHERE t.porteføljeID = @porteføljeID
          AND t.transaktionstype IN ('køb', 'salg')
        ORDER BY t.tidspunkt DESC
      `);
  
    return result.recordset; //returnerer listen af transaktioner for givet portefølje
  }

  //metode der tilføjer værdipapirer til portefølje 
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
  

 //metode som registrerer handlen
 async registrerHandel(data) {
    const db = await hentDB();

    data.antal = parseInt(data.antal);

    if (data.type === "salg") { //hvis der er tale om salg af værdipapir, hardcoder vi gebyr til 19 kr. 
        data.gebyr = 19;
    } else { //hvis køb, ingen gebyr
        data.gebyr = 0;
    }
  
    //henter saldo for den konto, der ønskes at handle på
    const result = await db.request()
      .input("kontoID", sql.Int, data.kontoID)
      .query("SELECT saldo FROM dbo.konto WHERE kontoID = @kontoID");
    
    const pengePåSaldo = result.recordset[0].saldo;
    if (pengePåSaldo == null) throw new Error("Der er ikke penge på den valgte konto.");
    
    //hvis transaktionstypen = salg, skal gebyr trækkes fra. Hvis ikke - og der dermed er tale om køb - er der ingen gebyr. 
    const prisMedGebyr = data.type === "salg"
    ? data.pris - data.gebyr
    : data.pris;

    if (data.type === "køb" && pengePåSaldo < prisMedGebyr) {
      throw new Error("Du har ikke nok penge til at købe.");
    }
  
    //tjekker om porteføljen ejer det værdipapir, der prøves at sælges
    if (data.type === "salg") {
      const beholdning = await db.request()
        .input("porteføljeID", sql.Int, data.porteføljeID)
        .input("ticker", sql.NVarChar, data.tickerSymbol)
        .query(`
          SELECT antal FROM dbo.værdipapir
          WHERE porteføljeID = @porteføljeID AND tickerSymbol = @ticker
        `);
  
      const antalEjet = beholdning.recordset[0].antal;

      if (antalEjet == null) throw new Error("Du ejer ikke dette værdipapir.");
      if (antalEjet < data.antal) throw new Error("Du forsøger at sælge flere aktier end du ejer.");
  
      //opdaterer beholdning efter salget er gået igennem
      await db.request()
        .input("porteføljeID", sql.Int, data.porteføljeID)
        .input("ticker", sql.NVarChar, data.tickerSymbol)
        .input("antal", sql.Int, data.antal)
        .query(`
          UPDATE dbo.værdipapir
          SET antal = antal - @antal
          WHERE porteføljeID = @porteføljeID AND tickerSymbol = @ticker
        `);
  
      //beregning og opdatering af gevinst eller tab
      const gevinstResult = await db.request()
        .input("porteføljeID", sql.Int, data.porteføljeID)
        .input("ticker", sql.NVarChar, data.tickerSymbol)
        .query(`
          SELECT antal, GAK FROM dbo.værdipapir
          WHERE porteføljeID = @porteføljeID AND tickerSymbol = @ticker
        `);
        
        //henter antal og GAK fra første række vores database giver 
        const række = gevinstResult.recordset[0] || {};
        const antal = række.antal;
        const GAK = række.GAK;
        
    //hvis antal og GAK er et tal, skal gevinst bestemmes og værdipapirer skal opdateres med den nye gevinst
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
  
      //hvis alle værdipapirer sælges og antal=0, skal den slettes fra portefølje
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
    
    //udregner saldo således ved køb af værdipapirer, at saldo reduceres
    const nySaldo = data.type === "køb"
        ? pengePåSaldo - data.pris
        : pengePåSaldo + data.pris;

    //opdater saldo til nySaldo
    await db.request()
      .input("kontoID", sql.Int, data.kontoID)
      .input("saldo", sql.Decimal(18, 2), nySaldo)
      .query("UPDATE dbo.konto SET saldo = @saldo WHERE kontoID = @kontoID");
  
    //transaktionen gemmes med sælgerID og modtagerID, alt efter transaktionstypen
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

  
    //hvis handelstypen er køb, 
    if (data.type === "køb") {
      const eksisterendePapir = await db.request()
        .input("porteføljeID", sql.Int, data.porteføljeID)
        .input("ticker", sql.NVarChar, data.tickerSymbol)
        .query(`
          SELECT værdipapirID FROM dbo.værdipapir
          WHERE porteføljeID = @porteføljeID AND tickerSymbol = @ticker
        `);
        
      //kontrol om papir allerede eksisterer. Hvis ikke den gør det, skal den indsættes med navn, symbol osv. i værdipapir tabellen
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
      } else { //hvis værdipapir allerede eksisterer i portefølje, skal antal, dato og pris opdateres i databasen
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
  
      //ved køb af værdipapir brugeren allerede har, skal GAK beregnes på ny
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
        
      //gemmer GAK i værdipapir tabel
      const nyGAK = gakResult.recordset[0].GAK;
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
  
      //henter aktuelt antal og GAK fra værdipapir i portefølje
      const gevinstResult = await db.request()
        .input("porteføljeID", sql.Int, data.porteføljeID)
        .input("ticker", sql.NVarChar, data.tickerSymbol)
        .query(`
          SELECT antal, GAK FROM dbo.værdipapir
          WHERE porteføljeID = @porteføljeID AND tickerSymbol = @ticker
        `);
      
        
      const { antal, GAK } = gevinstResult.recordset[0] || {}; //#grhre????
      if (!isNaN(antal) && !isNaN(GAK)) {

        //beregner det urealiserede gevinst eller tab
        const gevinst = (antal * data.pris) - (antal * GAK);

        //opdaterer værdipapir med det urealiserede gevinst/tab
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
  

//metode som henter konti ejet af brugeren der er logget ind
async hentKontiForBruger(brugerID) {
    const db = await hentDB();
    const result = await db.request()
      .input("brugerID", sql.Int, brugerID)
      .query(`
        SELECT * FROM dbo.konto WHERE brugerID = @brugerID
      `);
    return result.recordset;
  }
  
  //metode som henter værdipapir ud fra ID
  async hentVærdipapirMedID(værdipapirID) {
    const db = await hentDB();
    const result = await db.request()
      .input("værdipapirID", sql.Int, værdipapirID)
      .query(`SELECT værdipapirID, porteføljeID, navn, tickerSymbol, type, antal, pris, GAK, urealiseretPorteføljeGevinstTab
        FROM dbo.værdipapir
        WHERE værdipapirID = @værdipapirID`);
  
    return result.recordset[0];
  }
  
  //metode som henter værdiudvikling for givet portefølje. Den starter med at konvertere købsdatoen til dato uden tid, summerer urealiseret gevinst/tab som værdi for det bestemte portefølje. Dette grupperes efter dato
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
  
  //metode der opdaterer sidste handels dato
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
  
  //henter et enkelt værdipapir fra poirtefølje og opdaterer dets pris og urealiseret gevinst/tab
  async hentOgOpdaterVærdipapirMedAktuelVærdi(værdipapirID) {
    const db = await hentDB();
    const værdipapir = await db.request()
      .input("værdipapirID", sql.Int, værdipapirID)
      .query(`
        SELECT værdipapirID, porteføljeID, navn, tickerSymbol, type, antal, pris, GAK, urealiseretPorteføljeGevinstTab
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
        JOIN dbo.konto k ON p.kontoID = k.kontoID
        WHERE k.brugerID = @brugerID
      `);
  
    const { totalSalg, totalKøb } = result.recordset[0];
    return (totalSalg || 0) - (totalKøb || 0);
  }
  
}

module.exports = new PortefoljeData();
