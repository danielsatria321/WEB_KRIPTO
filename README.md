# Web Kriptografi - Sistem Manajemen Rekam Medis

Aplikasi web untuk mengelola rekam medis pasien dengan fitur enkripsi dan steganografi tingkat lanjut.

## Ringkasan

Sistem ini menyediakan manajemen rekam medis dengan keamanan berlapis melalui algoritma kriptografi dan teknik steganografi untuk melindungi data sensitif pasien.

## Fitur

### Autentikasi & Otorisasi

- Sistem login aman dengan manajemen sesi
- Validasi kredensial dokter
- Timeout sesi dan fungsi logout

### Manajemen Data Pasien

- Operasi CRUD lengkap untuk rekam pasien
- Pencarian dan filter lanjutan
- Paginasi untuk dataset besar
- Pembaruan data real-time

### Keamanan & Enkripsi

#### Enkripsi Data

- **XOR Cipher**: Nama dan alamat pasien
- **AES-256-CBC**: Hasil pemeriksaan medis
- **Altbash + AES**: Enkripsi kombinasi untuk data sensitif
- **Caesar Cipher + AES**: Enkripsi dokumen PDF

#### Steganografi

- Steganografi gambar LSB (Least Significant Bit)
- Penyisipan pesan medis dalam foto pasien
- Penanganan pesan berbasis prioritas (baru, ekstrak, atau tanpa pesan)
- Re-embedding otomatis saat pembaruan file
- Sistem backup untuk file asli

### Manajemen File

- Upload gambar dengan validasi (JPEG, PNG, GIF, WebP)
- Enkripsi dan penyimpanan dokumen PDF
- Pengambilan dan dekripsi file yang aman
- Preservasi steganografi otomatis saat edit

### Fitur Dashboard

- Statistik real-time (total pasien, layanan, pembayaran)
- Pelacakan aktivitas pasien terkini
- Kartu aksi cepat untuk tugas umum
- Rincian layanan (Rawat Inap, Rawat Jalan, Pemeriksaan)

## Stack Teknologi

### Backend

- PHP 8.2.4
- MySQL (MySQLi)
- OpenSSL untuk kriptografi
- GD Library untuk pemrosesan gambar

### Frontend

- Vanilla JavaScript (ES6+)
- HTML5 & CSS3
- Fetch API untuk request asinkron
- Desain responsif dengan CSS Grid & Flexbox

### Keamanan

- Autentikasi berbasis sesi
- CORS dengan dukungan kredensial
- Sanitasi dan validasi input
- Logging error tanpa eksposur data

## Arsitektur

### Alur Enkripsi

```
Teks Biasa → Pemilihan Algoritma → Enkripsi → Encoding Base64 → Penyimpanan Database
Database → Decoding Base64 → Dekripsi → Tampilan Teks Biasa
```

### Alur Steganografi

```
Pesan Medis → Enkripsi AES → Konversi Biner → Embedding LSB → Penyimpanan Gambar
Pengambilan Gambar → Ekstraksi LSB → Dekripsi AES → Tampilan Pesan
```

### Logika Prioritas Steganografi

1. User memasukkan pesan baru: Sisipkan pesan baru
2. Field pesan kosong: Ekstrak dari gambar yang ada
3. Tidak ada pesan: Upload tanpa steganografi

## Skema Database

### Tabel: pasien

- id_pasien (Primary Key)
- nama_lengkap (Terenkripsi XOR)
- tanggal_lahir
- alamat_lengkap (Terenkripsi XOR)
- informasi_medis (Jenis layanan)
- status_pasien
- hasil_pemeriksaan (Terenkripsi Altbash + AES)
- jumlah_pembayaran
- foto_pasien (Berisi steganografi)
- dokumen_pdf (Terenkripsi Caesar + AES)
- created_at
- updated_at

### Tabel: pengguna

- id_pengguna (Primary Key)
- username
- password (Hashed)
- role
- nama_lengkap
- created_at

## API Endpoints

### Dashboard API (dashboardview.php)

- `get_stats`: Statistik dashboard
- `get_recent_patients`: Daftar pasien terkini
- `get_patients`: Daftar pasien dengan paginasi dan filter
- `get_patient_detail`: Informasi lengkap pasien
- `update_patient`: Perbarui data pasien
- `delete_patient`: Hapus rekam pasien
- `update_patient_files`: Upload file dan penanganan steganografi
- `extract_steganography`: Ekstrak pesan tersembunyi dari gambar
- `download_decrypted_pdf`: Dekripsi dan unduh dokumen PDF

### Authentication API

- `login.php`: Autentikasi pengguna
- `logout.php`: Terminasi sesi
- `check_session.php`: Validasi sesi

## Langkah Keamanan

### Kunci Enkripsi

- XOR_KEY: Kunci kustom untuk cipher XOR
- AES_KEY: Kunci 32-byte untuk AES-256-CBC
- AES_IV: Initialization vector 16-byte

### Proteksi Data

- Semua data sensitif dienkripsi sebelum disimpan
- File PDF dienkripsi dengan enkripsi dua lapis
- Pesan medis disisipkan dengan enkripsi AES
- Gambar asli di-backup dengan suffix \_original

### Keamanan Sesi

- Manajemen sesi native PHP
- Transmisi cookie berbasis kredensial
- Timeout sesi saat tidak aktif
- Logout aman dengan penghancuran sesi

## Struktur File

```
web_kriptografi/
├── backend/
│   ├── authentication.php
│   ├── dashboardview.php
│   ├── login.php
│   ├── logout.php
│   └── check_session.php
├── database/
│   └── kriptoproject.sql
├── script/
│   ├── dashboard.js
│   ├── login.js
│   └── register.js
├── styles/
│   ├── style.css
│   ├── styledashboard.css
│   └── registerstyle.css
├── templates/
│   ├── dashboard.html
│   ├── login.html
│   └── register.html
├── uploads/
│   ├── images/
│   └── pdfs/
└── index.html
```

## Kompatibilitas Browser

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Kebutuhan Sistem

- PHP 8.0 atau lebih tinggi
- MySQL 5.7 atau lebih tinggi
- Web server Apache/Nginx
- GD Library aktif
- Ekstensi OpenSSL aktif
- Ekstensi PDO/MySQLi aktif

## Optimasi Performa

- Lazy loading untuk gambar
- Paginasi untuk dataset besar
- Query SQL efisien dengan prepared statements
- Caching client-side untuk resource statis
- Animasi CSS optimal dengan akselerasi hardware
- Dukungan prefers-reduced-motion untuk aksesibilitas

## Penanganan Error

- Logging error server-side ke dashboard_errors.log
- Pesan error graceful di client-side
- Validasi di frontend dan backend
- Standardisasi response JSON
- Display error dinonaktifkan di production

## Keterbatasan

- Ukuran maksimal gambar untuk steganografi: ~4MP
- Kapasitas pesan: ~0.5-1MB per gambar
- Enkripsi PDF terbatas pada file 100MB
- Timeout sesi: 30 menit tidak aktif


## Kontributor
Daniel Satria Darmawan
