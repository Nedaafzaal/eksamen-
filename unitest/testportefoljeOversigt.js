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

  //vi laver en simpel kopi af res.render() så vi kan gemme det data controlleren sender og derefter teste, om det er korrekt
  const res = {
    data: null, //her gemmes data fra controlleren prøver at vise 
    render(view, data) {
      this.data = data; //når controlleren kalder res.render fanger vi data her 
    }
  };

  // Kør funktionen
  await portfolioController.visPortefoljeOversigt({}, res);

  // ✅ Test 1: Tjek samlet værdi
  assert.strictEqual(res.data.totalVærdi, 250, "Samlet værdi skulle være 250 DKK");

  // ✅ Test 2: Tjek at porteføljeID 2 og 5 findes
  const ids = res.data.portefoljer.map(p => p.porteføljeID);
  assert.ok(ids.includes(2), "PorteføljeID 2 mangler");
  assert.ok(ids.includes(5), "PorteføljeID 5 mangler");

  console.log("✅ TEST BESTÅET: Totalværdi og porteføljeID'er er korrekte.");
}

// Kør testen
testVisPortefoljeOversigt();
