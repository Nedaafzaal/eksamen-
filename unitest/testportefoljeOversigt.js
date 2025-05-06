const assert = require("assert"); //importere assert til at lave test
const portfolioController = require("../controllers/portfolioController");
const portfolioModel = require("../models/portfolioModel");

//tester vores controller funktion VisPortefoljeOversigt 
async function testVisPortefoljeOversigt() {
  
  //test 1: snyder funktionen til at retunere to test porteføljer baseret på id 
  portfolioModel.hentAllePortefoljer = async () => [
    { porteføljeID: 2 },
    { porteføljeID: 5 }
  ];

 //test 2: snyder funktionen til at retunere test data
  portfolioModel.hentVærdipapirerTilPortefølje = async (id) => {
    if (id === 2) return [{ pris: 100, antal: 2 }]; // 200
    if (id === 5) return [{ pris: 50, antal: 1 }];  // 50
    return [];
  };

  //test 3: vi laver vores egen version af res, så vi kan teste om controlleren sender det rigtige data.
  const res = {
    data: null, //gemmer dataen, som controlleren sender til EJS-skabelonen
    view: null, //gemmer navnet på det EJS-view, som controlleren prøver at vise
    render(view, data) {
      this.view = view; //når controlleren kalder res.render gemmes view navnet her 
      this.data = data; //dataen gemmes her 
    }
  };
  
  //kør funktionen 
  await portfolioController.visPortefoljeOversigt({}, res);

 //test 1: værdien skal blive 250 
  assert.strictEqual(res.data.totalVærdi, 250, "Samlet værdi skulle være 250 DKK");

 //test 2: portefølje ID 2 og 5 skal findes i resultater 
  const ids = res.data.portefoljer.map(p => p.porteføljeID);
  assert.ok(ids.includes(2), "PorteføljeID 2 mangler");
  assert.ok(ids.includes(5), "PorteføljeID 5 mangler");
  //test 3
  assert.strictEqual(res.view, "portefoljeOversigt", "Forkert view blev brugt");


//hvis testen er ok så skal der vises denne succes besked i consollen 
  console.log("TEST BESTÅET: Totalværdi og porteføljeID'er er korrekte.");
}

//kalder funktionen så testen køres 
testVisPortefoljeOversigt();
