//importerer assert til at lave test og importerer portefølje controller og model
const assert = require("assert"); 
const portfolioController = require("../controllers/portfolioController");
const portefoljeData = require("../models/portfolioModel");

//tester vores controller-funktion visPorteføljeOversigt 
async function testVisPortefoljeOversigt() {

  //test1: snyder funktionen til at returnere to test-porteføljer baseret på ID
  portefoljeData.hentAllePorteføljerForBruger = async () => [
    { porteføljeID: 2 },
    { porteføljeID: 5 }
  ];

  //test 2: snyder funktionen til at returnere testdata for værdipapirer
  portefoljeData.hentVærdipapirTilPortefølje = async (id) => {
    if (id === 2) return [{ pris: 100, antal: 2 }]; //200
    if (id === 5) return [{ pris: 50, antal: 1 }];  //50
    return [];
  };
  //request-objekt med brugerID
  const req = {
    cookies: {
      brugerID: 1
    }
  };

  //test 3: response-objekt
  const res = {
    data: null,    //gemmer dataen, som controlleren sender til EJS-skabelonen
    view: null,    //gemmer navnet på det view, som controlleren forsøger at vise
    statusCode: null,
    message: null,

    render(view, data) {
      this.view = view;
      this.data = data;
    },

    status(code) {
      this.statusCode = code;
      return this;
    },

    send(msg) {
      this.message = msg;
    }
  };

  //kør funktionen
  await portfolioController.visPorteføljeOversigt(req, res);

  //test 1: samlet værdi skal være 250
  assert.strictEqual(res.data.totalVærdi, 250, "Samlet værdi skulle være 250 DKK");

  //test 2: porteføljeID 2 og 5 skal findes i resultaterne
  const ids = res.data.porteføljer.map(p => p.porteføljeID);
  assert.ok(ids.includes(2), "PorteføljeID 2 mangler");
  assert.ok(ids.includes(5), "PorteføljeID 5 mangler");

  //test 3: korrekt view skal bruges
  assert.strictEqual(res.view, "portefoljeOversigt", "Forkert view blev brugt");

  //hvis alle tests passer, vis succes
  console.log("TEST BESTÅET: Totalværdi og porteføljeID'er er korrekte.");
}

//kalder test funktionen
testVisPortefoljeOversigt();
