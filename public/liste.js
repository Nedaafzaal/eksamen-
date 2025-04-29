
//Vi laver en funktion som viser listen af oversigt. Dette gør vi for at undgå duplikering og mere orden i koden, da vi flere steder skal vise oversigten
function lavListe(data, egenskab, fejlBesked) {
  if (data.length === 0) { //Hvis data ikke eksisterer, returnerer den fejlbesked
      return `<p>${fejlBesked}</p>`;
  }

  let html = ''; //Starter med en tom string

  data.forEach(element => { 

      html += `<div class="række">`; //Tilføjer en div med klassen den "række"
      
      egenskab.forEach(egenskab => {  //løber igennem alle elementer i arrayet 
          if (element[egenskab] !== undefined) { //vis værdien hvis elementet har den givne egenskab
              html += `<div>${element[egenskab]}</div>`;
          } else {
              html += `<div></div>`; //indsætter en tom div hvis egenskaben mangler
          }
      });

      html += `</div>`; //Aflutter rækken
  });

  return html; // Returnerer den samlede HTML string 
}

