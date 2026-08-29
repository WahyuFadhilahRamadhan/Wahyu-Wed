`music.wav` is an original, generated instrumental (no sampled or copied
material — safe to use with zero royalty/licensing concerns) referenced by
`meta.musicSrc` in `../data.json`. It's a short (~16s) piece that loops
seamlessly via `audio.loop = true` in `assets/js/invitation.js`.

Want a different track? Replace `music.wav` with your own licensed audio
file (mp3, wav, ogg all work in `<audio>`), keep it reasonably small
(compressed audio under ~3–4 MB, or a short loop like this one), and update
`meta.musicSrc` in `data.json` to match the new filename — no HTML/JS edits
needed.
