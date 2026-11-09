# Architektur

## Ziel und Grenzen

ezPDF wächst in kleinen, überprüfbaren Schritten. Version 0.2.0 trennt Lesen und Bearbeiten: Dokument öffnen → sofort ansehen; erst auf Anforderung analysieren → Felder bearbeiten → als interaktive PDF speichern → erneut öffnen. Eine ausgereifte PDF-Suite benötigt darüber hinaus eine breite Testdokument-Sammlung, Performance- und Barrierefreiheitsarbeit sowie eine eigene Strategie für Textbearbeitung, Signaturen und OCR.

## Verantwortlichkeiten

`desktop/main.cjs` besitzt nur Dateidialoge, Dateizugriff, Druckdialog und Lifecycle. `build/installer.nsh` registriert Dateitypen und Standard-App-Fähigkeiten pro Benutzer, ohne die geschützte UserChoice zu ändern. Der Renderer erhält ausgewählte Dokumentbytes und kann ausschließlich über den Speicherdialog schreiben. Keine allgemeinen Dateisystem- oder Shell-APIs in der Brücke. Ein lokales Protokoll liefert nur Dateien innerhalb des Build-Verzeichnisses aus. Renderer sind sandboxed, ohne Node-Integration, mit Context Isolation und Content Security Policy.

`src/domain.ts` definiert das unabhängige Feldmodell. Koordinaten sind PDF-Punkte in ungedrehter CropBox-Ansicht mit Ursprung links oben. Dieses Modell bildet die Schnittstelle zwischen Erkennung, Oberfläche und Export.

`src/pdf/detection.ts` enthält die heuristische Erkennung und Beschriftungszuordnung ohne React/Electron. Die Erkennung unterscheidet nahe benachbarte graue Regionen und filtert zu kleine oder zu große Flächen. Farben werden absichtlich konservativ gefiltert. Labelsuche priorisiert Beschriftungen unterhalb des Feldes, danach oberhalb.

`src/pdf/engine.ts` adaptiert PDF.js und pdf-lib. Native Felder haben Vorrang; überlappende visuelle Treffer werden entfernt. Beim Export werden vorhandene native Felder aktualisiert und erkannte/manuelle Textfelder mit stabilen Labels und Appearance-Streams hinzugefügt. Das Original wird nicht automatisch überschrieben. Die UI kann den Namen im Speicherdialog ändern.

`src/state/useDocumentSession.ts` besitzt den Dokument-Lifecycle, die Modi, die verzögerte Analyse und explizite Save/Discard/Cancel-Aktionen. Nach erfolgreichem Speichern wird die geschriebene PDF erneut geöffnet und als neue Basis verwendet; wiederholtes Speichern erzeugt deshalb keine doppelten Felder. Der Desktop-Speicherdialog meldet Abbruch explizit zurück; nur erfolgreicher Export setzt den Änderungsstatus zurück.

`src/state/fields.ts` ist ein reiner Reducer mit begrenztem Undo/Redo-Verlauf, gespeicherter Basis, synchronisierten nativen Mehrfach-Widgets und Begrenzung der Feldgeometrie auf die Seite. Rückgängig bis zur Basis entfernt auch den Änderungsstatus. Drag/Resize arbeitet mit lokaler Vorschau und genau einer Zustandsänderung pro abgeschlossener Geste.

`src/ui/App.tsx` verbindet diese Module. `DocumentViewer` steuert fortlaufendes Scrollen, Navigation und automatische Größenanpassung. `PageView` rendert mit PDF.js nur nahe Seiten, ergänzt eine nichtinteraktive Textebene für Auswahl/Suche und zeigt Feld-Overlays ausschließlich im Bearbeitungsmodus. Native Formular-Appearances sind im Viewer sichtbar, aber nicht bedienbar. `FieldInspector`, `Toolbar`, `Thumbnails`, `SearchBar` und `ConfirmDialog` haben eigene Verantwortlichkeiten.

`src/pdf/search.ts` erstellt bei Bedarf einen dokumentgebundenen Textcache. Trefferoffsets werden auf Original-Textfragmente zurückgeführt; die Oberfläche hebt die tatsächlichen Bereiche hervor. Suchläufe sind abbrechbar und begrenzt. Die PDF-Texte werden als Textknoten verarbeitet, nicht als HTML.

`src/pdf/print.ts` erzeugt eine temporäre, nur im Druckmedium sichtbare Dokumentansicht. Jede PDF-Seite erhält ihre eigene Seitengröße ohne UI oder Ränder; anschließend öffnet der Hauptprozess den nativen Druckdialog. Bei ungespeicherten Änderungen wird nur für den Druck ein temporärer PDF-Export erzeugt, ohne den Sitzungszustand als gespeichert zu markieren. Druckseiten werden gerastert (bis zu 150 dpi).

`assets/brand/ezpdf-icon.svg` ist die gemeinsame Logoquelle. `scripts/generate-icons.mjs` erzeugt PNG/ICO reproduzierbar. Der Builder editiert EXE-Ressourcen ausdrücklich, während Codesignierung unabhängig davon deaktiviert bleibt. Dadurch enthalten die Windows-Metadaten ezPDF statt Electron.

## Nächste sinnvolle Extraktionen

Als Nächstes bieten sich Erkennungsprovider mit Konfidenz und nachvollziehbaren Kandidaten sowie getrennte Lese-/Exportadapter hinter einem Engine-Interface an. Bei größeren Dokumenten kann die Seiten-DOM zusätzlich virtualisiert werden; aktuell werden die teuren Canvases freigegeben, während leichte Platzhalter im Scrollfluss bleiben. Kein Plugin-System ohne konkrete zweite Implementierung.

## Qualität

Unit-Tests prüfen wichtige Erkennungseigenschaften. Der Desktop-Test erstellt eigene Dokumente, bearbeitet native Felder, Checkboxen, graue Regionen und ergänzt Text auf einer zweiten Seite. Das Ergebnis wird mit pdf-lib erneut eingelesen und in der App geöffnet. Ein optionales privates Referenzdokument bleibt lokal. Installer-Build und Tests laufen in Windows-CI.

Weitere notwendige Tests vor breiter Verteilung: verschiedene CropBoxes, Drehungen, Zeichen außerhalb WinAnsi, lange mehrzeilige Werte, beschädigte Formulartrees, PDFs mit Signaturen, große Dokumente und realer Standard-App-Start nach Installation. Die Erkennung ist eine Hilfe, keine garantierte Interpretation beliebiger Dokumente.

## Referenzen

- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)
- [PDF.js](https://github.com/mozilla/pdf.js)
- [pdf-lib Form API](https://pdf-lib.js.org/docs/api/classes/pdfform)
