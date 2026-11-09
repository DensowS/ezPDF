# ezPDF

Ein lokaler PDF-Editor für Windows. Version 0.1.0 konzentriert sich auf das Ansehen und Ausfüllen von Dokumenten: einfache dunkle Oberfläche, automatische Formularerkennung und Speicherung als weiterhin ausfüllbare PDF.

## Funktionen

- PDF öffnen, per Drag-and-drop laden, Seiten wechseln und zoomen.
- Echte Textfelder, Kontrollkästchen und einfache Auswahllisten bearbeiten.
- Helle graue Eingabeflächen erkennen und benachbarte Beschriftungen zuordnen. Erkannte Felder lassen sich entfernen; Zuordnung bitte prüfen.
- Eigene Textfelder per Klick ergänzen; Änderungen rückgängig machen.
- Speichern unter einem frei wählbaren Namen. Neu erkannte und ergänzte Felder werden als echte AcroForm-Textfelder gespeichert.
- Warnung bei ungespeicherten Änderungen, lokale Verarbeitung ohne Konto, Cloud oder Dokument-Uploads.
- Windows-Installer mit PDF-Dateizuordnung und Öffnen über Kommandozeile/Explorer.

## Installation

Den Installer aus den GitHub-Releases ausführen. Danach in **Windows-Einstellungen → Apps → Standard-Apps → ezPDF** die Erweiterung `.pdf` zuweisen. Windows verlangt diese Auswahl durch den Benutzer; der Installer übernimmt vorhandene Standardzuordnungen nicht ungefragt. Die erste Version ist nicht mit einem kommerziellen Zertifikat signiert.

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

Der optionale lokale Integrationstest `EZPDF_SAMPLE` prüft fünf graue Formularfelder und deren Beschriftungen in einer privaten Beispiel-PDF. Diese Datei wird weder mitgeliefert noch hochgeladen. Beispiel in PowerShell:

```powershell
$env:EZPDF_SAMPLE='C:\Pfad\privates-beispiel.pdf'
npm run test:desktop
```

## Grenzen dieser Version

Dies ist die erste Grundlage, kein vollständiger Acrobat-Ersatz. Keine OCR, Änderung bestehender Fließtexte/Bilder, digitale Signatur, Signaturprüfung, Schwärzung oder XFA-Unterstützung. Radiobuttons und Mehrfachauswahllisten sind noch nicht als Bearbeitungsfunktionen vorgesehen. Verschlüsselte/passwortgeschützte PDFs werden nicht unterstützt. Das erneute Speichern kann vorhandene digitale Signaturen ungültig machen; signierte Originale separat behalten.

Die visuelle Erkennung nutzt Farb- und Größenheuristiken. Andere Hintergrundfarben, dekorative graue Bereiche, ungewöhnliche Schriften und gescannte Dokumente können zu fehlenden oder zusätzlichen Treffern führen. Die Beschriftungen sind Hilfen und keine semantische Garantie. Die Darstellung verwendet zur Feldplatzierung die ungedrehte Seitenansicht. Sehr große Dokumente werden beim Öffnen seitenweise analysiert; der Desktop begrenzt Dateien auf 200 MB.

Die eingebettete Helvetica unterstützt westeuropäische Zeichen einschließlich deutscher Umlaute. Zeichen außerhalb dieses Zeichensatzes können beim Speichern einen Fehler auslösen; das Original bleibt erhalten. Umfangreicher Unicode-Schriftsupport ist ein eigener Ausbaupunkt.

## Projektstruktur

```text
desktop/          Electron-Hauptprozess und isolierte IPC-Brücke
src/domain.ts     Datenmodell ohne UI-Abhängigkeiten
src/pdf/          Lesen, Felderkennung und PDF-Export
src/ui/           React-Oberfläche und Styles
tests/            Erkennungstests und Desktop-Roundtrip
docs/             Architektur und Ausbauplan
```

Siehe [Architektur](docs/architecture.md) und [Roadmap](docs/roadmap.md). Abhängigkeiten sind über `package-lock.json` fixiert. Private PDFs, Testergebnisse, Installer und Entwicklungsartefakte werden durch `.gitignore` vom Repository ausgeschlossen. Für Tests werden synthetische PDFs erzeugt.

## Verwendete Bibliotheken

PDF.js für Darstellung und Formularanalyse, pdf-lib für den Export, React/TypeScript für die Oberfläche und Electron für den Windows-Desktop. Lizenztexte der mitgelieferten Abhängigkeiten liegen im installierten Paket bzw. dessen Drittanbieterhinweisen. Für den eigenen Projektcode ist derzeit keine Open-Source-Lizenz festgelegt.
