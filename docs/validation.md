# Validierung von Version 0.2.1

Lokal auf Windows x64 geprüft:

- TypeScript-Prüfung und Produktionsbuild.
- Acht Unit-Tests: Erkennung benachbarter grauer Felder, Beschriftungszuordnung, Suche über Textfragmente/Zeilen, stabile Suchoffsets, Undo/Redo/Discard, synchronisierte native Felder und Begrenzung der Feldgeometrie.
- Electron-Integrationstest mit synthetischer zweiseitiger PDF: Startfenster mit exakt einem Öffnen-Button, Icon und Drag-and-drop-Hinweis; Viewer ohne Eingabefelder, Textauswahl und echte Zwischenablage-Kopie, Suche mit Treffern auf beiden Seiten, Miniatur-Navigation und Größenanpassung.
- Rechtsklick innerhalb einer Markierung löst das native Menü mit „Kopieren“ aus. Im Test wird der Menüaufruf abgefangen und die echte Standardaktion ausgeführt; der Inhalt der Zwischenablage muss der vollständigen Markierung entsprechen. Die Markierung bleibt beim Rechtsklick erhalten.
- Expliziter Wechsel in den Editor, native Textfelder und Checkboxen, zusätzliche visuelle Felder, manuelle Textplatzierung auf Seite 2, Feldlabel/Position/Größe ändern – sowohl numerisch als auch durch tatsächliche Mausgesten.
- Speichern, Speicherabbruch, Lesemodus-Abbruch und Verwerfen, Speichern beim Verlassen des Editors, erneutes Öffnen ohne doppelte Felder. Geschriebene Feldwerte, Beschriftung und Koordinaten unabhängig mit pdf-lib geprüft.
- Druckpipeline ohne echten Drucker getestet: Aufruf des Druckdialogs im Test abgefangen und dessen druckfertige Ansicht mit Chromium als lokale PDF erzeugt. Exakt zwei Seiten, keine zusätzliche Leerseite; ungespeicherte Werte sind enthalten und der Änderungsstatus bleibt erhalten. Mit PyMuPDF gerendert und visuell kontrolliert. Physische Drucker und ihre Treiberdialoge sind nicht getestet.
- 20-seitige Testdatei: erste und letzte Seite anzeigen, schnelle Zoomwechsel und Freigabe nicht sichtbarer Canvases prüfen.
- Privates Referenzdokument: Viewer ohne Formularanalyse/Overlays; erst nach Bearbeiten fünf graue Bereiche erkannt und passende Labels zugeordnet. Speichern und Rückkehr in den Viewer sowie erneute Analyse ohne doppelte Felder geprüft. Das Referenzdokument wird nicht veröffentlicht.

`npm audit` meldete beim initialen Build sechs moderate Meldungen in transitiven Build-Werkzeugen von electron-builder (minimatch). Keine dieser Meldungen betrifft die Produktionsabhängigkeiten der PDF-Oberfläche. Dies ersetzt keine Sicherheitsprüfung. Updates des Build-Stacks vor breiter Distribution prüfen; keine erzwungene Major-Abwertung des Builders allein zur Unterdrückung von Audit-Meldungen.

Auch die gepackte `ezPDF.exe` hat denselben Integrationstest erfolgreich durchlaufen. Windows-Metadaten `ProductName`, `FileDescription` und `InternalName` sind **ezPDF**, ProductVersion ist **0.2.1.0**. Das Icon wurde aus der fertigen EXE extrahiert und visuell kontrolliert; `scripts/verify-windows.ps1` prüft die Metadaten und vergleicht das eingebettete Icon pixelweise mit dem erzeugten Brand-Icon. Der NSIS-Installer mit eigenem Icon und per-user Dateiregistrierung wurde erfolgreich erzeugt.

Installation, Deinstallation, Shell-Caches und die tatsächliche Zuweisung als Windows-Standard-App sind kein Teil des automatisierten Tests. Die Registry-Makros sind im kompilierten Installer enthalten; vorhandene Standardzuordnungen bleiben unangetastet. Die Anzeige in einer konkreten vorhandenen Windows-Installation muss nach dem Update geprüft werden. Für eine breite Veröffentlichung fehlen insbesondere Codesignatur, ein breiter PDF-Kompatibilitätskorpus und Lasttests.
