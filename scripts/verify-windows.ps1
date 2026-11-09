param([string]$Executable = (Join-Path $PSScriptRoot '../release/win-unpacked/ezPDF.exe'))
$ErrorActionPreference = 'Stop'
$ezpdfResolvedExecutable = (Resolve-Path -LiteralPath $Executable).Path
$ezpdfMetadata = (Get-Item -LiteralPath $ezpdfResolvedExecutable).VersionInfo
foreach ($ezpdfProperty in @('ProductName', 'FileDescription', 'InternalName')) {
  if ($ezpdfMetadata.$ezpdfProperty -ne 'ezPDF') { throw "Incorrect $ezpdfProperty metadata: $($ezpdfMetadata.$ezpdfProperty)" }
}
Add-Type -AssemblyName System.Drawing
$ezpdfEmbedded = [System.Drawing.Icon]::ExtractAssociatedIcon($ezpdfResolvedExecutable)
$ezpdfExpected = [System.Drawing.Icon]::new((Join-Path $PSScriptRoot '../build/icon.ico'), 32, 32)
$ezpdfActualBitmap = $ezpdfEmbedded.ToBitmap()
$ezpdfExpectedBitmap = $ezpdfExpected.ToBitmap()
try {
  if ($ezpdfActualBitmap.Size -ne $ezpdfExpectedBitmap.Size) { throw 'Unexpected embedded icon dimensions.' }
  for ($ezpdfPixelY = 0; $ezpdfPixelY -lt $ezpdfActualBitmap.Height; $ezpdfPixelY++) {
    for ($ezpdfPixelX = 0; $ezpdfPixelX -lt $ezpdfActualBitmap.Width; $ezpdfPixelX++) {
      if ($ezpdfActualBitmap.GetPixel($ezpdfPixelX, $ezpdfPixelY).ToArgb() -ne $ezpdfExpectedBitmap.GetPixel($ezpdfPixelX, $ezpdfPixelY).ToArgb()) {
        throw 'Executable icon differs from the ezPDF brand icon.'
      }
    }
  }
} finally {
  $ezpdfActualBitmap.Dispose(); $ezpdfExpectedBitmap.Dispose(); $ezpdfEmbedded.Dispose(); $ezpdfExpected.Dispose()
}
Write-Output "PASS: ezPDF Windows metadata and embedded icon ($($ezpdfMetadata.ProductVersion))."
