
const express = require("express"); //vi kalder på express pakken 
const app = express(); //appen er lig vores pakke 
const port = 3001; //definere hvilken port vores server skal køre på 

app.set("view engine", "ejs"); //fortæller serveren at den skal bruge EJS som view engine
app.use(express.urlencoded({extended: true })); //gør at app kan læse data fra en HTML formular 
app.use(express.static('public')) //Vi sætter alle vores statiske filer indenunder mappen public, så vi kan linke vores CSS. 


let database =[]; //vores database

app.get("/", (req, res) => {
    res.render("frontend.ejs"); //når der sendes en get request til serveren så svare serveren med en HTML side fra frontend.ejs
})

app.get("/opretbruger", (req, res) => {
    res.render("opretbruger.ejs"); //når der sendes en get request til serveren så svare serveren med en HTML side fra opretbruger.ejs
})

app.get("/brugere", (req, res) => {
    res.status(200).json({ brugere: database}); //henter data fra databasen
})

app.post("/brugere", (req, res) => { //opretter en sti til klienten så de kan sende en request om at logge ind 
    console.log(req.body); //logger den data klienten har sendt
    database.push(req.body.name); //pusher nye brugere ind i databasen 
   res.status(200).json({ brugere: database}); //serveren er fejlfri
});

   app.post("/opretbruger", (req, res) => { //opretter en sti til klienten så de kan sende en request om at oprette bruger
    console.log(req.body); //logger den data klienten har sendt
   res.status(200);}) //serveren er fejlfri

app.listen(port, () => {  //hvis port ændres i konstanten ændres det også her derfor kaldes den port
    console.log(`Example app listening on port http://localhost:${port}`) //printer linket i konsollen så vi kan komme ind på webapplikationen
});







