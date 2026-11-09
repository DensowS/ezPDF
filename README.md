# ezPDF

Ein lokaler PDF-Viewer für Windows mit ausdrücklich aktivierbarem Formular-Editor. Version 0.2.1 startet mit dem gewählten Icon, **PDF öffnen** und einem Drag-and-drop-Hinweis. Eine geöffnete PDF startet im Lesemodus: keine Feldmarkierungen, keine Eingaben, keine Formularanalyse. Erst **Bearbeiten** aktiviert die Werkzeuge.

## Funktionen

- PDF öffnen, per Drag-and-drop laden und fortlaufend durch das Dokument scrollen. Ganze Seite oder Seitenbreite einpassen, zoomen und Seiten direkt anspringen.
- Text markieren und mit **Rechtsklick → Kopieren** oder Strg+C kopieren. Im ganzen Dokument suchen (Strg+F), inklusive hervorgehobener Treffer und Navigation über Enter / Shift+Enter. Gescannten Bildseiten fehlt ohne OCR eine Textebene.
- Einklappbare Miniaturseiten und Drucken (Strg+P) über den nativen Druckdialog. Das Drucklayout enthält nur das Dokument. Ungespeicherte Feldwerte werden beim Drucken berücksichtigt.
- Seiten werden nur im oder nahe am sichtbaren Bereich gerendert; Offscreen-Canvases werden freigegeben. Formularanalyse erst nach Klick auf **Bearbeiten**.
- Echte Textfelder, Kontrollkästchen und einfache Auswahllisten bearbeiten.
- Helle graue Eingabeflächen erkennen und benachbarte Beschriftungen zuordnen. Erkannte Felder lassen sich entfernen; Zuordnung bitte prüfen.
- Eigene Textfelder per Klick ergänzen; Änderungen rückgängig machen und wiederholen. Erkannte oder ergänzte Felder per Griff verschieben/vergrößern oder Position/Größe über Zahlenwerte ändern. Beschriftungen lassen sich korrigieren.
- Speichern unter einem frei wählbaren Namen. Neu erkannte und ergänzte Felder werden als echte AcroForm-Textfelder gespeichert.
- Beim Wechsel zurück in den Lesemodus, beim Öffnen einer anderen Datei und beim Schließen: Änderungen speichern, verwerfen oder den Vorgang abbrechen.
- Lokale Verarbeitung ohne Konto, Cloud oder Dokument-Uploads.
- Das im Chat gewählte Icon, reproduzierbare mehrstufige Windows-Icons und Windows-Metadaten mit **ezPDF** statt **Electron**. Windows-Installer mit Registrierung für „Öffnen mit“, Standard-Apps und Öffnen über Kommandozeile/Explorer.

## Installation

