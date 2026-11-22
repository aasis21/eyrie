# Capture audit

Run before any capture leaves the machine (upload, PR, share).

## Video

```powershell
$ff = python -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"
$font = "C\:/Windows/Fonts/arial.ttf"   # macOS: /System/Library/Fonts/Supplemental/Arial.ttf; Linux: /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
& $ff -y -loglevel error -i scene.mp4 -vf "fps=1/4,scale=640:-1,drawtext=fontfile='$font':text='%{pts\:hms}':x=8:y=8:fontsize=28:fontcolor=red:box=1,tile=5x6" -frames:v 1 sheet.png
```

- Read the timestamped contact sheet for wrong pages, flashes of a previous
  screen, banners and missing cursor.
- Extract full-resolution frames at the key marks (`-ss <s> -frames:v 1`, crop
  to the content) and **read every word**: replies, titles, toasts, inputs.

## Screenshots

Open each image at full size and read it. Check titles, inputs, dropdowns,
toasts, the header (user name, org, initials) and URLs.

## Leak checklist

- [ ] No real person, username or email
- [ ] No account, tenant, project or internal service names
- [ ] No internal hosts, GUIDs, client or object IDs (zeros are fine)
- [ ] No internal ticket IDs or old test-chat titles
- [ ] Assistant or bot replies say nothing about old personas, access errors or internal systems
- [ ] No internal banners or nav items
- [ ] Times and dates make sense for the story

Fix at the source (sanitizer rule, demo data, re-take); blur only what you
can't reach.
