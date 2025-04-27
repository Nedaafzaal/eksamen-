
import express from 'express'; //vi kalder på express pakken 
import sql from 'mssql'
const app = express(); //appen er lig vores pakke 
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
        app.post("/submit-adgangskode", async (req, res) => {
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


app.get("/dashboard", (req, res) => {
    res.render("dashboard.ejs")
})

app.post("dashboard/konti",(req,res)=>{
    res.status(200).redirect("http://localhost:3001/konti") //konti
})


app.get("/konti",(req,res)=>{
    res.render("konti.ejs") //konti
})


app.post("dashboard/portefoljer",(req,res)=>{
    res.status(200).redirect("http://localhost:3001/portefoljer") //porteføljer
});


app.post("dashboard/indstillinger",(req,res)=>{
    res.status(200).redirect("http://localhost:3001/indstillinger") //indstillinger
})

app.get("/indstillinger", (req, res) => {
  // Midlertidig måde at gemme brugernavn – det skal komme fra fx login tidligere
  const brugernavn = "testbruger"; // <-- Du skal hente dette dynamisk senere
  res.render("indstillinger.ejs", { brugernavn: brugernavn });
});

app.get("/tilfojKonto", (req, res) => {
  res.render("tilfojKonto.ejs")
})

app.post("konti/tilfojKonto",(req,res)=>{
  res.status(200).redirect("http://localhost:3001/tilfojKonto") //konti
})

//hvis port ændres i konstanten ændres det også her derfor kaldes den port
//printer linket i konsollen så vi kan komme ind på webapplikationen

app.get("/logout", (req,res)=>{
    res.redirect("/login.ejs")
})

app.listen(port, () => {  
    console.log('http://localhost:3001')
})

app.get("/saldo", (req, res) => {
  res.render("saldo.ejs"); 
});

//Henter nu værdipapirNavn, forventet værdi, dato, for at fremvise i tabel under portefølje oversigt
app.get("/portefoljeOversigt", async (req, res) => {
  try {
    const pool = await sql.connect(sqlConfig);
    const result = await pool.request().query(`
      SELECT * FROM eksamenSQL.porteføljer
    `);

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

//Denne rute sørger for at der oprettes nyt portefølje i databasen
app.post("/opretPortefolje", async (req, res) => {
  const { navn, kontotilknytning, forventetVærdi } = req.body;

  try {
    const pool = await sql.connect(sqlConfig);

    await pool.request()
      .input('navn', sql.NVarChar, navn)
      .input('kontotilknytning', sql.NVarChar, kontotilknytning)
      .input('dato', sql.Date, new Date()) // sætter dagens dato
      .input('forventetVærdi', sql.Decimal(18, 2), forventetVærdi)
      .input('værdipapirNavn', sql.NVarChar, 'Ingen endnu') // hvis du vil sætte en placeholder
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





