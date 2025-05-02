const express = require("express"); //importere express som bruges til at bygge web-serevren 
const bodyParser = require("body-parser"); //importeres til at læse data fra formulare (req.body)
const path = require("path"); //importere node.js indbyggede modul til at arbejde med filstier 
const cookieParser = require("cookie-parser"); //bruges til at læse cookies fra brugeren 

//importerer ruterne 
const userRoutes = require("./routes/userRoute"); 
const dashboardRoute = require("./routes/dashboardRoute"); 
const accountRoute = require("./routes/accountRoute"); 
const portfolioRoutes = require("./routes/portfolioRoute"); 

const app = express(); //opretter express applikation


app.use(bodyParser.urlencoded({ extended: true })); //gør det muligt at læse data fra formularer
app.use(express.static(path.join(__dirname, "public"))); //gør det muligt at vise statiske filer fra public mappen
app.use(cookieParser()); //gør det muligt at læse cookies 


app.set("view engine", "ejs"); //fortæller at vi bruger ejs til at vise html sider
app.set("views", path.join(__dirname, "views")); //fortæller at ejs ligger i views 

//brug de forskellige ruter 
app.use("/", userRoutes);
app.use("/dashboard", dashboardRoute);
app.use("/konto", accountRoute);
app.use("/portefolje", portfolioRoutes);

//start serveren 
app.listen(3000, () => {
  console.log("http://localhost:3000");
});



