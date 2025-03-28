
const express = require("express"); //vi kalder på express pakken 
const app = express(); //appen er lig vores pakke 
const port = 3001; //definere hvilken port vores server skal køre på 

app.set("view engine", "ejs"); //fortæller serveren at den skal bruge EJS som view engine
app.use(express.urlencoded({extended: true })); //gør at app kan læse data fra en HTML formular 
app.use(express.static('public')) //Vi sætter alle vores statiske filer indenunder mappen public, så vi kan linke vores CSS. 


let database =[]; //vores database

app.get("/", (req, res) => {                              
    res.render('login.ejs')
   }) 

//get henter data fra serevren som er login.ejs og post sender data til serveren
app.get("/login", (req, res) => {
    res.render("login.ejs"); 
})
app.post("/login", (req, res) => {
    // login logik
    res.redirect("http://localhost:3001/dashboard");
})

//get henter data fra serevren som er opretbruger.ejs 
// og post sender data til serveren som brugeren kan se. 
// Tilføjer den oprettede bruger til databasen. Sender svar med HTTP status og redirecter brugeren til dashboard.
app.get("/opretbruger", (req, res) => {
    res.render("opretbruger.ejs"); 
})

app.post("/opretbruger", (req, res) => { 
    console.log(req.body); 
    database.push(req.body.name); 
   res.status(200).redirect("http://localhost:3001/dashboard"); 
});

app.get("/dashboard", (req, res) => {
    res.render("dashboard.ejs")
})


//hvis port ændres i konstanten ændres det også her derfor kaldes den port
//printer linket i konsollen så vi kan komme ind på webapplikationen
app.listen(port, () => {  
    console.log(`Example app listening on port http://localhost:${port}`) 
})




// Session cookies
// Express redirect
// ekstra: express middleware
// Router
// HTTP statuskoder
// HTTP protokol meget kort 
// Cookies
// Session cookies i express
// ekstra: hashing af adgangskode





