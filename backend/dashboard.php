<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Database configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'kriptoproject');

// Encryption keys
define('XOR_KEY', 'medicare_secret_key_2024');
define('AES_KEY', 'medicare_aes_key_2024_32bytes_long!'); // 32 bytes for AES-256
define('AES_IV', '1234567890123456'); // 16 bytes for AES

class PatientHandler
{
    private $conn;

    public function __construct()
    {
        $this->connectDB();
    }

    private function connectDB()
    {
        try {
            $this->conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

            if ($this->conn->connect_error) {
                throw new Exception("Koneksi database gagal: " . $this->conn->connect_error);
            }

            $this->conn->set_charset("utf8mb4");
        } catch (Exception $e) {
            $this->sendError($e->getMessage());
        }
    }

    public function handleRequest()
    {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $this->savePatientData();
        } else {
            $this->sendError('Method not allowed', 405);
        }
    }

    private function savePatientData()
    {
        try {
            // Validate required fields
            $errors = $this->validateFormData();
            if (!empty($errors)) {
                throw new Exception(implode(', ', $errors));
            }

            // Get form data
            $nama_lengkap = $this->sanitizeInput($_POST['namaPasien']);
            $tanggal_lahir = $_POST['tanggalLahir'];
            $alamat_lengkap = $this->sanitizeInput($_POST['alamat']);
            $jenis_layanan = $this->sanitizeInput($_POST['jenisLayanan']);
            $status_pasien = $this->mapStatusPasien($_POST['statusPasien']);
            $hasil_pemeriksaan = $this->sanitizeInput($_POST['hasilPemeriksaan']);
            $jumlah_pembayaran = floatval($_POST['jumlahPembayaran']); // Tetap sebagai float

            // Encrypt sensitive data
            $encrypted_nama = $this->xorEncrypt($nama_lengkap, XOR_KEY);
            $encrypted_alamat = $this->xorEncrypt($alamat_lengkap, XOR_KEY);

            // Encrypt hasil pemeriksaan menggunakan Altbash + AES
            $encrypted_hasil = $this->altbashAesEncrypt($hasil_pemeriksaan);

            // Handle file uploads
            $foto_pasien = $this->handleFileUpload('fotoPasien', 'images');
            $dokumen_pdf = $this->handleFileUpload('pdfDokumen', 'docs');

            // Prepare and execute SQL statement
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
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

            $stmt = $this->conn->prepare($sql);
            if (!$stmt) {
                throw new Exception("Prepare statement failed: " . $this->conn->error);
            }

            // Bind parameters - jumlah_pembayaran sebagai decimal (d)
            $stmt->bind_param(
                "ssssssssd",
                $encrypted_nama,
                $tanggal_lahir,
                $encrypted_alamat,
                $jenis_layanan,
                $status_pasien,
                $encrypted_hasil,
                $foto_pasien,
                $dokumen_pdf,
                $jumlah_pembayaran // TIDAK dienkripsi - disimpan sebagai angka
            );

            if ($stmt->execute()) {
                $patientId = $stmt->insert_id;

                $this->sendSuccess([
                    'id_pasien' => $patientId,
                    'nama_lengkap' => $nama_lengkap,
                    'tanggal_lahir' => $tanggal_lahir,
                    'alamat_lengkap' => $alamat_lengkap,
                    'jenis_layanan' => $jenis_layanan,
                    'status_pasien' => $status_pasien,
                    'hasil_pemeriksaan' => $hasil_pemeriksaan,
                    'jumlah_pembayaran' => $jumlah_pembayaran,
                    'foto_pasien' => $foto_pasien,
                    'dokumen_pdf' => $dokumen_pdf,
                    'encryption_info' => [
                        'nama_encryption' => 'XOR',
                        'alamat_encryption' => 'XOR',
                        'hasil_encryption' => 'Altbash + AES',
                        'pembayaran_encryption' => 'Tidak dienkripsi'
                    ]
                ], "Data pasien berhasil disimpan!");
            } else {
                throw new Exception("Execute failed: " . $stmt->error);
            }

            $stmt->close();
        } catch (Exception $e) {
            $this->sendError($e->getMessage());
        }
    }

    /**
     * Altbash + AES Encryption
     * Kombinasi algoritma Altbash (custom) dan AES untuk keamanan berlapis
     */
    private function altbashAesEncrypt($data)
    {
        // Step 1: Altbash Encryption (Custom Algorithm)
        $altbash_encrypted = $this->altbashEncrypt($data);

        // Step 2: AES Encryption
        $aes_encrypted = $this->aesEncrypt($altbash_encrypted);

        return $aes_encrypted;
    }

    /**
     * Altbash Decryption (untuk keperluan debugging/verifikasi)
     */
    private function altbashAesDecrypt($encryptedData)
    {
        // Step 1: AES Decryption
        $aes_decrypted = $this->aesDecrypt($encryptedData);

        // Step 2: Altbash Decryption
        $altbash_decrypted = $this->altbashDecrypt($aes_decrypted);

        return $altbash_decrypted;
    }

    /**
     * Custom Altbash Encryption Algorithm
     * Menggunakan kombinasi character shifting, XOR, dan base64 encoding
     */
    private function altbashEncrypt($data)
    {
        if (empty($data)) return '';

        $data = mb_convert_encoding($data, 'UTF-8');
        $key = mb_convert_encoding(XOR_KEY, 'UTF-8');

        $encrypted = '';
        $dataLen = mb_strlen($data, 'UTF-8');
        $keyLen = mb_strlen($key, 'UTF-8');

        // Step 1: Character shifting (+3 positions)
        for ($i = 0; $i < $dataLen; $i++) {
            $char = mb_substr($data, $i, 1, 'UTF-8');
            $ascii = ord($char);
            $shifted_ascii = ($ascii + 3) % 256;
            $encrypted .= chr($shifted_ascii);
        }

        // Step 2: XOR with key
        $xor_encrypted = '';
        for ($i = 0; $i < $dataLen; $i++) {
            $dataChar = $encrypted[$i];
            $keyChar = mb_substr($key, $i % $keyLen, 1, 'UTF-8');

            $dataAscii = ord($dataChar);
            $keyAscii = ord($keyChar);
            $xorAscii = $dataAscii ^ $keyAscii;

            $xor_encrypted .= chr($xorAscii);
        }

        // Step 3: Reverse string
        $reversed = strrev($xor_encrypted);

        // Step 4: Base64 encode
        return base64_encode($reversed);
    }

    /**
     * Altbash Decryption
     */
    private function altbashDecrypt($encryptedData)
    {
        if (empty($encryptedData)) return '';

        $key = mb_convert_encoding(XOR_KEY, 'UTF-8');

        // Step 1: Base64 decode
        $decoded = base64_decode($encryptedData);

        // Step 2: Reverse string (undo step 3)
        $reversed = strrev($decoded);

        // Step 3: XOR with key (undo step 2)
        $dataLen = strlen($reversed);
        $keyLen = mb_strlen($key, 'UTF-8');
        $xor_decrypted = '';

        for ($i = 0; $i < $dataLen; $i++) {
            $dataChar = $reversed[$i];
            $keyChar = mb_substr($key, $i % $keyLen, 1, 'UTF-8');

            $dataAscii = ord($dataChar);
            $keyAscii = ord($keyChar);
            $xorAscii = $dataAscii ^ $keyAscii;

            $xor_decrypted .= chr($xorAscii);
        }

        // Step 4: Character shifting (-3 positions) - undo step 1
        $decrypted = '';
        for ($i = 0; $i < $dataLen; $i++) {
            $char = $xor_decrypted[$i];
            $ascii = ord($char);
            $shifted_ascii = ($ascii - 3 + 256) % 256;
            $decrypted .= chr($shifted_ascii);
        }

        return $decrypted;
    }

    /**
     * AES Encryption
     */
    private function aesEncrypt($data)
    {
        if (empty($data)) return '';

        $encrypted = openssl_encrypt(
            $data,
            'AES-256-CBC',
            AES_KEY,
            OPENSSL_RAW_DATA,
            AES_IV
        );

        return base64_encode($encrypted);
    }

    /**
     * AES Decryption
     */
    private function aesDecrypt($encryptedData)
    {
        if (empty($encryptedData)) return '';

        $decrypted = openssl_decrypt(
            base64_decode($encryptedData),
            'AES-256-CBC',
            AES_KEY,
            OPENSSL_RAW_DATA,
            AES_IV
        );

        return $decrypted;
    }

    /**
     * XOR Encryption method
     */
    private function xorEncrypt($data, $key)
    {
        if (empty($data)) return '';

        $data = mb_convert_encoding($data, 'UTF-8');
        $key = mb_convert_encoding($key, 'UTF-8');

        $encrypted = '';
        $dataLen = mb_strlen($data, 'UTF-8');
        $keyLen = mb_strlen($key, 'UTF-8');

        for ($i = 0; $i < $dataLen; $i++) {
            $dataChar = mb_substr($data, $i, 1, 'UTF-8');
            $keyChar = mb_substr($key, $i % $keyLen, 1, 'UTF-8');

            $dataAscii = ord($dataChar);
            $keyAscii = ord($keyChar);
            $encryptedAscii = $dataAscii ^ $keyAscii;

            $encrypted .= chr($encryptedAscii);
        }

        return base64_encode($encrypted);
    }

    /**
     * XOR Decryption method
     */
    private function xorDecrypt($encryptedData, $key)
    {
        if (empty($encryptedData)) return '';

        $encrypted = base64_decode($encryptedData);
        $key = mb_convert_encoding($key, 'UTF-8');

        $decrypted = '';
        $dataLen = strlen($encrypted);
        $keyLen = mb_strlen($key, 'UTF-8');

        for ($i = 0; $i < $dataLen; $i++) {
            $encryptedChar = $encrypted[$i];
            $keyChar = mb_substr($key, $i % $keyLen, 1, 'UTF-8');

            $encryptedAscii = ord($encryptedChar);
            $keyAscii = ord($keyChar);
            $decryptedAscii = $encryptedAscii ^ $keyAscii;

            $decrypted .= chr($decryptedAscii);
        }

        return $decrypted;
    }

    private function validateFormData()
    {
        $errors = [];
        $requiredFields = [
            'namaPasien' => 'Nama Pasien',
            'tanggalLahir' => 'Tanggal Lahir',
            'alamat' => 'Alamat',
            'jenisLayanan' => 'Jenis Layanan',
            'statusPasien' => 'Status Pasien',
            'hasilPemeriksaan' => 'Hasil Pemeriksaan',
            'jumlahPembayaran' => 'Jumlah Pembayaran'
        ];

        foreach ($requiredFields as $field => $label) {
            if (empty($_POST[$field])) {
                $errors[] = $label . ' harus diisi';
            }
        }

        // Validate file uploads
        if (isset($_FILES['fotoPasien']) && $_FILES['fotoPasien']['error'] === 0) {
            if (!$this->validateFile($_FILES['fotoPasien'], 'image')) {
                $errors[] = 'Foto pasien tidak valid';
            }
        }

        if (isset($_FILES['pdfDokumen']) && $_FILES['pdfDokumen']['error'] === 0) {
            if (!$this->validateFile($_FILES['pdfDokumen'], 'pdf')) {
                $errors[] = 'Dokumen PDF tidak valid';
            }
        }

        return $errors;
    }

    private function validateFile($file, $type)
    {
        $maxSize = 5 * 1024 * 1024; // 5MB

        if ($file['size'] > $maxSize) {
            return false;
        }

        if ($type === 'image') {
            $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            return in_array($file['type'], $allowedTypes);
        }

        if ($type === 'pdf') {
            return $file['type'] === 'application/pdf';
        }

        return false;
    }

    private function handleFileUpload($fieldName, $type)
    {
        if (!isset($_FILES[$fieldName]) || $_FILES[$fieldName]['error'] !== UPLOAD_ERR_OK) {
            return null;
        }

        $uploadDir = __DIR__ . '/uploads/' . $type . '/';

        // Create directory if it doesn't exist
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $fileExtension = pathinfo($_FILES[$fieldName]['name'], PATHINFO_EXTENSION);
        $fileName = uniqid() . '_' . time() . '.' . $fileExtension;
        $targetPath = $uploadDir . $fileName;

        if (move_uploaded_file($_FILES[$fieldName]['tmp_name'], $targetPath)) {
            return $fileName;
        }

        return null;
    }

    private function mapStatusPasien($statusFromForm)
    {
        $statusMap = [
            'menunggu' => 'menunggu',
            'perawatan' => 'dalam perawatan',
            'selesai' => 'selesai'
        ];

        return $statusMap[$statusFromForm] ?? 'menunggu';
    }

    private function sanitizeInput($data)
    {
        if ($this->conn) {
            return $this->conn->real_escape_string(trim($data));
        }
        return trim($data);
    }

    private function sendSuccess($data, $message)
    {
        echo json_encode([
            'success' => true,
            'message' => $message,
            'data' => $data
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    private function sendError($message, $code = 400)
    {
        http_response_code($code);
        echo json_encode([
            'success' => false,
            'error' => $message
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    public function __destruct()
    {
        if ($this->conn) {
            $this->conn->close();
        }
    }
}

// Handle the request
$handler = new PatientHandler();
$handler->handleRequest();
