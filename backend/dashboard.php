<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/upload_errors.log');

// Database configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'kriptoproject');

// Encryption keys
define('XOR_KEY', 'medicare_secret_key_2024');
define('AES_KEY', 'medicare_aes_key_2024_32bytes_long!');
define('AES_IV', '1234567890123456');

class PatientHandler
{
    private $conn;

    public function __construct()
    {
        $this->logMessage("=== NEW REQUEST STARTED ===");
        $this->logMessage("Script location: " . __DIR__);
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
            $this->logMessage("Database connected successfully");
        } catch (Exception $e) {
            $this->sendError($e->getMessage());
        }
    }

    public function handleRequest()
    {
        $this->logMessage("Request method: " . $_SERVER['REQUEST_METHOD']);
        
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $this->savePatientData();
        } else {
            $this->sendError('Method not allowed', 405);
        }
    }

    private function savePatientData()
    {
        try {
            $this->logMessage("=== START PROCESSING FORM DATA ===");
            
            // Log semua data yang diterima
            $this->logMessage("POST data: " . print_r($_POST, true));
            $this->logMessage("FILES data: " . print_r($_FILES, true));

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
            $jumlah_pembayaran = floatval($_POST['jumlahPembayaran']);

            $this->logMessage("Form data sanitized successfully");

            // Encrypt sensitive data
            $encrypted_nama = $this->xorEncrypt($nama_lengkap, XOR_KEY);
            $encrypted_alamat = $this->xorEncrypt($alamat_lengkap, XOR_KEY);
            $encrypted_hasil = $this->altbashAesEncrypt($hasil_pemeriksaan);

            $this->logMessage("Data encrypted successfully");

            // Handle file uploads
            $this->logMessage("Starting file upload process...");
            $foto_pasien = $this->handleFileUpload('fotoPasien', 'images');
            $dokumen_pdf = $this->handleFileUpload('pdfDokumen', 'pdfs');

            $this->logMessage("File upload results - Foto: " . ($foto_pasien ? $foto_pasien : 'NULL') . ", PDF: " . ($dokumen_pdf ? $dokumen_pdf : 'NULL'));

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

            $this->logMessage("SQL: " . $sql);

            $stmt = $this->conn->prepare($sql);
            if (!$stmt) {
                throw new Exception("Prepare statement failed: " . $this->conn->error);
            }

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
                $jumlah_pembayaran
            );

            if ($stmt->execute()) {
                $patientId = $stmt->insert_id;
                $this->logMessage("Data successfully inserted with ID: " . $patientId);

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
                    'debug_info' => [
                        'foto_uploaded' => !empty($foto_pasien),
                        'pdf_uploaded' => !empty($dokumen_pdf),
                        'script_location' => __DIR__,
                        'upload_base_path' => realpath(__DIR__ . '/../../uploads/')
                    ]
                ], "Data pasien berhasil disimpan!");
            } else {
                throw new Exception("Execute failed: " . $stmt->error);
            }

            $stmt->close();
        } catch (Exception $e) {
            $this->logMessage("ERROR: " . $e->getMessage());
            $this->sendError($e->getMessage());
        }
    }

    private function handleFileUpload($fieldName, $type)
    {
        $this->logMessage("=== START FILE UPLOAD: $fieldName ===");
        
        if (!isset($_FILES[$fieldName])) {
            $this->logMessage("ERROR: File field $fieldName not found in FILES");
            return null;
        }

        $file = $_FILES[$fieldName];
        $this->logMessage("File info: " . print_r($file, true));

        if ($file['error'] !== UPLOAD_ERR_OK) {
            $this->logMessage("ERROR: Upload error code: " . $file['error']);
            $this->logMessage("Upload error meaning: " . $this->getUploadErrorMeaning($file['error']));
            return null;
        }

        // Multiple path attempts
        $possiblePaths = [
            __DIR__ . '/../../uploads/' . $type . '/',  // Current attempt
            __DIR__ . '/../uploads/' . $type . '/',     // One level up
            $_SERVER['DOCUMENT_ROOT'] . '/uploads/' . $type . '/', // From document root
        ];

        $uploadDir = null;
        foreach ($possiblePaths as $path) {
            $this->logMessage("Checking path: " . $path);
            if (is_dir($path)) {
                $uploadDir = $path;
                $this->logMessage("Found existing directory: " . $path);
                break;
            }
        }

        // If no existing directory found, create the first one
        if (!$uploadDir) {
            $uploadDir = $possiblePaths[0];
            $this->logMessage("No existing directory found, will create: " . $uploadDir);
        }

        $this->logMessage("Final upload directory: " . $uploadDir);

        // Create directory if it doesn't exist
        if (!is_dir($uploadDir)) {
            $this->logMessage("Creating directory: " . $uploadDir);
            if (!mkdir($uploadDir, 0755, true)) {
                $this->logMessage("ERROR: Failed to create directory");
                return null;
            }
            $this->logMessage("Directory created successfully");
        }

        // Check directory permissions
        if (!is_writable($uploadDir)) {
            $this->logMessage("ERROR: Directory is not writable");
            $this->logMessage("Directory permissions: " . substr(sprintf('%o', fileperms($uploadDir)), -4));
            return null;
        }

        $this->logMessage("Directory is writable");

        // Validate file
        if (!$this->validateFile($file, $type)) {
            $this->logMessage("ERROR: File validation failed");
            return null;
        }

        $this->logMessage("File validation passed");

        $fileExtension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $fileName = uniqid() . '_' . time() . '.' . $fileExtension;
        $targetPath = $uploadDir . $fileName;

        $this->logMessage("Target path: " . $targetPath);
        $this->logMessage("Temp file exists: " . (file_exists($file['tmp_name']) ? 'YES' : 'NO'));
        $this->logMessage("Temp file size: " . $file['size']);

        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            $this->logMessage("File moved successfully");
            
            // Verify file was actually saved
            if (file_exists($targetPath)) {
                $fileSize = filesize($targetPath);
                $this->logMessage("File verified - Size: " . $fileSize . " bytes");
                return $fileName;
            } else {
                $this->logMessage("ERROR: File move reported success but file not found at target");
                return null;
            }
        } else {
            $this->logMessage("ERROR: move_uploaded_file failed");
            $this->logMessage("Last PHP error: " . error_get_last()['message'] ?? 'Unknown');
            return null;
        }
    }

    private function getUploadErrorMeaning($errorCode)
    {
        $errors = [
            UPLOAD_ERR_OK => 'There is no error, the file uploaded with success',
            UPLOAD_ERR_INI_SIZE => 'The uploaded file exceeds the upload_max_filesize directive in php.ini',
            UPLOAD_ERR_FORM_SIZE => 'The uploaded file exceeds the MAX_FILE_SIZE directive that was specified in the HTML form',
            UPLOAD_ERR_PARTIAL => 'The uploaded file was only partially uploaded',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing a temporary folder',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk.',
            UPLOAD_ERR_EXTENSION => 'A PHP extension stopped the file upload.',
        ];
        
        return $errors[$errorCode] ?? 'Unknown error';
    }

    private function validateFile($file, $type)
    {
        $maxSize = 5 * 1024 * 1024; // 5MB

        if ($file['size'] <= 0) {
            $this->logMessage("ERROR: File size is 0");
            return false;
        }

        if ($file['size'] > $maxSize) {
            $this->logMessage("ERROR: File too large: " . $file['size'] . " bytes");
            return false;
        }

        // Get actual MIME type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        $this->logMessage("Detected MIME type: " . $mime);

        if ($type === 'images') {
            $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            $isValid = in_array($mime, $allowedTypes);
            $this->logMessage("Image validation: " . ($isValid ? 'VALID' : 'INVALID'));
            return $isValid;
        }

        if ($type === 'pdfs') {
            $isValid = ($mime === 'application/pdf');
            $this->logMessage("PDF validation: " . ($isValid ? 'VALID' : 'INVALID'));
            return $isValid;
        }

        $this->logMessage("ERROR: Unknown file type: " . $type);
        return false;
    }

    private function logMessage($message)
    {
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[$timestamp] $message\n";
        error_log($logMessage, 3, __DIR__ . '/upload_debug.log');
    }

    // ... (encryption methods remain the same as previous version)
    private function altbashAesEncrypt($data)
    {
        if (empty($data)) return '';

        $altbash_encrypted = $this->altbashEncrypt($data);
        $aes_encrypted = $this->aesEncrypt($altbash_encrypted);

        return $aes_encrypted;
    }

    private function altbashEncrypt($data)
    {
        if (empty($data)) return '';

        $data = mb_convert_encoding($data, 'UTF-8');
        $key = mb_convert_encoding(XOR_KEY, 'UTF-8');

        $encrypted = '';
        $dataLen = mb_strlen($data, 'UTF-8');
        $keyLen = mb_strlen($key, 'UTF-8');

        for ($i = 0; $i < $dataLen; $i++) {
            $char = mb_substr($data, $i, 1, 'UTF-8');
            $ascii = ord($char);
            $shifted_ascii = ($ascii + 3) % 256;
            $encrypted .= chr($shifted_ascii);
        }

        $xor_encrypted = '';
        for ($i = 0; $i < $dataLen; $i++) {
            $dataChar = $encrypted[$i];
            $keyChar = mb_substr($key, $i % $keyLen, 1, 'UTF-8');

            $dataAscii = ord($dataChar);
            $keyAscii = ord($keyChar);
            $xorAscii = $dataAscii ^ $keyAscii;

            $xor_encrypted .= chr($xorAscii);
        }

        $reversed = strrev($xor_encrypted);
        return base64_encode($reversed);
    }

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

        if (isset($_FILES['fotoPasien']) && $_FILES['fotoPasien']['error'] === 0) {
            if (!$this->validateFile($_FILES['fotoPasien'], 'images')) {
                $errors[] = 'Foto pasien tidak valid';
            }
        }

        if (isset($_FILES['pdfDokumen']) && $_FILES['pdfDokumen']['error'] === 0) {
            if (!$this->validateFile($_FILES['pdfDokumen'], 'pdfs')) {
                $errors[] = 'Dokumen PDF tidak valid';
            }
        }

        return $errors;
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
        $this->logMessage("Sending success response");
        echo json_encode([
            'success' => true,
            'message' => $message,
            'data' => $data
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    private function sendError($message, $code = 400)
    {
        $this->logMessage("Sending error response: " . $message);
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
        $this->logMessage("=== REQUEST COMPLETED ===");
    }
}

// Handle the request
$handler = new PatientHandler();
$handler->handleRequest();