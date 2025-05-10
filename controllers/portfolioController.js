//importerer node-fetch og modeller
const fetch = require("node-fetch"); 
const portfolioModel = require("../models/portfolioModel");
const accountModel = require("../models/accountModel");


//funktion til at vise alle porteføljer for brugeren
async function visPorteføljeOversigt(req, res) {
    try {
      const brugerID = parseInt(req.cookies.brugerID); 

      if (!brugerID) {
        return res.status(401).send("Bruger er ikke logget ind");
      }

      const porteføljer = await portfolioModel.hentAllePorteføljerForBruger(brugerID);
    
    //ydre forloop som gennemgår hver portefølje og henter dens tilknyttede aktier
    for (const portefølje of porteføljer) {
        const aktier = await portfolioModel.hentVærdipapirTilPortefølje(portefølje.porteføljeID);
        let samletVærdi = 0; //initialisere samletværdi fra denne portefølje
        
      
        for (const aktie of aktier) {
            samletVærdi += aktie.pris * aktie.antal; //lægger værdien af hver aktie til totalen
        }

        portefølje.totalValue = samletVærdi; //gemmer totalvalue som en egenskab på portefølje-objektet
    }
    
  let totalVærdi = 0; //sætter startsværdien af totalværdi = 0 for at undgå fejl

        //gennemgår hver portefølje og lægger deres værdi sammen
        for (const portefølje of porteføljer) {
        if (portefølje.totalValue) {
            totalVærdi += portefølje.totalValue; //lægger til hvis der findes en værdi
        } else {
            totalVærdi += 0; //lægger 0 til hvis ingen værdi findes
        }
    }

      res.render("portefoljeOversigt", { porteføljer, totalVærdi });

    } catch (err) {
      console.error("Fejl ved hentning af porteføljer", err);
      res.status(500).send("Noget gik galt ved visning af din porteføljeoversigt");
    }
  }
  
  
//funktion som henter portefølje og dens tihørende aktier
async function visEtPortefølje(req, res) {
  const porteføljeID = parseInt(req.params.id);
  if (isNaN(porteføljeID)) {
    return res.status(400).send("Ugyldigt porteføljeID");
  }

  try {
    const portefølje = await portfolioModel.hentPorteføljeMedID(porteføljeID);
    if (!portefølje) {
      return res.status(404).send("Portefølje blev ikke fundet");
    }

    const værdipapirer = await portfolioModel.hentVærdipapirTilPortefølje(porteføljeID);
    const historik = await portfolioModel.hentVærdiHistorik(porteføljeID);

    let samletVærdi = 0; //initialiserer samlet værdi til 0

    //beregner samlet værdi for alle værdipapirer med forloop igennem alle værdipapirer
    for (let i = 0; i < værdipapirer.length; i++) {
      samletVærdi += værdipapirer[i].antal * værdipapirer[i].pris;
    }
    res.render("portefolje", { portefølje, værdipapirer, samletVærdi, historik });
  } catch (err) {
    console.error("Fejl under visning af portefølje", err);
    res.status(500).send("Noget gik galt ved visning af portefølje");
  }
}


//funktion som viser formular for oprettelse af portefølje
async function visOpretPorteføljeFormular(req, res) {
    const brugerID = parseInt(req.cookies.brugerID);
    try {
      const konti = await portfolioModel.hentKontiForBruger(brugerID);
      res.render("opretportefolje", { konti });
    } catch (err) {
      console.error("Fejl ved hentning af konto", err);
      res.status(500).send("Kunne ikke hente den ønskede konto");
    }
  }


//funktion hvor oprettelsen sker af portefølje
async function opretPortefølje(req, res) {
    const navn = req.body.navn;
    const kontoID = req.body.kontoID;
    const brugerID = req.cookies.brugerID;
  
    if (!brugerID) {
      return res.status(401).send("Bruger er ikke logget ind");
    }
  
    try {
        //sender det hentede navn og kontoID videre til modellen
        await portfolioModel.opretNyPortefølje({
            navn,
            kontoID: parseInt(kontoID)
          });
      res.redirect("/portefolje/oversigt"); //brugeren bliver redirectet til oversigten
    } catch (err) {
      console.error("Fejl ved oprettelse af portefølje", err);
      res.status(500).send("Kunne ikke oprette den ønskede portefølje");
    }
  }
  
  
//funktion som henter transaktioner for portefølje
async function hentTransaktionerForPortefølje(req, res) {
    const porteføljeID = parseInt(req.params.id); //tager fat i porteføljeID fra URL og konverterer til heltal
    if (isNaN(porteføljeID)) {
      return res.status(400).send("Ugyldigt porteføljeID");
    }

    try {
      const transaktioner = await portfolioModel.hentTransaktionerForPortefølje(porteføljeID);
      const portefølje = await portfolioModel.hentPorteføljeMedID(porteføljeID);
  
      res.render("handelshistorik", { transaktioner, portefølje });

    } catch (err) {
      console.error("Fejl ved indlæsning af handelshistorik", err);
      res.status(500).send("Kunne ikke hente handelshistorik");
    }
  }


