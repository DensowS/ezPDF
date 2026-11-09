; Per-user registration without modifying the protected UserChoice or PDF default.
!macro customInstall
  WriteRegStr SHCTX "Software\Classes\Applications\ezPDF.exe" "FriendlyAppName" "ezPDF"
  WriteRegStr SHCTX "Software\Classes\Applications\ezPDF.exe\SupportedTypes" ".pdf" ""
  WriteRegStr SHCTX "Software\Classes\Applications\ezPDF.exe\DefaultIcon" "" "$INSTDIR\ezPDF.exe,0"
  WriteRegStr SHCTX "Software\Classes\Applications\ezPDF.exe\shell\open" "FriendlyAppName" "ezPDF"
  WriteRegStr SHCTX "Software\Classes\Applications\ezPDF.exe\shell\open\command" "" '"$INSTDIR\ezPDF.exe" "%1"'
  WriteRegStr SHCTX "Software\Classes\ezPDF.PDF" "" "PDF-Dokument"
  WriteRegStr SHCTX "Software\Classes\ezPDF.PDF" "FriendlyTypeName" "PDF-Dokument"
  WriteRegStr SHCTX "Software\Classes\ezPDF.PDF\Application" "ApplicationName" "ezPDF"
  WriteRegStr SHCTX "Software\Classes\ezPDF.PDF\DefaultIcon" "" "$INSTDIR\ezPDF.exe,0"
  WriteRegStr SHCTX "Software\Classes\ezPDF.PDF\shell\open" "" "Mit ezPDF öffnen"
  WriteRegStr SHCTX "Software\Classes\ezPDF.PDF\shell\open\command" "" '"$INSTDIR\ezPDF.exe" "%1"'
  WriteRegStr SHCTX "Software\Classes\.pdf\OpenWithProgids" "ezPDF.PDF" ""
  WriteRegStr SHCTX "Software\ezPDF\Capabilities" "ApplicationName" "ezPDF"
  WriteRegStr SHCTX "Software\ezPDF\Capabilities" "ApplicationDescription" "PDFs ansehen und bearbeiten"
  WriteRegStr SHCTX "Software\ezPDF\Capabilities" "ApplicationIcon" "$INSTDIR\ezPDF.exe,0"
  WriteRegStr SHCTX "Software\ezPDF\Capabilities\FileAssociations" ".pdf" "ezPDF.PDF"
  WriteRegStr SHCTX "Software\RegisteredApplications" "ezPDF" "Software\ezPDF\Capabilities"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

!macro customUnInstall
  DeleteRegKey SHCTX "Software\Classes\Applications\ezPDF.exe"
  DeleteRegKey SHCTX "Software\Classes\ezPDF.PDF"
  DeleteRegValue SHCTX "Software\Classes\.pdf\OpenWithProgids" "ezPDF.PDF"
  DeleteRegKey SHCTX "Software\ezPDF\Capabilities"
  DeleteRegValue SHCTX "Software\RegisteredApplications" "ezPDF"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend
