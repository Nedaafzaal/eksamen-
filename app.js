
const express = require("express"); //vi kalder på express pakken 
const app = express(); //appen er lig vores pakke 
const port = 3001; //definere hvilken port vores server skal køre på 

app.set("view engine", "ejs"); //fortæller serveren at den skal bruge EJS som view engine
app.use(express.urlencoded({extended: true })); //gør at app kan læse data fra en HTML formular 
app.use(express.static('public')) //Vi sætter alle vores statiske filer indenunder mappen public, så vi kan linke vores CSS. 


let database =[]; //vores database

app.get("/", (req, res) => {                              
    res.render('dashboard.ejs')
   }) 

app.get("/login", (req, res) => {
    res.render("login.ejs"); //når der sendes en get request til serveren så svare serveren med en HTML side fra frontend.ejs
})
app.post("/login", (req, res) => {
    // login logik
    res.redirect("http://localhost:3001/"); //når der sendes en get request til serveren så svare serveren med en HTML side fra frontend.ejs
})

app.get("/opretbruger", (req, res) => {
    res.render("opretbruger.ejs"); //når der sendes en get request til serveren så svare serveren med en HTML side fra opretbruger.ejs
})


app.post("/opretbruger", (req, res) => { //opretter en sti til klienten så de kan sende en request om at logge ind 
    console.log(req.body); //logger den data klienten har sendt
    database.push(req.body.name); //pusher nye brugere ind i databasen 
   res.status(200).redirect("http://localhost:3001/"); //serveren er fejlfri
});





app.listen(port, () => {  //hvis port ændres i konstanten ændres det også her derfor kaldes den port
    console.log(`Example app listening on port http://localhost:${port}`) //printer linket i konsollen så vi kan komme ind på webapplikationen
})


// Session cookies
// Express redirect
// ekstra: express middleware
// Router
// HTTP statuskoder
// HTTP protokol meget kort 





