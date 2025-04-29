
import express from 'express'; //vi kalder på express pakken 
import sql from 'mssql';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express(); //appen er lig vores pakke 
const API_KEY = 'VIF5KCDTH18ZUONC'
const port = 3001; //definere hvilken port vores server skal køre på 
app.use(express.static('views'));


app.set("view engine", "ejs"); //fortæller serveren at den skal bruge EJS som view engine
app.use(express.urlencoded({extended: true })); //gør at app kan læse data fra en HTML formular 
app.use(express.static('public')) //Vi sætter alle vores statiske filer indenunder mappen public, så vi kan linke vores CSS. 

const sqlConfig = { //kode hentet fra npmjs
    user: 'prog584',
    password: 'Hejhej123!',
    database: 'eksamenserver',
    server: 'eksamenserver1.database.windows.net',
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    },
    options: {
      encrypt: true, // for azure
      trustServerCertificate: false // change to true for local dev / self-signed certs
    }
  }

let database =[]; //vores database

/*(async () => {
    try {
     // make sure that any items are correctly URL encoded in the connection string
     await sql.connect(sqlConfig)
     const result = await sql.query(`select * from eksamenSQL.bruger`)
     console.log(result)
    } catch (err) {
        console.log(err);
        
    }
   })()
  */
  

app.get("/", (req, res) => {                              
    res.render('login.ejs')
   }) 

//get henter data fra serevren som er login.ejs og post sender data til serveren
app.get("/login", (req, res) => {
    res.render("login.ejs", { fejl: null });; 
})
app.post("/login", async (req, res) => {
    const { brugernavn, adgangskode } = req.body; //trækker brugernavn og adgangskode ud af formularen 
    try {
      const pool = await sql.connect(sqlConfig); //opretter forbindelse til vores database
  
      const result = await pool //sender en forspørgsel til databasen om at finde brugeren med brugernavnet
        .request()
        .input("brugernavn", sql.NVarChar, brugernavn)
        .query(`
          SELECT adgangskode FROM [eksamenSQL].[bruger] WHERE brugernavn = @brugernavn 
        `); //henter adgangskoden der matcher til 
  
      if (result.recordset.length === 0) { //hvis brugeren ikke findes sendes en alert
        return res.render("login.ejs", { fejl: "Forkert brugernavn" });
      }
  
      const adgangskodeFraDB = result.recordset[0].adgangskode; //henter adgangskoden 
  
      if (adgangskode === adgangskodeFraDB) { //sammenligner adgangskoden med adgangskoden fra databasen 
        return res.redirect("http://localhost:3001/dashboard"); //hvis korrekt redirecter til dashboard
      } else {
        return res.render("login.ejs", { fejl: "Forkert adgangskode" }); //hvis forkert sendes en alert
      }
  
    } catch (err) { //hvis nogte går galt send en fejl 
      console.error("Login fejl:", err);
      res.status(500).send("Noget gik galt på serveren.");
    }
  });

//get henter data fra serevren som er opretbruger.ejs 
// og post sender data til serveren som brugeren kan se. 
// Tilføjer den oprettede bruger til databasen. Sender svar med HTTP status og redirecter brugeren til dashboard.
app.get("/opretbruger", (req, res) => {
    res.render("opretbruger.ejs"); 
})

