//impoterer Node.js-pakken Microsoft SQL Server-database
//importerer vores databaseoplysninger
const sql = require("mssql");
const sqlConfig = require("../sqlConfig/sqlConfig");

//laver en funktion som connecter til vores database
async function hentDB() {
  return await sql.connect(sqlConfig);
}

class VærdipapirData {
  //metode der tilføjer værdipapirer til portefølje
  async tilføjVærdipapirTilPortefølje(data) {
    const db = await hentDB();
    await db
      .request()
      .input("porteføljeID", sql.Int, data.porteføljeID)
      .input("navn", sql.NVarChar, data.navn)
      .input("tickerSymbol", sql.NVarChar, data.symbol)
      .input("pris", sql.Decimal(18, 2), data.pris)
      .input("antal", sql.Int, data.antal).query(`
        INSERT INTO dbo.værdipapir (porteføljeID, navn, tickerSymbol, pris, antal)
        VALUES (@porteføljeID, @navn, @tickerSymbol, @pris, @antal)
      `);
  }


  //metode der henter værdipapir til den specifikke portefølje
  async hentVærdipapirTilPortefølje(porteføljeID) {
    const db = await hentDB();
    const result = await db
      .request()
      .input("porteføljeID", sql.Int, porteføljeID).query(`
        SELECT * FROM dbo.værdipapir
        WHERE porteføljeID = @porteføljeID
      `);
    return result.recordset;
  }


  //metode som henter værdipapir ud fra ID
  async hentVærdipapirMedID(værdipapirID) {
    const db = await hentDB();
    const result = await db
      .request()
      .input("værdipapirID", sql.Int, værdipapirID)
      .query(`SELECT værdipapirID, porteføljeID, navn, tickerSymbol, type, antal, pris, GAK, urealiseretPorteføljeGevinstTab
        FROM dbo.værdipapir
        WHERE værdipapirID = @værdipapirID`);

    return result.recordset[0];
  }


