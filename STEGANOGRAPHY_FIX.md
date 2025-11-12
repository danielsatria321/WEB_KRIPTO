# Steganography Preservation Fix

## Masalah yang Terdeteksi

Ketika user mengedit patient dan mengupload foto baru, **steganografi dari foto lama hilang** karena file asli ter-replace dengan file baru yang tidak memiliki steganografi.

## Solusi yang Diimplementasikan

### 1. **Backup File Original**

Ketika foto baru di-upload saat edit, sistem sekarang:

- Membaca filename foto lama dari database
- Membuat backup dengan suffix `_original` (misal: `image.png` → `image.png_original`)
- Upload foto baru dengan nama baru
- Simpan nama file baru ke database

### 2. **Ekstraksi Steganografi dari Backup**

Method `extractSteganographyMessage()` sudah diupdate untuk mencari file `_original`:

- Pertama cek file `{nama}_original` (file asli dengan steganografi)
- Jika tidak ada, fallback ke file saat ini

### 3. **Recovery Patient 22**

Patient 22 sudah di-restore:

- File original: `6913af600393b_1762897760.png` (memiliki steganografi)
- Backup: `6913af600393b_1762897760.png_original`
- Database sudah pointing ke file original

## Cara Kerja

### Saat Edit Patient:

```
User Upload Foto Baru
      ↓
Backup foto lama → {nama}_original
      ↓
Upload foto baru → {nama_baru}
      ↓
Database update dengan {nama_baru}
```

### Saat Ekstraksi Steganografi:

```
Ambil foto_pasien dari database (misal: image.png)
      ↓
Cek file: image.png_original  ← Mencari backup
      ↓
Ekstrak steganografi dari file yang ditemukan
```

## File yang Dimodifikasi

- `backend/dashboardview.php`:
  - `updatePatientFiles()`: Tambah backup logic
  - `extractSteganographyMessage()`: Update path search untuk cek `_original`

## Testing

1. Buka dashboard
2. Login dengan credentials yang valid
3. Klik Edit pada Patient 22
4. Klik "Ekstrak Pesan" untuk melihat steganografi
5. Steganografi sekarang bisa terbaca meskipun sudah di-edit sebelumnya

## Catatan

- Backup file hanya dibuat jika file lama ada dan belum ada backup sebelumnya
- File lama dipertahankan untuk keperluan forensik/audit trail
- Steganografi selalu diambil dari file original, bukan dari file yang di-upload
