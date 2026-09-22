# Kalkulator Gage R&R

Tool statis (HTML/CSS/vanilla JS, tanpa build step) untuk menghitung Gage
Repeatability & Reproducibility (bagian dari Measurement Systems Analysis /
MSA), mengikuti konvensi proyek ini (lihat `README.md` di root).

Buka `gage-rr/index.html` langsung di browser, atau akses
`https://mounstory.com/gage-rr/` setelah di-deploy.

## Fitur

- Dua metode perhitungan: **ANOVA** (crossed, dengan interaksi Operator×Part
  dan auto-pooling saat p-value > 0.25) dan **Average & Range** (klasik,
  konstanta d2 / d2*).
- Input manual (tabel Part × Operator × Trial) atau upload CSV format long
  (`Part,Operator,Trial,Value`), termasuk tombol unduh template.
- Ringkasan EV/AV/PV/GRR/TV, %kontribusi terhadap Total Variation, ndc, dan
  status Diterima/Bersyarat/Ditolak sesuai ambang AIAG (%GRR < 10 / 10–30 /
  > 30).
- Tabel ANOVA lengkap (SS, df, MS, F, p-value, varian komponen).
- Data contoh (dummy, bukan data nyata) untuk uji coba cepat.

## Basis rumus

Mengikuti **AIAG Measurement Systems Analysis (MSA) Reference Manual, 4th
ed.**:

- Average & Range: `EV = multiplier × (R̿ / d2)`, `AV = sqrt((multiplier ×
  X̄diff / d2*)² − EV²/(n·r))`, `PV = multiplier × (Rp / d2*)`.
- ANOVA: dekomposisi SS/MS standar model 2-faktor silang (Part, Operator,
  Part×Operator, Equipment), dengan interaksi di-pool ke error jika
  p-value > 0.25 (aturan standar AIAG/Minitab).
- `ndc = floor(1.41 × PV / GRR)` (Wheeler's Discrimination Ratio).

Kalkulator ini untuk keperluan internal — verifikasi hasil terhadap software
MSA tervalidasi (mis. Minitab) sebelum dipakai untuk keputusan kualitas
kritikal.
