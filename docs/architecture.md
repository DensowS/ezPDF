# Architektur

## Ziel und Grenzen

ezPDF soll in kleinen, überprüfbaren Schritten wachsen. Die erste vertikale Funktion ist: Dokument öffnen → analysieren → Felder bearbeiten → als interaktive PDF speichern → erneut öffnen. Eine ausgereifte PDF-Suite benötigt darüber hinaus eine breite Testdokument-Sammlung, Performance- und Barrierefreiheitsarbeit sowie eine eigene Strategie für Textbearbeitung, Signaturen und OCR.

## Verantwortlichkeiten

`desktop/main.cjs` besitzt nur Dateidialoge, Dateizugriff, Lifecycle und Dateizuordnung. Der Renderer erhält ausgewählte Dokumentbytes und kann ausschließlich über den Speicherdialog schreiben. Keine allgemeinen Dateisystem- oder Shell-APIs in der Brücke. Ein lokales Protokoll liefert nur Dateien innerhalb des Build-Verzeichnisses aus. Renderer sind sandboxed, ohne Node-Integration, mit Context Isolation und Content Security Policy.

`src/domain.ts` definiert das unabhängige Feldmodell. Koordinaten sind PDF-Punkte in ungedrehter CropBox-Ansicht mit Ursprung links oben. Dieses Modell bildet die Schnittstelle zwischen Erkennung, Oberfläche und Export.

`src/pdf/detection.ts` enthält die heuristische Erkennung und Beschriftungszuordnung ohne React/Electron. Die Erkennung unterscheidet nahe benachbarte graue Regionen und filtert zu kleine oder zu große Flächen. Farben werden absichtlich konservativ gefiltert. Labelsuche priorisiert Beschriftungen unterhalb des Feldes, danach oberhalb.

`src/pdf/engine.ts` adaptiert PDF.js und pdf-lib. Native Felder haben Vorrang; überlappende visuelle Treffer werden entfernt. Beim Export werden vorhandene native Felder aktualisiert und erkannte/manuelle Textfelder mit stabilen Labels und Appearance-Streams hinzugefügt. Das Original wird nicht automatisch überschrieben. Die UI kann den Namen im Speicherdialog ändern.

`src/ui/` hält den Arbeitszustand und das aktuelle Dokument. Der Desktop-Speicherdialog meldet Abbruch explizit zurück; nur erfolgreicher Export setzt den Änderungsstatus zurück. Ein begrenzter Verlauf erlaubt das Zurücknehmen von Feldänderungen und Feldplatzierungen.

## Nächste sinnvolle Extraktionen

Sobald eine weitere Bearbeitungsart hinzukommt: `DocumentSession`/Reducer für Zustand und Befehle, gesonderte PageView-/FieldInspector-Komponenten, Erkennungsprovider mit Konfidenz und nachvollziehbaren Kandidaten. PDF.js-Anbindung und Export dann als separate Adapter hinter einem Engine-Interface. Kein Plugin-System ohne konkrete zweite Implementierung.

## Qualität

Unit-Tests prüfen wichtige Erkennungseigenschaften. Der Desktop-Test erstellt eigene Dokumente, bearbeitet native Felder, Checkboxen, graue Regionen und ergänzt Text auf einer zweiten Seite. Das Ergebnis wird mit pdf-lib erneut eingelesen und in der App geöffnet. Ein optionales privates Referenzdokument bleibt lokal. Installer-Build und Tests laufen in Windows-CI.

Weitere notwendige Tests vor breiter Verteilung: verschiedene CropBoxes, Drehungen, Zeichen außerhalb WinAnsi, lange mehrzeilige Werte, beschädigte Formulartrees, PDFs mit Signaturen, große Dokumente und realer Standard-App-Start nach Installation. Die Erkennung ist eine Hilfe, keine garantierte Interpretation beliebiger Dokumente.

## Referenzen

- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)
- [PDF.js](https://github.com/mozilla/pdf.js)
- [pdf-lib Form API](https://pdf-lib.js.org/docs/api/classes/pdfform)
