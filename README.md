# Mounstory — Undangan Pernikahan Digital

Static site (HTML/CSS/vanilla JS, tanpa build step) untuk undangan pernikahan
digital, siap di-deploy ke GitHub Pages dengan custom domain `mounstory.com`.

## Struktur proyek

```
/
├── index.html              # Landing page portfolio Mounstory
├── CNAME                    # Custom domain untuk GitHub Pages
├── assets/
│   ├── css/
│   │   ├── base.css         # Reset, variabel warna/font, tombol, scroll-reveal
│   │   ├── invitation.css   # Style khusus halaman undangan (cover, countdown, dst.)
│   │   └── portfolio.css    # Style khusus landing page root
│   └── js/
│       ├── animations.js    # Scroll-reveal (IntersectionObserver) + toast
│       └── invitation.js    # Engine render undangan dari data.json
└── demo/                     # Template undangan — duplikat folder ini untuk pasangan baru
    ├── index.html
    ├── data.json             # Semua data (nama, tanggal, lokasi, galeri, dll)
    ├── images/                # Foto profil, galeri, QRIS (placeholder SVG)
    └── audio/                 # Musik latar (kosongkan / isi music.mp3)
```

## Membuat undangan baru

1. Duplikat folder `/demo/` menjadi `/nama1-nama2/` (contoh: `/raka-salsa/`).
2. Edit `nama1-nama2/data.json` — isi nama, tanggal, lokasi, galeri, rekening,
   dan ucapan. **Tidak perlu mengedit HTML/JS.**
3. Ganti foto di `nama1-nama2/images/` (dan `music.mp3` di `nama1-nama2/audio/`
   jika ingin musik latar) — sesuaikan nama file dengan yang direferensikan
   di `data.json`.
4. Bagikan tautan dengan nama tamu lewat query parameter, contoh:
   `https://mounstory.com/nama1-nama2/?to=Budi%20Santoso`
   (jika kosong, sapaan default adalah "Tamu Undangan").
5. Tambahkan kartu undangan ini ke bagian showcase di `index.html` bila ingin
   ditampilkan di landing page utama (opsional).

## Fitur halaman undangan

- Cover / opening screen dengan tombol "Buka Undangan"
- Sapaan personal dari `?to=` di URL
- Countdown menuju hari-H
- Profil mempelai (foto, nama, anak keberapa, nama orang tua)
- Detail acara akad & resepsi terpisah, dengan tombol Google Maps
- Galeri foto responsif + lightbox
- Form RSVP (submit masih dummy/`console.log`, belum ada backend)
- Amplop digital (rekening + QRIS placeholder)
- Ucapan & doa (list awal dari `data.json`, tamu bisa menambah — client-side saja)
- Musik latar dengan tombol play/pause

## Responsif

Mobile-first dengan breakpoint di `480px` dan `1024px`. Dari `480px` ke atas,
konten undangan tetap center dengan `max-width` (lihat `--card-max-width` di
`assets/css/base.css`) supaya tetap terasa seperti kartu undangan, bukan
website yang melebar penuh layar.

## Animasi

- Scroll-reveal fade + slide via `IntersectionObserver` (`assets/js/animations.js`)
- Transisi buka cover → konten pakai fade/slide CSS
- Hover/tap tombol pakai transisi scale/opacity halus
- Angka countdown bertransisi (fade) saat berubah, bukan langsung berganti
- Semua animasi murni CSS transition/animation + JS ringan (300–600ms, ease-in-out)
- Menghormati `prefers-reduced-motion`

## Deploy ke GitHub Pages

1. Push branch ini ke `main` di repo `WahyuFadhilahRamadhan/Wahyu-Wed`.
2. Di Settings → Pages, set source ke branch `main` folder `/root`.
3. File `CNAME` di root sudah berisi `mounstory.com` — pastikan DNS domain
   diarahkan ke GitHub Pages sesuai dokumentasi GitHub.