app.post("/opretbruger", (req, res) => { 
    (async () => { //connecter til vores database 
        try {
            console.log(req.body);
            
         // make sure that any items are correctly URL encoded in the connection string
         console.log('forbinder...');
         await sql.connect(sqlConfig)
         console.log('forbundet');
         
         const request = await sql.connect(sqlConfig);

        const result = await request
          .request() //starter en sql request 
          .input("fornavn", sql.NVarChar, req.body.fornavn)
          .input("efternavn", sql.NVarChar, req.body.efternavn)
          .input("brugernavn", sql.NVarChar, req.body.opretbrugernavn)
          .input("adgangskode", sql.NVarChar, req.body.opretadgangskode)
          .input("email", sql.NVarChar, req.body.email)
          .input("fødselsdato", sql.Date, req.body.fødselsdag)
          .input("telefonnummer", sql.NVarChar, req.body.telefonnummer)
          .query(`
            INSERT INTO [eksamenSQL].[bruger]
            (fornavn, efternavn, brugernavn, adgangskode, email, fødselsdato, telefonnummer) 
            VALUES (@fornavn, @efternavn, @brugernavn, @adgangskode, @email, @fødselsdato, @telefonnummer)
          `);
                console.log(result) //logger resultatet 
                } catch (err) {
                  console.log(err); //logger fejl hvis der skulle være nogen 
                  res.sendStatus(500); //sender en status 500
                }
              })()
        
          res.status(200).redirect("http://localhost:3001/dashboard"); 
        });


        //Ruten for man kan opdatere sin adgangskode
        app.post("/skiftAdgangskode", async (req, res) => {
          const { brugernavn, gammelAdgangskode, nyAdgangskode } = req.body;//henter det brugeren har tastet ind. 
        
          try {
            const pool = await sql.connect(sqlConfig); //den skal prøve at connecte til vores databse
        
            const result = await pool.request() //vi laver en SQL forespørgsel
              .input("brugernavn", sql.NVarChar, brugernavn) //tilføjer to parametre til forespørgslen 1: brugernavn 2: gammel adgangskode
              .input("gammel", sql.NVarChar, gammelAdgangskode)
              .query(`SELECT * FROM [eksamenSQL].[bruger] WHERE brugernavn = @brugernavn AND adgangskode = @gammel`); //her vi laver forespørgslen selv
        
            if (result.recordset.length === 0) { //hvis ikke forespørgslen finder brugeren i databasen
              return res.render("indstillinger.ejs", { //skal den viderestille til indstillinger siden som man i forvejen er på med en alert "forkert adgangskode".
                alert: "Forkert adgangskode",
                brugernavn: brugernavn
              });
              
            }
        
            await pool.request() //starter en ny SQL-forespørgsel via vores åbne databaseforbindelse 
              .input("ny", sql.NVarChar, nyAdgangskode) //sætter SQL-parametren @ny til at være det nye kodeord, som brugeren skrev
              .input("brugernavn", sql.NVarChar, brugernavn) //sætter brugernavn til det brugernavn der skal opdateres
              .query(`UPDATE [eksamenSQL].[bruger] SET adgangskode = @ny WHERE brugernavn = @brugernavn`); //køre en SQL-kommando der opdaterer brugeren i databsen. 
        
            return res.render("indstillinger.ejs", { //hvis brugeren findes, opdateres deres adgangskode til den nye 
              alert: "Adgangskode opdateret!",
              brugernavn: brugernavn
            });
              
          } catch (err) {
            console.error(err);
            res.status(500).send("Noget gik galt på serveren");
          }
        });


  // Sæt visningsmotoren til EJS, så vi kan bruge .ejs skabelonfiler
  app.set('view engine', 'ejs');
  // Definér hvor EJS-skabelonerne ligger (views-mappen)
  app.set('views', path.join(__dirname, 'views'));

  // Definér en liste over aktiesymboler, som vi vil hente data for
  const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];

  // Definér en route til dashboardet
  app.get("/dashboard", async (req, res) => {
    try {
      const results = []; // Opret en tom liste til at gemme resultater

      // Gennemgå hvert aktiesymbol i listen
      for (const symbol of symbols) {
        // Byg API-URL'en til Alpha Vantage for at hente virksomhedens detaljer
        const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${API_KEY}`;

        // Send forespørgsel til Alpha Vantage API
        const response = await fetch(url);
        const data = await response.json();

        // Hvis virksomheden har en MarketCapitalization, tilføj den til resultaterne
        if (data.MarketCapitalization) {
          results.push({
            symbol: symbol,
            name: data.Name,
            marketCap: Number(data.MarketCapitalization) // Konverter til tal
          });
        }
      }

      // Sorter resultaterne i faldende orden efter markedsværdi og vælg top 5
      const top5 = results.sort((a, b) => b.marketCap - a.marketCap).slice(0, 5);

      // Render dashboard-siden og send top5-data til EJS-skabelonen
      res.render('dashboard', { top5: top5 || [] });

    } catch (err) {
      // Hvis noget går galt, log fejlen og send en fejlstatus tilbage
      console.error('Fejl ved hentning af data:', err);
      res.status(500).send('Fejl i hentning af data');
    }
  });

        


app.post("dashboard/kontiOversigt",(req,res)=>{
    res.status(200).redirect("http://localhost:3001/kontiOversigt") //konti
})

app.post("dashboard/portefoljer",(req,res)=>{
    res.status(200).redirect("http://localhost:3001/portefoljer") //porteføljer
});

app.post("dashboard/indstillinger",(req,res)=>{
    res.status(200).redirect("http://localhost:3001/indstillinger") //indstillinger
})

app.get("/indstillinger", (req, res) => {
  const brugernavn = "testbruger"; 
  res.render("indstillinger.ejs", { 
    brugernavn: brugernavn,
    alert: null 
  });
});


app.get("/tilfojKonto", (req, res) => {
res.render("tilfojKonto.ejs")
})

app.post("/tilfojKonto", async (req,res)=>{
    try {
        console.log(req.body);

        await sql.connect(sqlConfig);
     
     const request = new sql.Request();

    const result = await request 
      .input("kontonavn", sql.NVarChar, req.body.navn)
      .input("saldo", sql.Decimal, parseFloat (req.body.Saldo))
      .input("valuta", sql.NVarChar, req.body.valuta)
      .input("oprettelsesdato", sql.Date, new Date()) //sætter automatisk datoen når brugeren opretter konto
      .input("bankreference", sql.NVarChar, req.body.bankreference)
      .query(`
        INSERT INTO [eksamenSQL].[konto]
        (kontonavn, saldo, valuta, oprettelsesdato, bankreference) 
        VALUES (@kontonavn, @saldo, @valuta, @oprettelsesdato, @bankreference)
      `);
            console.log(result) //logger resultatet 

            res.status(200).redirect("http://localhost:3001/kontiOversigt"); 

            } catch (err) {
              console.log(err); //logger fejl hvis der skulle være nogen 
              res.sendStatus(500); //sender en status 500
            }
          });
    
app.get("/logout", (req,res)=>{
    res.redirect("/login.ejs")
})

app.listen(port, () => {  
    console.log('http://localhost:3001')
})


//Henter nu værdipapirNavn, forventet værdi, dato, for at fremvise i tabel under portefølje oversigt
app.get("/portefoljeOversigt", async (req, res) => {
  try {
    const pool = await sql.connect(sqlConfig);
    const result = await pool.request().query(`
      SELECT * FROM eksamenSQL.porteføljer
    `);
//Skriv bedrer text hvad der sker her! Det er mega vigtigt
    const portefoljer = result.recordset;
    res.render("portefoljeOversigt.ejs", { portefoljer });

  } catch (err) {
    console.error(err);
    res.status(500).send("Fejl ved hentning af porteføljer");
  }
});

app.get("/portefolje/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).send("Ugyldigt portefølje-ID");
  }

  try {
    const pool = await sql.connect(sqlConfig);

    // Hent porteføljen
    const portefoljeResult = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT * FROM eksamenSQL.porteføljer
        WHERE porteføljeID = @id
      `);

    if (portefoljeResult.recordset.length === 0) {
      return res.status(404).send("Portefølje ikke fundet");
    }

    const portefolje = portefoljeResult.recordset[0];

    // Hent aktier der hører til porteføljen
    const aktierResult = await pool.request()
      .input('porteføljeID', sql.Int, id)
      .query(`
        SELECT * FROM eksamenSQL.aktier
        WHERE porteføljeID = @porteføljeID
      `);

    const aktier = aktierResult.recordset;

    res.render("portefolje", { portefolje, aktier });

  } catch (err) {
    console.error(err);
    res.status(500).send("Fejl ved hentning af portefølje.");
  }
});


