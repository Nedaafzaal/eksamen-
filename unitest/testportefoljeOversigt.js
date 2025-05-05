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

 //snyder funktionen til at retunere test data
  portfolioModel.hentVærdipapirerTilPortefølje = async (id) => {
    if (id === 2) return [{ pris: 100, antal: 2 }]; // 200
    if (id === 5) return [{ pris: 50, antal: 1 }];  // 50
    return [];
  };

  //vi laver vores egen version af res, så vi kan teste, om controlleren sender det rigtige data.
  const res = {
    data: null, //her gemmes data fra controlleren prøver at vise 
    render(view, data) {
      this.data = data; //når controlleren kalder res.render fanger vi data her 
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

//hvis testen er ok så skal der vises denne succes besked i consollen 
  console.log("✅ TEST BESTÅET: Totalværdi og porteføljeID'er er korrekte.");
}

//kalder funktionen så så testen køres 
testVisPortefoljeOversigt();