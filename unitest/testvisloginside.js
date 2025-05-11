const assert = require("assert"); 
const brugerController = require("../controllers/userController");

//tester funktionen VisLoginSide
function testVisLoginSide() {
 
  //test 1: Vi laver en kopi af res, så vi kan gemme og undersøge det controlleren prøver at vise eller sende men uden at starte en rigtig server
  const res = {
    view: null, //gemmer navnet på view filen 
    data: null, //gemmer dataen som controlleren prøver at sende 
    render(viewNavn, data) {
      this.view = viewNavn; //fanger view navnet
      this.data = data; //fanger dataen 
    }
  };

//kør controller funktionen
  brugerController.visLoginSide({}, res);

//tjekker om det rigtige view bliver brugt
  assert.strictEqual(res.view, "login");

//sørger for at siden ikke viser nogen fejlmeddelelser første gang brugeren besøger login-siden
  assert.strictEqual(res.data.fejl, null);

  //logger besked i konsollen hvis testen er en succes
  console.log("TEST BESTÅET: visLoginSide viser login-siden korrekt.");
}

//kør funktionen 
testVisLoginSide();

