`endless-love.mp3` is the couple's chosen background track ("Endless
Love" — Lionel Richie ft. Diana Ross, Boyce Avenue ft. Connie Talbot
cover), referenced by `meta.musicSrc` in `../data.json`. It plays via
`audio.loop = true` in `assets/js/invitation.js`, looping if a guest
leaves the page open past the track's end. This is a cover the couple
supplied themselves — make sure you have the rights to use it (a
purchased/licensed track, or one you have permission for) before
publishing.

Want a different track? Replace `endless-love.mp3` with your own
licensed audio file (mp3, wav, ogg all work in `<audio>`), keep it
reasonably small (compressed audio under ~3–4 MB, or a short loop), and
update `meta.musicSrc` in `data.json` to match the new filename — no
HTML/JS edits needed.
