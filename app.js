//opretter en server ved at skrive npm init 
//henter derefter express pakken ved npm install express for at bygge vores webapplikation
//control c for at slutte server og node --watch app.js så den automatisk ændre

const express = require("express"); //vi kalder på express pakken 
const app = express(); //appen er lig vores pakke 
const port = 3001; //definere hvilken port vores server skal køre på 

app.get("view engine", "ejs"); //fortæller serveren at den skal bruge EJS som view engine

app.get("/test", (req, res) => {
    res.status(200).json({message:"Test API has been hit"}) //slet efter kun en test 
});

app.post("/register", (req, res) => { //opretter en sti til klienten så de kan sende en request 
    console.log(req.body); //logger den data klienten har sendt
   res.status(200);}) //sender respons tilbage 

app.listen(port, () => {  //hvis port ændres i konstanten ændres det også her derfor kaldes den port
    console.log(`Example app listening on port http://localhost:${port}`) //printer linket i konsollen så vi kan komme ind på webapplikationen
});






