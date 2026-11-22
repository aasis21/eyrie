<#
.SYNOPSIS
  Crop the Clueso watermark (optional) and audit an exported video in one step.
.DESCRIPTION
  Writes <name>.mp4 (cropped) next to the raw export, then reports duration and streams,
  silences (>= SilenceSec), freezes (>= FreezeSec) and a timestamped contact sheet
  (<name>-sheet.png). Freeze hits on result screens and slide holds are expected; any
  freeze under narration that should show motion is a sync problem to fix.
  Runs on Windows PowerShell 5.1 and on PowerShell 7 (pwsh) on Windows, macOS and Linux.
  Needs Python with imageio-ffmpeg.
.EXAMPLE
  ./audit.ps1 -Raw ~/Videos/Demo/raw.mp4 -Out ~/Videos/Demo/Demo.mp4 -Crop
.EXAMPLE
  ./audit.ps1 -Raw final.mp4            # audit only, no crop
#>
param(
  [Parameter(Mandatory)][string]$Raw,
  [string]$Out,
  [switch]$Crop,
  [string]$CropFilter = 'crop=1672:940:124:0,scale=1920:1080,setsar=1',
  [double]$SilenceSec = 1.2,
  [double]$FreezeSec = 4,
  [int]$SheetEverySec = 6
)
$ErrorActionPreference = 'Stop'
$ff = python -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"
$file = $Raw
if ($Crop) {
  if (-not $Out) { $Out = [IO.Path]::Combine([IO.Path]::GetDirectoryName($Raw), [IO.Path]::GetFileNameWithoutExtension($Raw) + '-cropped.mp4') }
  & $ff -y -loglevel error -i $Raw -vf $CropFilter -c:v libx264 -crf 20 -preset medium -c:a aac -b:a 128k -movflags +faststart $Out
  $file = $Out
  "cropped -> $Out ($([math]::Round((Get-Item $Out).Length/1MB,1)) MB)"
}
"--- streams"
& $ff -hide_banner -i $file 2>&1 | Select-String 'Duration|Stream' | ForEach-Object { $_.Line.Trim() }
"--- silences >= ${SilenceSec}s (expect none)"
& $ff -hide_banner -i $file -af "silencedetect=n=-38dB:d=$SilenceSec" -f null - 2>&1 | Select-String 'silence_(start|end)' | ForEach-Object { $_.Line -replace '^.*\] ', '' }
"--- freezes >= ${FreezeSec}s (each must be an intended hold)"
& $ff -hide_banner -i $file -vf "freezedetect=n=0.002:d=$FreezeSec" -an -f null - 2>&1 | Select-String 'freeze_(start|duration)' | ForEach-Object { $_.Line -replace '^.*lavfi\.freezedetect\.', '' }
$sheet = [IO.Path]::Combine([IO.Path]::GetDirectoryName($file), [IO.Path]::GetFileNameWithoutExtension($file) + '-sheet.png')
$font = if ($IsMacOS) { '/System/Library/Fonts/Supplemental/Arial.ttf' } elseif ($IsLinux) { '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf' } else { 'C\:/Windows/Fonts/arial.ttf' }
& $ff -y -loglevel error -i $file -vf "fps=1/$SheetEverySec,scale=480:-1,drawtext=fontfile='$font':text='%{pts\:hms}':x=8:y=8:fontsize=28:fontcolor=red:box=1,tile=6x5" -frames:v 1 $sheet
"--- contact sheet -> $sheet"
