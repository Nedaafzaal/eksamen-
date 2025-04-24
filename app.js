
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



        app.post("/submit-adgangskode", async (req, res) => {
          const { brugernavn, gammelAdgangskode, nyAdgangskode } = req.body;
        
          try {
            const pool = await sql.connect(sqlConfig);
        
            const result = await pool.request()
              .input("brugernavn", sql.NVarChar, brugernavn)
              .input("gammel", sql.NVarChar, gammelAdgangskode)
              .query(`SELECT * FROM [eksamenSQL].[bruger] WHERE brugernavn = @brugernavn AND adgangskode = @gammel`);
        
            if (result.recordset.length === 0) {
              return res.send("Forkert adgangskode");
            }
        
            await pool.request()
              .input("ny", sql.NVarChar, nyAdgangskode)
              .input("brugernavn", sql.NVarChar, brugernavn)
              .query(`UPDATE [eksamenSQL].[bruger] SET adgangskode = @ny WHERE brugernavn = @brugernavn`);
        
            res.send("Adgangskode opdateret");
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

app.get("/portefoljer",(req,res)=>{
    res.render("portefoljer.ejs") //porteføljer
})

app.post("dashboard/indstillinger",(req,res)=>{
    res.status(200).redirect("http://localhost:3001/indstillinger") //indstillinger
})

app.get("/indstillinger", (req, res) => {
  // Midlertidig måde at gemme brugernavn – det skal komme fra fx login tidligere
  const brugernavn = "testbruger"; // <-- Du skal hente dette dynamisk senere
  res.render("indstillinger.ejs", { brugernavn: brugernavn });
});


//hvis port ændres i konstanten ændres det også her derfor kaldes den port
//printer linket i konsollen så vi kan komme ind på webapplikationen

app.get("/logout", (req,res)=>{
    res.redirect("/login.ejs")
})

app.listen(port, () => {  
    console.log('http://localhost:3001')
})



// Express redirect
// ekstra: express middleware
// Router
// HTTP statuskoder
// HTTP protokol meget kort 
// Session cookies i express






//