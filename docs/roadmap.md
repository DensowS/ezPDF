# Ausbauplan

Bereits in 0.2.0 umgesetzt: eigenes Logo/Windows-Icon, korrigierte EXE-Metadaten und Standard-App-Registrierung, Viewer als Standard, Editieren auf Anforderung, verzögerte Formularanalyse, Größenanpassung, Textauswahl/Kopieren, Suche, Druck, Miniaturseiten und Korrektur erkannter Felder. Zustand und UI sind in Module aufgeteilt.

1. **Robuste Formularbasis:** echte Nutzer-Feedbacks, Dokumentkorpus, Unicode-Fonts, lange/mehrzeilige Werte, Drehungen und CropBoxes, Passwortdialog, Radiobuttons und Mehrfachauswahl.
2. **Produktreife Windows-Version:** Codesignatur, signierte Updates, zusätzliche Barrierefreiheitsprüfung und Performance-Messungen mit sehr großen Dokumenten; optional vektorbasierter Druckpfad.
3. **Weitere Bearbeitungswerkzeuge:** markieren, kommentieren, Seiten sortieren/zusammenführen, Bilder/Unterschriften als Grafik, explizite Flatten-Option.
4. **Inhaltliche Bearbeitung:** bestehende Texte/Bilder verändern, OCR und echte Schwärzung. Hier zuerst einen separaten Engine-Vergleich samt Lizenz- und Fidelity-Prüfung durchführen. Eine optisch darübergelegte Fläche ist keine sichere Schwärzung.
5. **Fortgeschrittene Funktionen:** PDF/A-Validierung, Signaturprüfung und zertifikatsbasierte Signaturen, Stapelverarbeitung, optionales Erweiterungsmodell.

Priorität bleibt Wartbarkeit: kleine Module, klare Dokumentkoordinaten, portable Testdateien und Roundtrip-Prüfung vor neuen Features. Kein konkreter Termin wird ohne Auswahl und technische Erprobung der jeweiligen Funktion zugesagt.
