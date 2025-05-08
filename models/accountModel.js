const sql = require("mssql"); //importerer SQL Server-pakken, for at kunne interagere med databasen
const sqlConfig = require("../sqlConfig/sqlConfig"); //importerer konfigurationsfilen, der indeholder forbindelsesoplysninger til databasen

//funktion, der opretter forbindelse til databasen
async function hentDB() {
    return await sql.connect(sqlConfig); //opretter forbindelse til databasen ved hjælp af sqlConfig
}

//kontoData-klasse, der indeholder alle funktionerne til at arbejde med konto- og transaktionsdata
class KontoData {

//hent alle konti fra databasen
async hentAlleKontiForBruger(brugerID) {
    const db = await hentDB(); //opretter forbindelse til databasen
    const result = await db.request()
    .input("brugerID", sql.Int, brugerID)
    .query(`
    SELECT * FROM dbo.konto
    WHERE brugerID = @brugerID
  `); //SQL forspørgsel der henter alle konti
  return result.recordset; //retunere en liste af alle konti
}


//henter en konto ud fra kontoID 
async hentKontoMedID(kontoID) {
  const db = await hentDB();
  const result = await db.request()
    .input("kontoID", sql.Int, kontoID) //henter den parameter som forspørgslen kommer til at indeholde 
    .query(`
        SELECT kontoID, kontonavn, saldo, valuta, oprettelsesdato, bankreference, brugerID, aktiv 
        FROM dbo.konto 
        WHERE kontoID = @kontoID
    `); //forspørgsel der henter konto som matcher id
    
  return result.recordset[0]; //retunere selve kontoen 
}

   
    async hentTransaktionerForKonto(kontoID) {
        const db = await hentDB(); 
        const result = await db.request()
            .input("ID", sql.Int, kontoID)
            .query(`
            SELECT * FROM dbo.transaktioner
            WHERE (sælgerKontoID = @ID OR modtagerKontoID = @ID)
            AND transaktionstype IN ('hæv', 'indsæt', 'køb', 'salg')
        `); 

        return result.recordset; //returnerer en liste af transaktioner
    }

    
    async opdaterSaldo(kontoID, beløb) {
        const db = await hentDB(); 
        await db.request()
            .input("ID", sql.Int, kontoID) 
            .input("beløb", sql.Decimal(18, 2), beløb) 
            .query(`
            UPDATE dbo.konto
            SET saldo = saldo + @beløb
            WHERE kontoID = @ID
        `); //SQL-forespørgsel, der opdaterer saldoen på kontoen ved at lægge beløbet til
    }

   
    async gemTransaktion(data) { //gemmer data for ny transaktion
        const db = await hentDB(); 
        const nu = new Date(); // Henter det aktuelle tidspunkt

        const harPortefølje = data.porteføljeID !== undefined && data.porteføljeID !== null; //tjekker om der er en porteføljeID

        const request = db.request()
            .input("kontoID", sql.Int, data.kontoID) //angiver kontoID som parameter
            .input("sælgerID", sql.Int, data.type === "hæv" ? data.kontoID : null) //hvis transaktionen er en hævning, sættes sælgerID til kontoID
            .input("modtagerID", sql.Int, data.type === "indsæt" ? data.kontoID : null) //hvis transaktionen er en indsættelse, sættes modtagerID til kontoID
            .input("type", sql.VarChar(20), data.type) //angiver transaktionstypen
            .input("dato", sql.Date, nu) //angiver datoen for transaktionen
            .input("tid", sql.Time, nu) //angiver tidspunktet for transaktionen
            .input("valuta", sql.VarChar(10), data.valuta || "DKK") //angiver valutaen, default til DKK
            .input("beløb", sql.Decimal(18, 2), data.beløb) //angiver beløbet for transaktionen
            .input("gebyr", sql.Int, 0); //angiver gebyret (standard 0)

        if (harPortefølje) {
            request.input("porteføljeID", sql.Int, data.porteføljeID); //hvis transaktionen involverer en portefølje, tilføjes porteføljeID
        }

        const insertSql = `
        INSERT INTO dbo.transaktioner
        (${harPortefølje ? "porteføljeID," : ""} kontoID, sælgerKontoID, modtagerKontoID, transaktionstype, dato, tidspunkt, værditype, pris, gebyr)
        VALUES (${harPortefølje ? "@porteføljeID," : ""} @kontoID, @sælgerID, @modtagerID, @type, @dato, @tid, @valuta, @beløb, @gebyr)
    `;

        await request.query(insertSql); //udfører SQL-forespørgslen for at gemme transaktionen

        if (harPortefølje) { //hvis transaktionen involverer en portefølje, opdateres den sidste handelsdato for porteføljen
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

    
    async opretNyKonto(formData, brugerID) { //opretter en ny konto for en bruger
        const db = await sql.connect(sqlConfig); // Opretter forbindelse til databasen
        const result = await db.request()
            .input("navn", sql.NVarChar, formData.navn) // Henter kontonavn fra formulardata
            .input("saldo", sql.Decimal(18, 2), parseFloat(formData.saldo)) // Henter saldo fra formulardata
            .input("valuta", sql.NVarChar, formData.valuta) // Henter valuta fra formulardata
            .input("dato", sql.Date, new Date()) // Angiver oprettelsesdatoen
            .input("bankref", sql.NVarChar, formData.bankreference) // Henter bankreferencen fra formulardata
            .input("brugerID", sql.Int, brugerID) // Angiver brugerID
            .query(`
            INSERT INTO dbo.konto
            (kontonavn, saldo, valuta, oprettelsesdato, bankreference, brugerID)
            OUTPUT INSERTED.kontoID
            VALUES (@navn, @saldo, @valuta, @dato, @bankref, @brugerID)
        `); //SQL-forespørgsel, der opretter en ny konto i databasen og returnerer den nye kontoID

        return result.recordset[0].kontoID; //returnerer den oprettede kontos ID
    }

    
    async sætAktivStatus(kontoID, aktiv) {//ændrer en kontos status til aktiv eller inaktiv
        const db = await hentDB();
        await db.request()
            .input("ID", sql.Int, kontoID) 
            .input("aktiv", sql.Bit, aktiv) //angiver den nye status (aktiv eller inaktiv)
            .query(`
            UPDATE dbo.konto
            SET aktiv = @aktiv
            WHERE kontoID = @ID
        `); //SQL-forespørgsel, der opdaterer kontostatus i databasen
    }

    
    async hentPorteføljeIDForBruger(brugerID) {
        const db = await sql.connect(sqlConfig); 
        const result = await db.request()
            .input("brugerID", sql.Int, brugerID) 
            .query(`SELECT porteføljeID FROM dbo.porteføljer WHERE brugerID = @brugerID`); //SQL-forespørgsel, der henter porteføljeID for en bruger

        return result.recordset[0]?.porteføljeID || null; //returnerer porteføljeID eller null, hvis ikke fundet
    }
}

//eksporterer KontoData-klassen som en instans
module.exports = new KontoData();