app.get("/opretPortefolje", (req,res)=>{
  res.render("opretPortefolje.ejs")
})


//Denne rute sørger for at der oprettes nyt portefølje i databasen.
app.post("/opretPortefolje", async (req, res) => {
  const { navn, kontotilknytning, forventetVærdi } = req.body;

  try {
    const pool = await sql.connect(sqlConfig);
    
    //Tager fat i det, som brugeren taster ind i formularen. 
    await pool.request()
      .input('navn', sql.NVarChar, navn)
      .input('kontotilknytning', sql.NVarChar, kontotilknytning)
      .input('dato', sql.Date, new Date()) // sætter dagens dato
      .input('forventetVærdi', sql.Decimal(18, 2), forventetVærdi)
      .input('værdipapirNavn', sql.NVarChar, 'Ingen endnu')
      .query(`
        INSERT INTO eksamenSQL.porteføljer (navn, kontotilknytning, dato, forventetVærdi, værdipapirNavn)
        VALUES (@navn, @kontotilknytning, @dato, @forventetVærdi, @værdipapirNavn)
      `);

    
    res.redirect("/portefoljeOversigt"); // efter oprettelse, redirecter tilbage til oversigten
  } catch (err) {
    console.error(err);
    res.status(500).send("Fejl ved oprettelse af portefølje.");
  }
});

