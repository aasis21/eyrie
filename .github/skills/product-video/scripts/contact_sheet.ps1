<#
.SYNOPSIS
Build timestamped contact sheets from a video for visual review.

.EXAMPLE
./contact_sheet.ps1 -Video recording.mp4 -OutDir ./sheets
./contact_sheet.ps1 -Video scene.mp4 -OutDir ./sheets -Every 2 -Window 0

.NOTES
Runs on Windows PowerShell 5.1 and on PowerShell 7 (pwsh) on any OS. Needs Python with imageio-ffmpeg.
#>
param(
    [Parameter(Mandatory)] [string] $Video,
    [Parameter(Mandatory)] [string] $OutDir,
    [double] $Every = 2,
    [int] $Window = 90,
    [int] $Width = 480
)
$ErrorActionPreference = 'Stop'
$ff = python -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"
New-Item -ItemType Directory -Force $OutDir | Out-Null
$probe = & $ff -hide_banner -i $Video 2>&1 | Select-String 'Duration: (\d+):(\d+):([\d.]+)'
$m = $probe.Matches[0].Groups
$total = [int]$m[1].Value * 3600 + [int]$m[2].Value * 60 + [double]$m[3].Value
$base = [IO.Path]::GetFileNameWithoutExtension($Video)
if ($Window -le 0) { $Window = [math]::Ceiling($total) }
$cols = 5
for ($start = 0; $start -lt $total; $start += $Window) {
    $frames = [math]::Ceiling([math]::Min($Window, $total - $start) / $Every)
    $rows = [math]::Max(1, [math]::Ceiling($frames / $cols))
    $label = "drawtext=text='%{pts\:hms\:$start}':x=6:y=6:fontsize=22:fontcolor=yellow:box=1:boxcolor=black@0.6"
    $out = Join-Path $OutDir ("{0}_{1:0000}.png" -f $base, $start)
    & $ff -hide_banner -loglevel error -y -ss $start -t $Window -i $Video `
        -vf "fps=1/$Every,scale=${Width}:-1,$label,tile=${cols}x${rows}" -frames:v 1 $out 2>$null
    Write-Output $out
}
