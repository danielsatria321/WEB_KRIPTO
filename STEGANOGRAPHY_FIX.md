# Steganography Preservation & Re-Embedding Fix

## Masalah yang Terdeteksi

Ketika user mengedit patient dan mengupload foto baru, **steganografi dari foto lama hilang** karena:

1. File asli ter-replace dengan file baru
2. File baru dari user tidak memiliki pesan steganografi yang ter-embed

## ✅ Solusi: Auto Re-Embed Steganography

Sistem sekarang **secara otomatis mengekstrak steganografi dari foto lama dan menyisipkannya ke foto baru**.

### Flow Lengkap

```
User Upload Foto Baru
      ↓
[Extract steganografi dari foto lama]
      ↓
[Encrypt & Embed ke foto baru]
      ↓
Backup foto lama → {nama}_original (audit trail)
      ↓
Simpan foto baru dengan steganografi ter-embed
      ↓
Database update dengan nama file baru
      ↓
✅ Steganografi tetap ada di foto baru!
```

## Implementation Details

### Backend Methods (dashboardview.php)

**`updatePatientFiles()`** - Enhanced untuk auto re-embedding
- Get nama file foto lama dari database
- Extract steganografi dari foto lama menggunakan `extractMessageFromImage()`
- Apply steganografi ke foto baru menggunakan `applySteganographyToImage()`
- Backup foto lama dengan suffix _original
- Update database dengan nama file baru

**`applySteganographyToImage($sourcePath, $targetPath, $message)`** - NEW
- Embed pesan terenkripsi ke foto menggunakan LSB technique
- Support JPEG, PNG, GIF
- Algoritma sama dengan saat patient creation

**`aesEncryptForSteganography($data)`** - NEW
- Encrypt pesan dengan AES-256-CBC
- Add PKCS7 padding
- Return binary encrypted data

**`pkcs7Pad($data, $blockSize)`** - NEW
- PKCS7 padding untuk AES encryption

### Steganography Algorithm

```
Input: Message (misal: "Asma, hipertensi")

1. Pad message dengan PKCS7 (16 bytes block)
2. Encrypt dengan AES-256-CBC
3. Create header: 4 bytes message length
4. Convert ke binary: header + encrypted data
5. Embed ke LSB channels (RGB):
   - Pixel[0] → header (32 bits)
   - Pixel[1+] → encrypted message
6. Save foto dengan steganografi ter-embed

Output: Foto dengan pesan tersembunyi
```

## File yang Dimodifikasi

### `backend/dashboardview.php`
- **`updatePatientFiles()`**
  - Extract steganografi dari foto lama
  - Apply steganografi ke foto baru
  - Fallback: Copy file jika ekstraksi gagal
  
- **`applySteganographyToImage($sourcePath, $targetPath, $message)`** (NEW)
  - Embed steganografi ke foto baru
  - Support JPEG, PNG, GIF
  
- **`aesEncryptForSteganography($data)`** (NEW)
  - Encrypt dengan AES-256-CBC + PKCS7
  
- **`pkcs7Pad($data, $blockSize)`** (NEW)
  - PKCS7 padding helper

## Testing Scenario

### Test 1: Verify Steganografi Preserved
```
1. Go Dashboard → Patient 22 (has steganografi)
2. Click Edit
3. Upload new photo
4. Click "Update Data Pasien"
5. Go back to patient detail
6. Click "Ekstrak Pesan"
7. ✅ Pesan original masih ada!
```

### Error Handling

| Scenario | Handling |
|----------|----------|
| Extract fails | Copy file as-is (no steganografi) |
| File too small | Error: Message too large |
| Invalid image format | Error: Unsupported type |
| File upload fails | Error: Upload gagal |

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
