<?php
// Koneksi ke database
$host = 'localhost';
$dbname = 'kriptoproject';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Koneksi database gagal: " . $e->getMessage());
}

// Fungsi dekripsi XOR
function xorDecrypt($encryptedText, $key)
{
    $text = base64_decode($encryptedText);
    $result = '';
    for ($i = 0; $i < strlen($text); $i++) {
        $result .= chr(ord($text[$i]) ^ ord($key[$i % strlen($key)]));
    }
    return $result;
}

// Fungsi Atbash Cipher
function atbashDecrypt($text)
{
    $result = '';
    for ($i = 0; $i < strlen($text); $i++) {
        $char = $text[$i];
        if ($char >= 'A' && $char <= 'Z') {
            $result .= chr(90 - (ord($char) - 65));
        } else if ($char >= 'a' && $char <= 'z') {
            $result .= chr(122 - (ord($char) - 97));
        } else {
            $result .= $char;
        }
    }
    return $result;
}

// Fungsi AES Decryption (menggunakan OpenSSL)
function aesDecrypt($encryptedText, $key)
{
    $cipher = "aes-256-cbc";
    $parts = explode(':', $encryptedText);

    if (count($parts) !== 2) {
        return false;
    }

    $iv = base64_decode($parts[0]);
    $encrypted = base64_decode($parts[1]);

    $decrypted = openssl_decrypt($encrypted, $cipher, $key, 0, $iv);

    return $decrypted;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Kunci enkripsi (harus sama dengan di JavaScript)
    $xorKey = "medicare2024";
    $aesKey = "medicare-secret-key-2024";

    // Data dari form
    $nama_lengkap = $_POST['namaPasien'];
    $tanggal_lahir = $_POST['tanggalLahir'];
    $status_pasien = $_POST['statusPasien'];
    $hasil_pemeriksaan = $_POST['hasilPemeriksaan'];
    $jumlah_pembayaran = $_POST['jumlahPembayaran'];

    // Data terenkripsi
    $alamat_encrypted = $_POST['alamat_encrypted'];
    $informasi_medis_encrypted = $_POST['informasi_medis_encrypted'];

    // Dekripsi untuk verifikasi (opsional)
    $alamat_lengkap = $alamat_encrypted; // Tetap simpan yang terenkripsi

    // Dekripsi informasi medis untuk verifikasi
    $informasi_medis_decrypted = $informasi_medis_encrypted; // Tetap simpan yang terenkripsi

    // Handle file uploads
    $foto_pasien = null;
    $dokumen_pdf = null;

    
    if (isset($_FILES['fotoPasien']) && $_FILES['fotoPasien']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = 'uploads/foto/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $fileExtension = pathinfo($_FILES['fotoPasien']['name'], PATHINFO_EXTENSION);
        $foto_pasien = uniqid() . '.' . $fileExtension;
        $uploadFile = $uploadDir . $foto_pasien;

        if (move_uploaded_file($_FILES['fotoPasien']['tmp_name'], $uploadFile)) {
            // File berhasil diupload
        }
    }

    // Upload dokumen PDF
    if (isset($_FILES['pdfDokumen']) && $_FILES['pdfDokumen']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = 'uploads/pdf/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $fileExtension = pathinfo($_FILES['pdfDokumen']['name'], PATHINFO_EXTENSION);
        $dokumen_pdf = uniqid() . '.' . $fileExtension;
        $uploadFile = $uploadDir . $dokumen_pdf;

        if (move_uploaded_file($_FILES['pdfDokumen']['tmp_name'], $uploadFile)) {
            // File berhasil diupload
        }
    }

    try {
        // Insert data ke database
        $sql = "INSERT INTO pasien (
            nama_lengkap, 
            tanggal_lahir, 
            alamat_lengkap, 
            informasi_medis, 
            status_pasien, 
            hasil_pemeriksaan, 
            foto_pasien, 
            dokumen_pdf, 
            jumlah_pembayaran
        ) VALUES (
            :nama_lengkap, 
            :tanggal_lahir, 
            :alamat_lengkap, 
            :informasi_medis, 
            :status_pasien, 
            :hasil_pemeriksaan, 
            :foto_pasien, 
            :dokumen_pdf, 
            :jumlah_pembayaran
        )";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':nama_lengkap' => $nama_lengkap,
            ':tanggal_lahir' => $tanggal_lahir,
            ':alamat_lengkap' => $alamat_lengkap,
            ':informasi_medis' => $informasi_medis_decrypted,
            ':status_pasien' => $status_pasien,
            ':hasil_pemeriksaan' => $hasil_pemeriksaan,
            ':foto_pasien' => $foto_pasien,
            ':dokumen_pdf' => $dokumen_pdf,
            ':jumlah_pembayaran' => $jumlah_pembayaran
        ]);

        // Redirect dengan pesan sukses
        header('Location: dashboard.html?status=success&message=Data pasien berhasil disimpan!');
        exit();
    } catch (PDOException $e) {
        // Redirect dengan pesan error
        header('Location: dashboard.html?status=error&message=Gagal menyimpan data: ' . urlencode($e->getMessage()));
        exit();
    }
}