//funktion som gør det muligt at søge på værdipapir
async function søgEfterPapir(req, res) {
  const søgning = req.query.query;
  const porteføljeID = req.params.id;

  if (!søgning) {
      return res.status(400).send("Skriv venligst noget i feltet");
    }
    try {
        //bygger et link til Alpha Vantage til at søge efter aktier, sender en GET-anmodning til URL og parser til JSON-objekt
        const søgeLink = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${søgning}&apikey=${process.env.API_KEY}`;
        const svar = await fetch(søgeLink);
        const data = await svar.json();
        //console.log("Alpha Vantage:", data); brugt til debugging
    
    //henter det første match af søgningen, og gemmer det i en konstant
    const resultat = data.bestMatches[0];

    if (!resultat) {
      return res.send("Ingen værdipapir blev fundet");
    }

    //søgningsresultatet svarer tilbage i et objekt, og vi henter symbolet og navnet fra svaret
    const symbol = resultat["1. symbol"];
    const navn = resultat["2. name"];

    //for at hente den aktuelle pris bygger vi et nyt URL
    const prisLink = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${process.env.API_KEY}`;
    const prisSvar = await fetch(prisLink);
    const prisData = await prisSvar.json();

    //tager fat i key=05 fra Alpha's svar, som svarer til prisen. Hvis ikke den kan findes, skal "ukendt" sættes for at undgå at programmet crasher
    const pris = prisData["Global Quote"]["05. price"] || "Ukendt";

    const brugerID = req.cookies.brugerID;
    const konti = await portfolioModel.hentKontiForBruger(brugerID);
    
    let kontoID = null; //sætter kontoID lig null

    //der tjekkes for tre ting 1: hvis konti eksisterer, 2: kontilisten ikke er tom, 3: første element i kontilisten har et kontoID. Hvis dette er sandt, gemmes kontoID for første element
    if (konti && konti.length > 0 && konti[0].kontoID) {
    kontoID = konti[0].kontoID; 
    }

    res.render("searchPapir", {
      result: { symbol, navn, pris },
      porteføljeID,
      kontoID
    });

  } catch (fejl) {
    console.error(fejl);
    res.status(500).send("Fejl under søgning");
  }
}


//viser formular til at købe værdipapir
async function visBuyPapirForm(req, res) {
    const porteføljeID = parseInt(req.params.id); //omformaterer porteføljeID til heltal
    const symbol = req.query.symbol;
    const navn = req.query.navn;
    const pris = req.query.pris;
    
    //hvis hverken symbol, navn eller pris findes
    if (!symbol || !navn || !pris) {
      return res.status(400).send("Mangler nødvendige oplysninger i URL");
    }
  
    try {
      const portefølje = await portfolioModel.hentPorteføljeMedID(porteføljeID);
      if (!portefølje) {
        return res.status(404).send("Portefølje kunne ikke findes");
      }
      const konto = await accountModel.hentKontoMedID(portefølje.kontoID);
      if(!konto){
        return res.status(404).send("Tilknyttet konto findes ikke");
      }
      
      //sender følgende objekt videre til buyPapir.ejs, for at vise købssiden for et værdipapir
      res.render("buyPapir", {
        tickerSymbol: symbol,
        navn,
        pris,
        porteføljeID,
        konto,
        transaktionstype: "køb", //typen sættes som "køb"
        værditype: "Aktie", 
        gebyr: 0, //hardcoder gebyr til 0 ved køb af aktier
        tidspunkt: new Date().toISOString() //opretter den aktuelle tid og dato og konverterer til ISO format: YYYY-MM-DDTHH:mm:ss.sss som er dato og tidspunkt
      });
  
    } catch (err) {
      console.error("Fejl i visBuyPapirForm", err);
      res.status(500).send("Noget gik galt ved visning af køb-formular");
    }
  }


//funktion hvor handlen foregår
async function købEllerSælg(req, res) {
    try {
      //henter alle handelsoplysninger (data objektet) fra formularen og konverterer til rigtige værdityper  
      const data = {
        porteføljeID: parseInt(req.body.porteføljeID), 
        kontoID: parseInt(req.body.kontoID),
        type: req.body.transaktionstype, 
        pris: parseFloat(req.body.pris),
        gebyr: 0,
        antal: parseInt(req.body.antal),
        tickerSymbol: req.body.tickerSymbol,
        værditype: req.body.værditype,
        navn: req.body.navn
      };
    
      const konto = await accountModel.hentKontoMedID(data.kontoID);
        if (!konto || !konto.aktiv) {
        return res.status(403).send("Kontoen er lukket, dermed er ingen handel mulig");
        }
  
      await portfolioModel.registrerHandel(data);
  
      //opdaterer sidste handelsdato
      await portfolioModel.opdaterSidsteHandelsDato(data.porteføljeID);
  
      //omdirigerer bruger til sit portefølje med oversigt over værdipapirer
      res.redirect(`/portefolje/${data.porteføljeID}`);
    } catch (err) {
      console.error("Fejl under køb/salg", err.message);
      res.status(400).send("Fejl under handel " + err.message);
    }
  }
  