//henter konti fra databasen
app.get("/kontiOversigt", async (req, res) => {
  try {
    const pool = await sql.connect(sqlConfig);
    const result = await pool.request().query(`
      SELECT * FROM eksamenSQL.konto
    `);

    const konti = result.recordset;
    res.render("kontiOversigt.ejs", { konti });

  } catch (err) {
    console.error(err);
    res.status(500).send("Fejl ved hentning af konti");
  }
});


// Route til visning af en bestemt konto og dens transaktionsoversigt
app.get('/konti/:id', async (req, res) => {
  try {
    const kontoID = req.params.id; // Henter kontoID fra URL'en

    await sql.connect(sqlConfig); // Forbind til SQL server

    // Første request: henter konto-information
    const request1 = new sql.Request();
    const kontoResult = await request1
      .input('kontoID', sql.Int, kontoID)
      .query('SELECT * FROM eksamenSQL.konto WHERE kontoID = @kontoID');

    const konto = kontoResult.recordset[0]; // Gemmer den første række

    // Anden request: henter transaktioner relateret til kontoen
    const request2 = new sql.Request();
    const transaktionResult = await request2
      .input('kontoID', sql.Int, kontoID)
      .query(`
        SELECT * FROM eksamenSQL.transaktioner
        WHERE sælgerKontoID = @kontoID OR modtagerKontoID = @kontoID
      `);

    const transaktioner = transaktionResult.recordset; // Gemmer listen af transaktioner

    // Sender konto og transaktioner videre til konti.ejs
    res.render('konti', { konto: konto, transaktioner: transaktioner });

  } catch (err) {
    console.error(err); // Logger fejl til konsollen
    res.status(500).send('Kunne ikke hente konto eller transaktioner.');
  }
});



//Indsættelse af værdi. Tager fat i den valgte konto efter ID.
app.get("/insertValue/:id", async (req, res) => {
  try {
    const kontoID = req.params.id;

    await sql.connect(sqlConfig); //skaber forbindelse til serveren
    const request = new sql.Request();

    const result = await request
      .input('kontoID', sql.Int, kontoID) //sætter valgt kontoID ind. laver en forespørgsel hvor den tager alt fra konto, der hvor kontoID er = den valgte kontoID.
      .query('SELECT * FROM eksamenSQL.konto WHERE kontoID = @kontoID'); //

    const konto = result.recordset[0]; //recordset laver et array med objekter indeni. Den gemmer altså alt den henter fra databasen i en liste i et array.

    res.render("insertValue.ejs", { konto: konto }); //denne variabel sender den til insertvalue.ejs, så den også er tilgængelig derinde. 
  } catch (err) {
    console.error(err);
    res.status(500).send('Fejl ved hentning af konto til indsæt værdi.');
  }
});


app.post('/insertValue', async (req, res) => {
  try {
    const { beløb, valuta, kontoID } = req.body;

    await sql.connect(sqlConfig);
    const request = new sql.Request();

    //Opdaterer saldo ved at sætte det beløb man indsætter + det man havde i forvejen. 
    await request
      .input('beløb', sql.Int, beløb)
      .input('kontoID', sql.Int, kontoID)
      .query(`
        UPDATE eksamenSQL.konto
        SET saldo = saldo + @beløb
        WHERE kontoID = @kontoID
      `);

      //Tilføjer det til vores transaktionstabel som allerede eksisterer i vores database.
      const request2 = new sql.Request(); //laver ny forespørgsel til databasen
      
      const nu = new Date();
      const tid = nu.toTimeString();
     
      await request2
        .input('sælgerkontoID', sql.Int, null) // Ingen sælger ved indsæt, hvorfor den sættes til null.
        .input('modtagerkontoID', sql.Int, kontoID) //ved indsæt er modtagerkontoID bare den givet kontoID
        .input('værditype', sql.VarChar(20), 'Kontant')
        .input('dato', sql.Date, nu) //sætter datoen til den dato det er, når der indsættes værdi
        .input('tidspunkt', sql.Time, tid) //samme gælder ved tidspunkt
        .input('transaktionstype', sql.VarChar(20), 'Indsæt') //Typen af transaktionen
        .input('pris', sql.Int, beløb) //det beløb som brugeren vil indsætte
        .input('gebyr', sql.Int, 0) //vi har ingen gebyrer ved indsættelse
        //selve forespørgslen laves ved at tage fat i alle de kolonner der skal indsættes i. 
        .query(`
          INSERT INTO eksamenSQL.transaktioner 
          (sælgerkontoID, modtagerkontoID, værditype, dato, tidspunkt, transaktionstype, pris, gebyr)
          VALUES (@sælgerkontoID, @modtagerkontoID, @værditype, @dato, @tidspunkt, @transaktionstype, @pris, @gebyr)
        `);

      res.redirect(`/konti/${kontoID}`);

  } catch (err) {
    console.error(err);
    res.status(500).send('Fejl ved indsættelse af værdi');
  }
});


