const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const userRoutes = require("./routes/userRoute"); // samlet rute til login, opret, indstillinger
const dashboardRoute = require("./routes/dashboardRoute");
const accountRoute = require("./routes/accountRoute");
const portfolioRoutes = require("./routes/portfolioRoute");


const app = express();

// Gør det muligt at læse form-data og serve CSS mv.
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Brug EJS som template engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Brug ruter
app.use("/", userRoutes);
app.use("/dashboard", dashboardRoute);
app.use("/konto", accountRoute);
app.use("/portefolje", portfolioRoutes);



// app.use("/portefolje", portefoljeRoute);

// Start server
app.listen(3000, () => {
  console.log("http://localhost:3000");
});