//funktion der viser detaljer om værdipapir
async function visVærdipapirDetaljer(req, res) {
    const værdipapirID = parseInt(req.params.id);
    if (isNaN(værdipapirID)) {
      return res.status(400).send("Ugyldigt værdipapirID");
    }
    try {
      //henter og opdaterer urealiseret gevinst/tab fra model
      const værdipapir = await portfolioModel.hentOgOpdaterVærdipapirMedAktuelVærdi(værdipapirID);
      if (!værdipapir) {
        return res.status(404).send("Værdipapir blev ikke fundet");
      }

  //henter historik for værdipapir
  const historik = await portfolioModel.hentHistorikForVærdipapir(værdipapirID);
      res.render("valueInfo", { værdipapir, historik });
    } catch (err) {
      console.error(err);
      res.status(500).send("Fejl ved indlæsning af værdipapir");
    }
  }

  
  //funktion der henter formular for sælg papir
  async function sælgPapirForm(req, res) {
    const værdipapirID = parseInt(req.params.id);
    const værdipapir = await portfolioModel.hentVærdipapirMedID(værdipapirID);   
    if (!værdipapir) {
      return res.status(404).send("Værdipapir blev ikke fundet");
    }
  
    const porteføljeID = værdipapir.porteføljeID;
  
    //henter det portefølje som værdipapir tilhører
    const portefølje = await portfolioModel.hentPorteføljeMedID(porteføljeID);
    if (!portefølje) {
      return res.status(404).send("Portefølje blev ikke fundet");
    }
  
    //henter den konto, portefølje tilhører
    const konto = await accountModel.hentKontoMedID(portefølje.kontoID);
    if (!konto) {
      return res.status(404).send("Konto blev ikke fundet");
    }
    
    //sender følgende objekt med tilhørende egenskaber til sellPapirForm.ejs
    res.render("sellPapirForm", {
      værdipapir,
      tickerSymbol: værdipapir.tickerSymbol,
      navn: værdipapir.navn, 
      pris: værdipapir.pris,
      porteføljeID,
      konto, 
      transaktionstype: "sælg",
      værditype: "Aktie",
      gebyr: 0,
      tidspunkt: new Date().toISOString()
    });
  }
  

  //funktion som henter kurs udvikling til visualisering
  async function hentKursudvikling(req, res) {
    const symbol = req.params.symbol.toUpperCase();
    const apiKey = "0ZX3UVLPJVTJZ5AG";
  
    //bygger et link til Alpha Vantage for at hente daglige kurser
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apiKey}`;
    try {
      const svar = await fetch(url);
      const data = await svar.json();

      if (!data["Time Series (Daily)"]) {
        return res.status(400).json({ fejl: "Ugyldigt symbol eller ingen data fundet denne gang" });
      }
  
      //da grafen skal være pænt visuelt og ikke fylde for meget, henter vi kun data fra et år siden. Vi opretter derfor en dato for præcis et år siden
      const forEtÅrSiden = new Date();
      forEtÅrSiden.setFullYear(forEtÅrSiden.getFullYear() - 1);
  
      //laver kursdataen fra API til en liste af dato og kursinfo
        const kursListe = Object.entries(data["Time Series (Daily)"]);

        const historik = []; 

        //forloop som gennemgår hver dato i kurslisten
        for (const [dato, værdier] of kursListe) {
        const dagsDato = new Date(dato); 

        //tjekker om dagsdato er indenfor det seneste år
        if (dagsDato >= forEtÅrSiden) {

            //henter lukkeprisen og laver et nyt objekt med dato og pris
            const lukkepris = parseFloat(værdier["4. close"]);

            //pusher dato og pris ind i historiklisten
            historik.push({
            dato: dato,
            pris: lukkepris
            });
        }
        }
        //sorterer historikken så de ældste datoer kommer først
        historik.sort((a, b) => new Date(a.dato) - new Date(b.dato));
  
      if (historik.length === 0) {
        return res.status(404).json({ fejl: "Ingen data fundet for sidste år" });
      }
      res.json(historik); //sender historikken som svar i JSON-format
  
    } catch (fejl) {
      console.error("Noget gik galt", fejl);
      res.status(500).json({ fejl: "Noget gik galt på serveren" });
    }
  }
  
module.exports = {
  visPorteføljeOversigt,
  visEtPortefølje,
  visOpretPorteføljeFormular,
  opretPortefølje,
  hentTransaktionerForPortefølje,
  søgEfterPapir,
  visBuyPapirForm,
  købEllerSælg,
  visVærdipapirDetaljer,
  sælgPapirForm,
  hentKursudvikling
};

