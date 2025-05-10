const assert = require("assert");
const kontoController = require("../controllers/accountController");
const kontoData = require("../models/accountModel");

//uni test på funktionen VisAlleKonti
async function testVisAlleKonti() {
  
  //test 1: skal retunere to fiktive konti i stedet for at hente fra databasen 
  kontoData.hentAlleKontiForBruger = async () => [
    { kontoID: 1, navn: "Konto A" },
    { kontoID: 2, navn: "Konto B" }
  ];

  //test 2: Vi laver en kopi af res, så vi kan gemme og undersøge det controlleren prøver at vise eller sende men uden at starte en rigtig server
  const res = {
    view: null, //gemmer navnet på view-filen 
    data: null, //gemmer dataen som controlleren prøver at sende til view
    render(viewNavn, data) {
      this.view = viewNavn; //fanger view navnet
      this.data = data; //fanger dataen 
    },
    status(code) { //bruges hvis controllleren sætter en status kode 
      this.statusCode = code;
      return this;
    },
    send(msg) { //bruges hvis controlleren sender en fejlbesked 
      this.message = msg;
    }
  };

  //mock request med cookies
  const req = {
    cookies: {
      brugerID: 1
    }
  };

  //kør controller funktionen 
  await kontoController.visAlleKonti(req, res);

  //det skal væere den rigtige ejs fil der bliver brugt 
  assert.strictEqual(res.view, "kontiOversigt");

  //tjekker om der blev sendt to konti
  assert.strictEqual(res.data.konti.length, 2);

  //den første konto skal hedde konto A
  assert.strictEqual(res.data.konti[0].navn, "Konto A");

  console.log("TEST BESTÅET: visAlleKonti viser konti korrekt.");
}

//kalder funktionen så testen kører
testVisAlleKonti();
