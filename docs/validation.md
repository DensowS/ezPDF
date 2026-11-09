# Validierung der ersten Version

Lokal auf Windows x64 geprüft:

- TypeScript-Prüfung und Produktionsbuild.
- Erkennungstest mit benachbarten grauen Feldern und separaten Beschriftungen.
- Electron-Integrationstest mit synthetischer zweiseitiger PDF: native Textfelder und Checkboxen, zusätzliche visuelle Felder, manuelle Textplatzierung auf Seite 2, Speichern und erneutes Öffnen.
- Privates Referenzdokument: fünf graue Bereiche erkannt und passende Labels zugeordnet; Export als fünf AcroForm-Widgets mit gespeicherten Werten. Zusätzlich mit pypdf und einem unabhängigen Renderer (PyMuPDF) geprüft und visuell kontrolliert. Das Referenzdokument wird nicht veröffentlicht.

`npm audit` meldete beim initialen Build sechs moderate Meldungen in transitiven Build-Werkzeugen von electron-builder (minimatch). Keine dieser Meldungen betrifft die Produktionsabhängigkeiten der PDF-Oberfläche. Dies ersetzt keine Sicherheitsprüfung. Updates des Build-Stacks vor breiter Distribution prüfen; keine erzwungene Major-Abwertung des Builders allein zur Unterdrückung von Audit-Meldungen.

Auch die gepackte `ezPDF.exe` hat denselben Integrationstest erfolgreich durchlaufen, einschließlich Speicherabbruch und erneutem Öffnen ohne doppelte Felder. Der NSIS-Installer wurde erzeugt. Installation und die Zuweisung als tatsächliche Windows-Standard-App verändern das Nutzersystem und sind kein Teil des automatisierten Tests. Die Dateizuordnung ist im Installer deklariert. Für eine breite Veröffentlichung fehlen insbesondere Codesignatur, ein breiter PDF-Kompatibilitätskorpus und Lasttests.