  //metode som henter værdiudvikling for givet portefølje. Den starter med at konvertere købsdatoen til dato uden tid, summerer urealiseret gevinst/tab som værdi for det bestemte portefølje. Dette grupperes efter dato
  async hentVærdiHistorik(porteføljeID) {
    const db = await hentDB();
    const result = await db
      .request()
      .input("porteføljeID", sql.Int, porteføljeID).query(`
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


  //metode der henter et enkelt værdipapir fra portefølje og opdaterer dets pris og urealiseret gevinst/tab
  async hentOgOpdaterVærdipapirMedAktuelVærdi(værdipapirID) {
    const db = await hentDB();
    const værdipapir = await db
      .request()
      .input("værdipapirID", sql.Int, værdipapirID)
      .query(
        `SELECT værdipapirID, porteføljeID, navn, tickerSymbol, type, antal, pris, GAK, urealiseretPorteføljeGevinstTab
          FROM dbo.værdipapir
          WHERE værdipapirID = @værdipapirID
        `
      )
      .then((res) => res.recordset[0]); //henter det første resultat fra forspørgslen

    if (!værdipapir) return null; //hvis værdipapiret ikke findes retuner null

    const symbol = værdipapir.tickerSymbol; //gemmer tickersymbol for at bruge det i api kald
    const prisLink = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${process.env.API_KEY}`;
    const prisSvar = await fetch(prisLink); //henter data fra api
    const prisData = await prisSvar.json();
    const aktuelPris = parseFloat(prisData["Global Quote"]?.["05. price"]); //udtrækker aktuel pris og konvetere det til tal

    const antal = parseFloat(værdipapir.antal); //konveter antal til tal
    const GAK = parseFloat(værdipapir.GAK); //konvetere gennemsnitlig købspris til tal

    if (!isNaN(aktuelPris) && !isNaN(GAK) && !isNaN(antal)) {
      const gevinst = (aktuelPris - GAK) * antal;

      //kun opdater gevinst og pris i databasen
      await db
        .request()
        .input("gevinst", sql.Decimal(18, 2), gevinst)
        .input("pris", sql.Decimal(18, 2), aktuelPris)
        .input("værdipapirID", sql.Int, værdipapirID).query(`
            UPDATE dbo.værdipapir
            SET urealiseretPorteføljeGevinstTab = @gevinst,
                pris = @pris
            WHERE værdipapirID = @værdipapirID
          `);

      //tilføj dynamiske egenskaber
      værdipapir.aktuelPris = aktuelPris;
      værdipapir.forventetVærdi = aktuelPris * antal;
      værdipapir.urealiseretPorteføljeGevinstTab = gevinst;
    }
    return værdipapir;
  }


  //metode der henter historik for værdipapir
  async hentHistorikForVærdipapir(værdipapirID) {
    const db = await hentDB();

    const result = await db
      .request()
      .input("værdipapirID", sql.Int, værdipapirID).query(`
        SELECT 
          CONVERT(date, dato) AS dato,
          SUM(antal * pris) AS værdi
        FROM dbo.transaktioner
        WHERE værdipapirID = @værdipapirID
          AND transaktionstype = 'køb'
          AND dato >= DATEADD(year, -1, GETDATE())
        GROUP BY CONVERT(date, dato)
        ORDER BY dato
      `);

    return result.recordset;
  }

  
  //beregner den samlede realiserede gevinst eller tab
  async hentTotalRealiseretGevinst(brugerID) {
    const db = await hentDB();
    const result = await db.request().input("brugerID", sql.Int, brugerID)
      .query(`
          SELECT 
            SUM(CASE WHEN t.transaktionstype = 'salg' THEN (t.pris - t.gebyr) ELSE 0 END) AS totalSalg, 
            SUM(CASE WHEN t.transaktionstype = 'køb' THEN (t.pris + t.gebyr) ELSE 0 END) AS totalKøb
          FROM dbo.transaktioner t
          JOIN dbo.porteføljer p ON t.porteføljeID = p.porteføljeID
          JOIN dbo.konto k ON p.kontoID = k.kontoID
          WHERE k.brugerID = @brugerID
        `);

    const { totalSalg, totalKøb } = result.recordset[0]; //udtrækker værdierne fra det første resultat
    return (totalSalg || 0) - (totalKøb || 0);
  }
}


class HandelData {
  //metode som registrerer handlen
  async registrerHandel(data) {
    const db = await hentDB();
    data.antal = parseInt(data.antal);
    if (data.type === "salg") {
      data.gebyr = 19; //sætter gebyr på hvis det er en salgshandel 
    } else {
      data.gebyr = 0; //ellers ingen gebyr 

    //henter kontoID via porteføljeID
    const kontoQuery = await db
      .request()
      .input("porteføljeID", sql.Int, data.porteføljeID)
      .query(
        "SELECT kontoID FROM dbo.porteføljer WHERE porteføljeID = @porteføljeID"
      );

    const kontoID = kontoQuery.recordset[0]?.kontoID; //udtrækker kontoID
    if (!kontoID) throw new Error("Konto til portefølje ikke fundet"); //fejlhåndtering
    data.kontoID = kontoID; //gem kontoID til brug nedenfor

    //henter saldo for den konto der blev fundet
    const saldoResult = await db
      .request()
      .input("kontoID", sql.Int, kontoID)
      .query("SELECT saldo FROM dbo.konto WHERE kontoID = @kontoID");

    const pengePåSaldo = saldoResult.recordset[0].saldo; //udtrækker saldo
    if (pengePåSaldo == null)
      throw new Error("Der er ikke nogle penge på den valgte konto");

    //beregner prisen inkl. eller ekskl. gebyr afhængigt af typen 
    const prisMedGebyr =
      data.type === "salg" ? data.pris - data.gebyr : data.pris; //hvis transaktion er et salg trækkes gebyret fra prisen ellers bruges prisen som den er
    if (data.type === "køb" && pengePåSaldo < prisMedGebyr) { //hvis det er et køb og saldoen ikke rækker til prisen kastes en fejl 
      throw new Error("Du har ikke nok penge til at købe.");
    }

    //tjekker om porteføljen ejer det værdipapir, der prøves at sælges
    if (data.type === "salg") {
      const beholdning = await db
        .request()
        .input("porteføljeID", sql.Int, data.porteføljeID)
        .input("ticker", sql.NVarChar, data.tickerSymbol).query(`
          SELECT antal FROM dbo.værdipapir
          WHERE porteføljeID = @porteføljeID AND tickerSymbol = @ticker
        `);

      const antalEjet = beholdning.recordset[0].antal; //hvor mange aktier brugeren har

     
      if (antalEjet < data.antal)
        throw new Error("Du forsøger at sælge flere aktier end du ejer");

      //opdaterer antallet efter salget er gået igennem i databasen
      await db
        .request()
        .input("porteføljeID", sql.Int, data.porteføljeID)
        .input("ticker", sql.NVarChar, data.tickerSymbol)
        .input("antal", sql.Int, data.antal).query(`
          UPDATE dbo.værdipapir
          SET antal = antal - @antal
          WHERE porteføljeID = @porteføljeID AND tickerSymbol = @ticker
        `);

      //henter GAK og antal til at beregne gevinst eller tab
      const gevinstResult = await db
        .request()
        .input("porteføljeID", sql.Int, data.porteføljeID)
        .input("ticker", sql.NVarChar, data.tickerSymbol).query(`
          SELECT antal, GAK FROM dbo.værdipapir
          WHERE porteføljeID = @porteføljeID AND tickerSymbol = @ticker
        `);

      //henter antal og GAK fra første række vores database giver
      const række = gevinstResult.recordset[0] || {};
      const antal = række.antal;
      const GAK = række.GAK;

      //hvis antal og GAK er et tal, skal gevinst bestemmes og værdipapirer skal opdateres med den nye gevinst
      if (!isNaN(antal) && !isNaN(GAK)) {
        const gevinst = antal * data.pris - antal * GAK;
        await db
          .request()
          .input("gevinst", sql.Decimal(18, 2), gevinst)
          .input("porteføljeID", sql.Int, data.porteføljeID)
          .input("ticker", sql.NVarChar, data.tickerSymbol).query(`
            UPDATE dbo.værdipapir
            SET urealiseretPorteføljeGevinstTab = @gevinst
            WHERE porteføljeID = @porteføljeID AND tickerSymbol = @ticker
          `);
      }

      //hvis alle værdipapirer sælges og antal=0, skal den slettes fra portefølje
      if (antal === 0) {
        await db
          .request()
          .input("porteføljeID", sql.Int, data.porteføljeID)
          .input("ticker", sql.NVarChar, data.tickerSymbol).query(`
            DELETE FROM dbo.værdipapir
            WHERE porteføljeID = @porteføljeID AND tickerSymbol = @ticker
          `);
      }
    }

    //udregner saldo således ved køb af værdipapirer, at saldo reduceres
    const nySaldo =
      data.type === "køb"
        ? pengePåSaldo - data.pris //hvis det er et køb trækkes prisen fra saldoen
        : pengePåSaldo + data.pris; //hvis det ikke er et køb ligges prisen til

    //opdater saldo til nySaldo
    await db
      .request()
      .input("kontoID", sql.Int, data.kontoID)
      .input("saldo", sql.Decimal(18, 2), nySaldo)
      .query("UPDATE dbo.konto SET saldo = @saldo WHERE kontoID = @kontoID");

    //transaktionen gemmes med sælgerID og modtagerID, alt efter transaktionstypen
    const sælgerID =
      data.type === "salg" ? data.kontoID : null; //hvis transaktionen er et salg eller en hævning, sættes sælgerID til kontoID, ellers null
    const modtagerID =
      data.type === "køb" ? data.kontoID : null; //hvis transaktionen er et køb eller en indsætning, sættes modtagerID til kontoID, ellers null

    //transaktionen gemmes i databasen
    await db
      .request()
      .input("porteføljeID", sql.Int, data.porteføljeID)
      .input("type", sql.NVarChar, data.type)
      .input("pris", sql.Decimal(18, 2), data.pris)
      .input("gebyr", sql.Decimal(18, 2), data.gebyr || 0)
      .input("dato", sql.Date, new Date())
      .input("tid", sql.DateTime, new Date())
      .input("antal", sql.Int, data.antal)
      .input("sælgerKontoID", sql.Int, sælgerID)
      .input("modtagerKontoID", sql.Int, modtagerID)
      .input("ticker", sql.NVarChar, data.tickerSymbol)
      .input("værditype", sql.NVarChar, data.værditype).query(`
        INSERT INTO dbo.transaktioner
        (porteføljeID, transaktionstype, pris, gebyr, dato, tidspunkt, antal, sælgerKontoID, modtagerKontoID, tickerSymbol, værditype)
        VALUES (@porteføljeID, @type, @pris, @gebyr, @dato, @tid, @antal, @sælgerKontoID, @modtagerKontoID, @ticker, @værditype)
      `);
  }
}
}


module.exports = {
  værdipapirData: new VærdipapirData(),
  handelData: new HandelData(),
};
