//Vi laver en funktion som viser listen af oversigt. Dette gør vi for at undgå duplikering og mere orden i koden, da vi flere steder skal vise oversigten
function lavListe(data, egenskab, fejlBesked) {
  if (data.length === 0) { // Hvis data ikke eksisterer, returnerer den fejlbesked
      return `<p>${fejlBesked}</p>`;
  }

  let html = ''; // Starter med en tom tekststreng.

  data.forEach(element => { // For hvert element i tabellen. Fx én konto, én transaktion -> Altså den tager et element, fx "Lønkont"

      html += `<div class="række">`; // Skal den lave en div med klassen "række"
      
      egenskab.forEach(egenskab => { // Den gennemgår hvert egenskab (kontonavn, saldo, valuta fx.) Tjekker igennem om lønkonto har saldo, valuta osv. 
          // Hvis egenskaben findes på elementet, så vis det. Hvis ikke, så vis en tom tekst.
          if (element[egenskab] !== undefined) {
              html += `<div>${element[egenskab]}</div>`;
          } else {
              html += `<div></div>`; // Hvis feltet mangler, laver vi bare en tom div
          }
      });

      html += `</div>`; // Slutter rækken
  });

  return html; // Returnerer alt den genererede HTML
}

