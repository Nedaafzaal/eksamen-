const assert = require("assert");
const kontoController = require("../controllers/accountController");
const kontoModel = require("../models/accountModel");

//uni test på funktionen VisAlleKonti
async function testVisAlleKonti() {
  
  // 🔧 MOCK: erstatter hentAlleKonti med en version, der returnerer testdata
  kontoModel.hentAlleKonti = async () => [
    { kontoID: 1, navn: "Konto A" },
    { kontoID: 2, navn: "Konto B" }
  ];

  // 🔧 MOCK: laver en simpel res-objekt som kan opfange render-kaldet
  const res = {
    view: null,
    data: null,
    render(viewNavn, data) {
      this.view = viewNavn;
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

  // 🧪 Kør controller-funktionen med en tom req og mock res
  await kontoController.visAlleKonti({}, res);

  // ✅ Tjek at det rigtige view bliver brugt
  assert.strictEqual(res.view, "kontiOversigt");

  // ✅ Tjek at der blev sendt 2 konti
  assert.strictEqual(res.data.konti.length, 2);

  // ✅ Tjek at en konto har det rigtige navn
  assert.strictEqual(res.data.konti[0].navn, "Konto A");

  console.log("✅ TEST BESTÅET: visAlleKonti viser konti korrekt.");
}

// Kør testen
testVisAlleKonti();