Den Installer aus den [GitHub-Releases](https://github.com/DensowS/ezPDF/releases) ausführen, eine geöffnete alte ezPDF-Version vorher schließen. Danach in **Windows-Einstellungen → Apps → Standard-Apps → ezPDF** die Erweiterung `.pdf` zuweisen. Der Installer registriert ezPDF für den aktuellen Benutzer und überschreibt die geschützte Standardzuordnung nicht. Die Version ist weiterhin nicht codesigniert.

Wenn Windows noch einen alten „Electron“-Eintrag anzeigt, ezPDF mit dem neuen Installer aktualisieren und die PDF-Zuordnung erneut auf ezPDF setzen. Windows kann alte Shell-Anzeigen zwischenspeichern; ggf. Ab-/Anmelden. Eine parallel vorhandene Entwicklungs-`electron.exe` wird vom Installer nicht verändert.

## Entwicklung

Voraussetzungen: Windows x64, Node.js 24 LTS, npm, Git.

```powershell
npm ci
npm run desktop
```

`npm run dev` startet die Oberfläche im Browser; native Dateidialoge und Dateizuordnungen stehen im Desktop-Modus zur Verfügung. Der Browser nutzt Datei-Auswahl und Download.

```powershell
npm test
npm run build
npm run test:desktop
npm run dist
```

`npm run icons` erzeugt `build/icon.ico` (16–256 px) und `build/icon.png` aus der unverändert übernommenen Bildvorlage `assets/brand/ezpdf-icon.png`. Es wird ausschließlich auf die benötigten Auflösungen skaliert. `npm run format:check` prüft die einheitliche Quellcode-Formatierung.

Der optionale lokale Integrationstest `EZPDF_SAMPLE` prüft fünf graue Formularfelder und deren Beschriftungen in einer privaten Beispiel-PDF. Diese Datei wird weder mitgeliefert noch hochgeladen. Beispiel in PowerShell:

```powershell
$env:EZPDF_SAMPLE='C:\Pfad\privates-beispiel.pdf'
npm run test:desktop
```

## Grenzen dieser Version

Dies ist weiterhin kein vollständiger Acrobat-Ersatz. Keine OCR, Änderung bestehender Fließtexte/Bilder, digitale Signatur, Signaturprüfung, Schwärzung oder XFA-Unterstützung. Radiobuttons und Mehrfachauswahllisten sind noch nicht als Bearbeitungsfunktionen vorgesehen. Verschlüsselte/passwortgeschützte PDFs werden nicht unterstützt. Das erneute Speichern kann vorhandene digitale Signaturen ungültig machen; signierte Originale separat behalten.

Die visuelle Erkennung nutzt Farb- und Größenheuristiken. Andere Hintergrundfarben, dekorative graue Bereiche, ungewöhnliche Schriften und gescannte Dokumente können zu fehlenden oder zusätzlichen Treffern führen. Die Beschriftungen sind Hilfen und keine semantische Garantie. Die Darstellung verwendet zur Feldplatzierung die ungedrehte Seitenansicht. Der Desktop begrenzt Dateien auf 200 MB. Die Suche unterstützt normale Textfolgen über benachbarte Textfragmente und Zeilen hinweg; Ligaturen, komplexe Schreibrichtungen oder ungewöhnliche Textreihenfolgen können die Suche einschränken. Maximal 10.000 Treffer werden angezeigt.

Der Druck wird mit bis zu 150 dpi gerastert, um das Dokumentlayout einschließlich Formularwerten zuverlässig an Chromium zu übergeben. Für sehr große Dokumente benötigt die Druckvorbereitung entsprechend Arbeitsspeicher. Eine über den Druckdialog erzeugte PDF enthält dadurch Bildseiten; **Speichern unter** behält dagegen echte PDF-Inhalte und Formularfelder bei.

Die eingebettete Helvetica unterstützt westeuropäische Zeichen einschließlich deutscher Umlaute. Zeichen außerhalb dieses Zeichensatzes können beim Speichern einen Fehler auslösen; das Original bleibt erhalten. Umfangreicher Unicode-Schriftsupport ist ein eigener Ausbaupunkt.

## Projektstruktur

```text
desktop/          Electron-Hauptprozess und isolierte IPC-Brücke
assets/brand/     Freigegebenes Icon als gemeinsame Designquelle
build/            Windows-Icons und NSIS-Registrierung
scripts/          Reproduzierbare Icon-Erzeugung
src/domain.ts     Datenmodell ohne UI-Abhängigkeiten
src/pdf/          Lesen, Felderkennung, Suche, Druck und Export
src/state/        Dokument-Sitzung und Feldhistorie
src/ui/           Viewer, Seiten, Miniaturen, Inspector und Dialoge
tests/            Erkennung, Suche, Zustand und Desktop-Roundtrip
docs/             Architektur und Ausbauplan
```

Siehe [Architektur](docs/architecture.md) und [Roadmap](docs/roadmap.md). Abhängigkeiten sind über `package-lock.json` fixiert. Private PDFs, Testergebnisse, Installer und Entwicklungsartefakte werden durch `.gitignore` vom Repository ausgeschlossen. Für Tests werden synthetische PDFs erzeugt.

## Verwendete Bibliotheken

PDF.js für Darstellung und Formularanalyse, pdf-lib für den Export, React/TypeScript für die Oberfläche und Electron für den Windows-Desktop. Lizenztexte der mitgelieferten Abhängigkeiten liegen im installierten Paket bzw. dessen Drittanbieterhinweisen. Für den eigenen Projektcode ist derzeit keine Open-Source-Lizenz festgelegt.