//Bruger samme logik som insertValue til removeValue.
app.get("/removeValue/:id", async (req, res) => {
  try {
    const kontoID = req.params.id;

    await sql.connect(sqlConfig); //skaber forbindelse til serveren
    const request = new sql.Request();

    const result = await request
      .input('kontoID', sql.Int, kontoID) //sætter valgt kontoID ind. laver en forespørgsel hvor den tager alt fra konto, der hvor kontoID er = den valgte kontoID.
      .query('SELECT * FROM eksamenSQL.konto WHERE kontoID = @kontoID'); //

    const konto = result.recordset[0]; //recordset laver et array med objekter indeni. Den gemmer altså alt den henter fra databasen i en liste i et array.

    res.render("removeValue.ejs", { konto: konto }); //denne variabel sender den til insertvalue.ejs, så den også er tilgængelig derinde. 
  } catch (err) {
    console.error(err);
    res.status(500).send('Fejl ved hentning af konto til hævning af værdi.');
  }
});

//til forskel for insertValue, trækker jeg beløbet fra saldoen
app.post('/removeValue', async (req, res) => {
  try {
    const { beløb, valuta, kontoID } = req.body;

    await sql.connect(sqlConfig);
    const request = new sql.Request();

    //Opdaterer saldo ved at sætte det beløb man indsætter - det man havde i forvejen. 
    await request
      .input('beløb', sql.Int, beløb)
      .input('kontoID', sql.Int, kontoID)
      .query(`
        UPDATE eksamenSQL.konto
        SET saldo = saldo - @beløb
        WHERE kontoID = @kontoID
      `);

    //Tilføjer det til vores transaktionstabel som allerede eksisterer i vores database.
    const request2 = new sql.Request(); //laver ny forespørgsel til databasen
    await request2
      .input('sælgerkontoID', sql.Int, kontoID) // Sælger er det kontoID man er inde på
      .input('modtagerkontoID', sql.Int, null) //ved hæv er modtagerkontoID null (fra vores persepktiv)
      .input('værditype', sql.VarChar(20), 'Kontant')
      .input('dato', sql.Date, new Date()) //sætter datoen til den dato det er, når der indsættes værdi
      .input('tidspunkt', sql.Time, new Date()) //samme gælder ved tidspunkt
      .input('transaktionstype', sql.VarChar(20), 'Hæv') //Typen af transaktionen
      .input('pris', sql.Int, beløb) //det beløb som brugeren vil hæve
      .input('gebyr', sql.Int, 0) //vi har ingen gebyrer ved hæv
      //selve forespørgslen laves ved at tage fat i alle de kolonner der skal indsættes i. 
      .query(`
        INSERT INTO eksamenSQL.transaktioner 
        (sælgerkontoID, modtagerkontoID, værditype, dato, tidspunkt, transaktionstype, pris, gebyr)
        VALUES (@sælgerkontoID, @modtagerkontoID, @værditype, @dato, @tidspunkt, @transaktionstype, @pris, @gebyr)
      `);

    res.redirect(`/konti/${kontoID}`);

  } catch (err) {
    console.error(err);
    res.status(500).send('Fejl ved hævelse af værdi');
  }
});

//En rute der deaktiverer kontoen
app.get("/lukKonto/:id", async (req, res) => {
  try {
    const kontoID = req.params.id;

    await sql.connect(sqlConfig); 

    const request = new sql.Request();

    await request
      .input('kontoID', sql.Int, kontoID) 
      .query('UPDATE eksamenSQL.konto SET aktiv = 0 WHERE kontoID = @kontoID'); 

    res.redirect(`/konti/${kontoID}`);

  } catch (err) {
    console.error(err);
    res.status(500).send('Fejl ved lukning af konto.');
  }
});

app.get("/openKonto/:id", async (req, res) => {
  try {
    const kontoID = req.params.id;

    await sql.connect(sqlConfig); 

    const request = new sql.Request();

    await request
      .input('kontoID', sql.Int, kontoID) 
      .query('UPDATE eksamenSQL.konto SET aktiv = 1 WHERE kontoID = @kontoID'); 

    res.redirect(`/konti/${kontoID}`);

  } catch (err) {
    console.error(err);
    res.status(500).send('Fejl ved åbning af konto.');
  }
});



