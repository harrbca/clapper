# PDF pages to PNGs, with the PDF renderer built into Windows (Windows.Data.Pdf), so documents can go
# into a video without installing anything. Runs in Windows PowerShell 5.1, which can call WinRT:
#   powershell -NoProfile -File tools\pdf-png.ps1 <file.pdf> <out-folder> [-Dpi 300] [-Pages 1,2]
# Writes <out-folder>\<name>-p<N>.png, and prints each page's size in inches.
param(
  [Parameter(Mandatory)] [string] $Pdf,
  [Parameter(Mandatory)] [string] $Out,
  [int] $Dpi = 300,
  [int[]] $Pages = @()
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$methods = [System.WindowsRuntimeSystemExtensions].GetMethods()
$asTaskOf = ($methods | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
$asTask = ($methods | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction' })[0]
function Await($op, [type] $type) { $t = $asTaskOf.MakeGenericMethod($type).Invoke($null, @($op)); $t.Wait(-1) | Out-Null; $t.Result }
function AwaitAction($op) { $t = $asTask.Invoke($null, @($op)); $t.Wait(-1) | Out-Null }

[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType = WindowsRuntime] | Out-Null
$Pdf = (Resolve-Path $Pdf).Path
New-Item -ItemType Directory -Force $Out | Out-Null
$Out = (Resolve-Path $Out).Path
$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($Pdf)) ([Windows.Storage.StorageFile])
$doc = Await ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])
$folder = Await ([Windows.Storage.StorageFolder]::GetFolderFromPathAsync($Out)) ([Windows.Storage.StorageFolder])
$name = [IO.Path]::GetFileNameWithoutExtension($Pdf)
if (-not $Pages.Count) { $Pages = 1..$doc.PageCount }
foreach ($n in $Pages) {
  $page = $doc.GetPage($n - 1)
  $w = $page.Size.Width / 96; $h = $page.Size.Height / 96          # the size is in 1/96 inch
  $opts = New-Object Windows.Data.Pdf.PdfPageRenderOptions
  $opts.DestinationWidth = [uint32][math]::Round($w * $Dpi)
  $opts.DestinationHeight = [uint32][math]::Round($h * $Dpi)
  $png = Await ($folder.CreateFileAsync("$name-p$n.png", [Windows.Storage.CreationCollisionOption]::ReplaceExisting)) ([Windows.Storage.StorageFile])
  $stream = Await ($png.OpenAsync([Windows.Storage.FileAccessMode]::ReadWrite)) ([Windows.Storage.Streams.IRandomAccessStream])
  AwaitAction ($page.RenderToStreamAsync($stream, $opts))
  $stream.Dispose(); $page.Dispose()
  '{0}-p{1}.png  {2:N2} x {3:N2} in  {4} x {5} px' -f $name, $n, $w, $h, $opts.DestinationWidth, $opts.DestinationHeight
}
