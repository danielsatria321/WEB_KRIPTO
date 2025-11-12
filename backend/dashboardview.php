<?php

// Start session FIRST before any output
session_start();

ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/dashboard_errors.log');

header('Content-Type: application/json; charset=utf-8');

// Handle CORS with credentials support
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, ['http://localhost', 'http://127.0.0.1', 'http://localhost:80'])) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
}

header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Database configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'kriptoproject');

// Encryption keys (SAMA dengan yang di upload.php)
define('XOR_KEY', 'medicare_secret_key_2024');
define('AES_KEY', 'medicare_aes_key_2024_32bytes_long!');
define('AES_IV', '1234567890123456');

class DashboardView
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
        $action = $_GET['action'] ?? $_POST['action'] ?? '';

        switch ($action) {
            case 'get_stats':
                $this->getDashboardStats();
                break;
            case 'get_recent_patients':
                $this->getRecentPatients();
                break;
            case 'get_patients':
                $this->getPatientsList();
                break;
            case 'get_patient_detail':
                $this->getPatientDetail();
                break;
            case 'update_patient':
                $this->updatePatient();
                break;
            case 'delete_patient':
                $this->deletePatient();
                break;
            case 'download_decrypted_pdf':
                $this->downloadDecryptedPdf();
                break;
            case 'extract_steganography': // NEW ACTION untuk ekstraksi steganografi
                $this->extractSteganographyMessage();
                break;
            case 'update_patient_files':
                $this->updatePatientFiles();
                break;
            default:
                $this->sendError('Action tidak valid');
        }
    }

    // ==================== IMPROVED DECRYPTION METHODS ====================

    /**
     * Decrypt XOR encrypted data
     */
    private function xorDecrypt($encryptedData, $key)
    {
        if (empty($encryptedData)) return '';

        $data = base64_decode($encryptedData);
        $key = mb_convert_encoding($key, 'UTF-8');

        $decrypted = '';
        $dataLen = strlen($data);
        $keyLen = mb_strlen($key, 'UTF-8');

        for ($i = 0; $i < $dataLen; $i++) {
            $dataChar = $data[$i];
            $keyChar = mb_substr($key, $i % $keyLen, 1, 'UTF-8');

            $dataAscii = ord($dataChar);
            $keyAscii = ord($keyChar);
            $decryptedAscii = $dataAscii ^ $keyAscii;

            $decrypted .= chr($decryptedAscii);
        }

        return $decrypted;
    }

    /**
     * Decrypt AES encrypted data
     */
    private function aesDecrypt($encryptedData)
    {
        if (empty($encryptedData)) return '';

        $encrypted = base64_decode($encryptedData);
        
        $decrypted = openssl_decrypt(
            $encrypted,
            'AES-256-CBC',
            AES_KEY,
            OPENSSL_RAW_DATA,
            AES_IV
        );

        return $decrypted ?: '';
    }

    /**
     * Decrypt AltBash + AES encrypted data
     */
    private function altbashAesDecrypt($encryptedData)
    {
        if (empty($encryptedData)) return '';

        // First decrypt AES
        $altbashEncrypted = $this->aesDecrypt($encryptedData);
        if (empty($altbashEncrypted)) return '';

        // Then decrypt AltBash
        return $this->altbashDecrypt($altbashEncrypted);
    }

    /**
     * Decrypt Alphabet-Bashing encrypted data
     */
    private function altbashDecrypt($encryptedData)
    {
        if (empty($encryptedData)) return '';

        $data = base64_decode($encryptedData);
        $reversed = strrev($data);
        $key = mb_convert_encoding(XOR_KEY, 'UTF-8');

        $xorDecrypted = '';
        $dataLen = strlen($reversed);
        $keyLen = mb_strlen($key, 'UTF-8');

        for ($i = 0; $i < $dataLen; $i++) {
            $dataChar = $reversed[$i];
            $keyChar = mb_substr($key, $i % $keyLen, 1, 'UTF-8');

            $dataAscii = ord($dataChar);
            $keyAscii = ord($keyChar);
            $xorAscii = $dataAscii ^ $keyAscii;

            $xorDecrypted .= chr($xorAscii);
        }

        $decrypted = '';
        $dataLen = strlen($xorDecrypted);

        for ($i = 0; $i < $dataLen; $i++) {
            $char = $xorDecrypted[$i];
            $ascii = ord($char);
            $shiftedAscii = ($ascii - 3 + 256) % 256;
            $decrypted .= chr($shiftedAscii);
        }

        return $decrypted;
    }

    /**
     * Decrypt PDF file that was encrypted with Caesar + AES
     */
    private function decryptPdfFile($encryptedContent)
    {
        try {
            // Step 1: AES decryption
            $aesDecrypted = $this->aesDecryptBinary($encryptedContent);
            if ($aesDecrypted === false) {
                throw new Exception("AES decryption failed");
            }

            // Step 2: Caesar Cipher decryption (shift of 5)
            $decrypted = $this->caesarCipherDecrypt($aesDecrypted, 5);

            return $decrypted;
        } catch (Exception $e) {
            $this->logMessage("ERROR in decryptPdfFile: " . $e->getMessage());
            return false;
        }
    }

    /**
     * AES decryption for binary data
     */
    private function aesDecryptBinary($data)
    {
        if (empty($data)) {
            return false;
        }

        $decrypted = openssl_decrypt(
            $data,
            'AES-256-CBC',
            AES_KEY,
            OPENSSL_RAW_DATA,
            AES_IV
        );

        return $decrypted;
    }

    /**
     * Caesar Cipher decryption for binary data
     */
    private function caesarCipherDecrypt($data, $shift)
    {
        $decrypted = '';
        $length = strlen($data);
        
        for ($i = 0; $i < $length; $i++) {
            $byte = ord($data[$i]);
            // Apply Caesar shift (mod 256 for bytes)
            $decryptedByte = ($byte - $shift + 256) % 256;
            $decrypted .= chr($decryptedByte);
        }
        
        return $decrypted;
    }

    /**
     * ✅ FIXED: Extract hidden message from steganographed image menggunakan algoritma yang sama dengan test
     */
    private function extractMessageFromImage($imagePath)
    {
        try {
            $this->logMessage("=== EXTRACTING MESSAGE FROM IMAGE (FIXED ALGORITHM) ===");
            
            if (!file_exists($imagePath)) {
                throw new Exception("Image file not found: " . $imagePath);
            }

            $imageInfo = getimagesize($imagePath);
            if ($imageInfo === false) {
                throw new Exception("Cannot get image information");
            }

            $width = $imageInfo[0];
            $height = $imageInfo[1];
            $imageType = $imageInfo[2];
            
            $this->logMessage("Image dimensions: {$width}x{$height}, Type: {$imageType}");

            // Load image - support WebP dan format lainnya
            $image = null;
            switch ($imageType) {
                case IMAGETYPE_JPEG:
                    $image = imagecreatefromjpeg($imagePath);
                    $this->logMessage("Loaded as JPEG");
                    break;
                case IMAGETYPE_PNG:
                    $image = imagecreatefrompng($imagePath);
                    $this->logMessage("Loaded as PNG");
                    break;
                case IMAGETYPE_GIF:
                    $image = imagecreatefromgif($imagePath);
                    $this->logMessage("Loaded as GIF");
                    break;
                case 18: // IMAGETYPE_WEBP
                    if (function_exists('imagecreatefromwebp')) {
                        $image = imagecreatefromwebp($imagePath);
                        $this->logMessage("Loaded as WEBP");
                    } else {
                        throw new Exception("WebP not supported on this server");
                    }
                    break;
                default:
                    throw new Exception("Unsupported image type: " . $imageType);
            }

            if (!$image) {
                throw new Exception("Cannot create image from source");
            }

            // ✅ FIXED: Extract header menggunakan algoritma yang sama dengan embedding
            $headerBits = '';
            $bitsExtracted = 0;
            $headerSize = 32;

            $this->logMessage("Extracting header...");
            for ($y = 0; $y < $height; $y++) {
                for ($x = 0; $x < $width; $x++) {
                    if ($bitsExtracted >= $headerSize) break 2;
                    
                    $rgb = imagecolorat($image, $x, $y);
                    $r = ($rgb >> 16) & 0xFF;
                    $g = ($rgb >> 8) & 0xFF;
                    $b = $rgb & 0xFF;

                    // Extract dari LSB - URUTAN SAMA dengan enkripsi
                    $headerBits .= $r & 1;
                    $bitsExtracted++;
                    if ($bitsExtracted >= $headerSize) break;
                    
                    $headerBits .= $g & 1;
                    $bitsExtracted++;
                    if ($bitsExtracted >= $headerSize) break;
                    
                    $headerBits .= $b & 1;
                    $bitsExtracted++;
                    if ($bitsExtracted >= $headerSize) break;
                }
            }

            $this->logMessage("Header bits extracted: " . $bitsExtracted);

            // Convert header bits to message length
            $messageLength = 0;
            for ($i = 0; $i < 32; $i += 8) {
                $byte = bindec(substr($headerBits, $i, 8));
                $messageLength = ($messageLength << 8) | $byte;
            }

            $this->logMessage("Message length from header: " . $messageLength);

            if ($messageLength <= 0 || $messageLength > 100000) {
                $this->logMessage("No valid message found (invalid length: $messageLength)");
                imagedestroy($image);
                return false;
            }

            // ✅ FIXED: Extract encrypted message dengan algoritma yang DIPERBAIKI
            $encryptedBits = '';
            $bitsNeeded = $messageLength * 8;
            $bitsExtracted = 0;

            $this->logMessage("Extracting message data ($bitsNeeded bits needed)...");
            
            // ✅ PERBAIKAN: Gunakan counter bit GLOBAL, bukan skip per pixel
            $globalBitCounter = 0;
            
            for ($y = 0; $y < $height; $y++) {
                for ($x = 0; $x < $width; $x++) {
                    $rgb = imagecolorat($image, $x, $y);
                    $r = ($rgb >> 16) & 0xFF;
                    $g = ($rgb >> 8) & 0xFF;
                    $b = $rgb & 0xFF;

                    // Process each channel
                    $channels = [$r, $g, $b];
                    
                    foreach ($channels as $channel) {
                        // Skip bits yang sudah digunakan untuk header
                        if ($globalBitCounter < 32) {
                            $globalBitCounter++;
                            continue;
                        }

                        // Extract message bits setelah header
                        if ($bitsExtracted < $bitsNeeded) {
                            $encryptedBits .= $channel & 1;
                            $bitsExtracted++;
                            $globalBitCounter++;
                        } else {
                            break 3; // Keluar dari semua loop
                        }
                    }
                }
            }

            $this->logMessage("Message bits extracted: " . $bitsExtracted);
            $this->logMessage("Total bits processed: " . $globalBitCounter);

            if ($bitsExtracted < $bitsNeeded) {
                $this->logMessage("ERROR: Not enough bits extracted. Needed: $bitsNeeded, Got: $bitsExtracted");
                imagedestroy($image);
                return false;
            }

            // Convert bits to bytes
            $encryptedMessage = '';
            for ($i = 0; $i < $bitsNeeded; $i += 8) {
                $byteBits = substr($encryptedBits, $i, 8);
                if (strlen($byteBits) < 8) {
                    $this->logMessage("ERROR: Incomplete byte at position $i");
                    break;
                }
                $byte = bindec($byteBits);
                $encryptedMessage .= chr($byte);
            }

            $this->logMessage("Encrypted message length: " . strlen($encryptedMessage) . " bytes");

            // ✅ FIXED: DECRYPTION dengan error handling yang lebih baik
            $this->logMessage("Attempting AES decryption...");
            
            $decrypted = openssl_decrypt(
                $encryptedMessage,
                'AES-256-CBC',
                AES_KEY,
                OPENSSL_RAW_DATA,
                AES_IV
            );

            if ($decrypted === false) {
                $error = openssl_error_string();
                $this->logMessage("AES decryption failed: " . $error);
                
                // Coba alternatif: handle padding manual
                $decrypted = $this->decryptWithPaddingHandling($encryptedMessage);
                if ($decrypted === false) {
                    $this->logMessage("Alternative decryption also failed");
                    imagedestroy($image);
                    return false;
                }
            }

            // Remove PKCS7 padding
            $originalMessage = $this->pkcs7Unpad($decrypted);
            
            if ($originalMessage === false) {
                $this->logMessage("Padding removal failed, using raw decrypted data");
                $originalMessage = $decrypted;
            }
            
            $this->logMessage("✓ Decryption successful");
            
            imagedestroy($image);
            
            return $originalMessage;

        } catch (Exception $e) {
            $this->logMessage("ERROR in extractMessageFromImage: " . $e->getMessage());
            if (isset($image)) {
                imagedestroy($image);
            }
            return false;
        }
    }

    /**
     * Alternative decryption dengan padding handling
     */
    private function decryptWithPaddingHandling($encryptedMessage)
    {
        $this->logMessage("Trying alternative decryption with padding handling...");
        
        // Coba tanpa OPENSSL_RAW_DATA dulu
        $decrypted = openssl_decrypt(
            $encryptedMessage,
            'AES-256-CBC',
            AES_KEY,
            0, // Bukan raw data
            AES_IV
        );

        if ($decrypted === false) {
            // Coba dengan zero padding
            $decrypted = openssl_decrypt(
                $encryptedMessage,
                'AES-256-CBC',
                AES_KEY,
                OPENSSL_ZERO_PADDING,
                AES_IV
            );
        }

        return $decrypted;
    }

    /**
     * PKCS7 Unpadding dengan error handling
     */
    private function pkcs7Unpad($data)
    {
        if (empty($data)) return '';
        
        $dataLength = strlen($data);
        if ($dataLength == 0) return '';
        
        $padding = ord($data[$dataLength - 1]);
        
        // Validasi padding
        if ($padding > 16 || $padding == 0 || $padding > $dataLength) {
            return $data; // Return data as-is jika padding invalid
        }
        
        // Check semua byte padding
        for ($i = 0; $i < $padding; $i++) {
            if (ord($data[$dataLength - $i - 1]) != $padding) {
                return $data; // Return data as-is jika padding tidak konsisten
            }
        }
        
        return substr($data, 0, -$padding);
    }

    /**
     * New endpoint untuk download decrypted PDF
     */
    private function downloadDecryptedPdf()
    {
        try {
            $patientId = intval($_GET['patient_id'] ?? 0);

            if ($patientId <= 0) {
                throw new Exception("Patient ID tidak valid");
            }

            // Get patient data including PDF filename
            $query = "SELECT dokumen_pdf FROM pasien WHERE id_pasien = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->bind_param("i", $patientId);
            $stmt->execute();
            $result = $stmt->get_result();

            if ($result->num_rows === 0) {
                throw new Exception("Data pasien tidak ditemukan");
            }

            $patient = $result->fetch_assoc();
            $encryptedPdfFilename = $patient['dokumen_pdf'];

            if (empty($encryptedPdfFilename)) {
                throw new Exception("Tidak ada dokumen PDF untuk pasien ini");
            }

            // Find the encrypted PDF file
            $possiblePaths = [
                __DIR__ . '/../../uploads/pdfs/' . $encryptedPdfFilename,
                __DIR__ . '/../uploads/pdfs/' . $encryptedPdfFilename,
                $_SERVER['DOCUMENT_ROOT'] . '/uploads/pdfs/' . $encryptedPdfFilename,
            ];

            $pdfPath = null;
            foreach ($possiblePaths as $path) {
                if (file_exists($path)) {
                    $pdfPath = $path;
                    break;
                }
            }

            if ($pdfPath === null) {
                throw new Exception("File PDF tidak ditemukan");
            }

            // Read encrypted file
            $encryptedContent = file_get_contents($pdfPath);
            if ($encryptedContent === false) {
                throw new Exception("Tidak dapat membaca file PDF");
            }

            // Decrypt PDF
            $decryptedContent = $this->decryptPdfFile($encryptedContent);
            if ($decryptedContent === false) {
                throw new Exception("Gagal mendekripsi PDF");
            }

            // Set headers for download
            header('Content-Type: application/pdf');
            header('Content-Disposition: attachment; filename="decrypted_patient_' . $patientId . '.pdf"');
            header('Content-Length: ' . strlen($decryptedContent));

            echo $decryptedContent;
            exit;

        } catch (Exception $e) {
            $this->sendError("Error downloading PDF: " . $e->getMessage());
        }
    }

    /**
     * ✅ NEW: Endpoint khusus untuk ekstraksi steganografi
     */
    private function extractSteganographyMessage()
    {
        try {
            // Validate session
            if (!isset($_SESSION['username'])) {
                throw new Exception("Session tidak valid. Silakan login kembali.");
            }

            $patientId = intval($_GET['patient_id'] ?? $_POST['patient_id'] ?? 0);

            if ($patientId <= 0) {
                throw new Exception("Patient ID tidak valid");
            }

            $query = "SELECT foto_pasien FROM pasien WHERE id_pasien = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->bind_param("i", $patientId);
            $stmt->execute();
            $result = $stmt->get_result();

            if ($result->num_rows === 0) {
                throw new Exception("Data pasien tidak ditemukan");
            }

            $patient = $result->fetch_assoc();
            $imageFilename = $patient['foto_pasien'];

            if (empty($imageFilename)) {
                throw new Exception("Tidak ada gambar untuk pasien ini");
            }

            // Find the image file
            $possiblePaths = [
                __DIR__ . '/../../uploads/images/' . $imageFilename,
                __DIR__ . '/../uploads/images/' . $imageFilename,
                $_SERVER['DOCUMENT_ROOT'] . '/uploads/images/' . $imageFilename,
            ];

            $imagePath = null;
            foreach ($possiblePaths as $path) {
                if (file_exists($path)) {
                    $imagePath = $path;
                    break;
                }
            }

            if ($imagePath === null) {
                throw new Exception("File gambar tidak ditemukan");
            }

            // Extract message menggunakan algoritma yang sudah diperbaiki
            $message = $this->extractMessageFromImage($imagePath);

            if ($message === false) {
                throw new Exception("Tidak dapat mengekstrak pesan dari gambar");
            }

            $this->sendSuccess([
                'message' => $message,
                'patient_id' => $patientId,
                'image_file' => $imageFilename
            ], "Pesan berhasil diekstrak dari gambar");

        } catch (Exception $e) {
            $this->sendError("Error extracting steganography: " . $e->getMessage());
        }
    }

    // ==================== DATA RETRIEVAL METHODS ====================

    private function getDashboardStats()
    {
        try {
            // Total patients
            $totalQuery = "SELECT COUNT(*) as total_pasien FROM pasien";
            $totalResult = $this->conn->query($totalQuery);
            $total = $totalResult->fetch_assoc();

            // Rawat inap count
            $inapQuery = "SELECT COUNT(*) as rawat_inap FROM pasien WHERE informasi_medis = 'rawat-inap'";
            $inapResult = $this->conn->query($inapQuery);
            $inap = $inapResult->fetch_assoc();

            // Rawat jalan count
            $jalanQuery = "SELECT COUNT(*) as rawat_jalan FROM pasien WHERE informasi_medis = 'rawat-jalan'";
            $jalanResult = $this->conn->query($jalanQuery);
            $jalan = $jalanResult->fetch_assoc();

            // Pemeriksaan count
            $pemeriksaanQuery = "SELECT COUNT(*) as pemeriksaan FROM pasien WHERE informasi_medis = 'pemeriksaan'";
            $pemeriksaanResult = $this->conn->query($pemeriksaanQuery);
            $pemeriksaan = $pemeriksaanResult->fetch_assoc();

            // Total payment
            $paymentQuery = "SELECT COALESCE(SUM(jumlah_pembayaran), 0) as total_pembayaran FROM pasien";
            $paymentResult = $this->conn->query($paymentQuery);
            $payment = $paymentResult->fetch_assoc();

            // New patients (last 7 days)
            $newQuery = "SELECT COUNT(*) as pasien_baru FROM pasien WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
            $newResult = $this->conn->query($newQuery);
            $new = $newResult->fetch_assoc();

            $stats = [
                'total_pasien' => (int)$total['total_pasien'],
                'rawat_inap' => (int)$inap['rawat_inap'],
                'rawat_jalan' => (int)$jalan['rawat_jalan'],
                'pemeriksaan' => (int)$pemeriksaan['pemeriksaan'],
                'total_pembayaran' => (float)$payment['total_pembayaran'],
                'pasien_baru' => (int)$new['pasien_baru']
            ];

            $this->sendSuccess($stats, "Stats loaded successfully");

        } catch (Exception $e) {
            $this->sendError("Error loading stats: " . $e->getMessage());
        }
    }

    private function getRecentPatients()
    {
        try {
            $query = "SELECT * FROM pasien ORDER BY created_at DESC LIMIT 5";
            $result = $this->conn->query($query);

            $patients = [];
            while ($row = $result->fetch_assoc()) {
                // Decrypt the data
                $row['nama_lengkap'] = $this->xorDecrypt($row['nama_lengkap'], XOR_KEY);
                $row['alamat_lengkap'] = $this->xorDecrypt($row['alamat_lengkap'], XOR_KEY);
                $row['hasil_pemeriksaan'] = $this->altbashAesDecrypt($row['hasil_pemeriksaan']);
                
                $patients[] = $row;
            }

            $this->sendSuccess($patients, "Recent patients loaded");

        } catch (Exception $e) {
            $this->sendError("Error loading recent patients: " . $e->getMessage());
        }
    }

    private function getPatientsList()
    {
        try {
            $page = intval($_GET['page'] ?? 1);
            $limit = intval($_GET['limit'] ?? 10);
            $search = $_GET['search'] ?? '';
            $status = $_GET['status'] ?? '';
            $service = $_GET['service'] ?? '';

            $offset = ($page - 1) * $limit;

            // Build WHERE conditions
            $whereConditions = [];
            $params = [];
            $types = '';

            if (!empty($search)) {
                $whereConditions[] = "(nama_lengkap LIKE ? OR alamat_lengkap LIKE ?)";
                $searchTerm = "%$search%";
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $types .= 'ss';
            }

            if (!empty($status)) {
                $whereConditions[] = "status_pasien = ?";
                $params[] = $status;
                $types .= 's';
            }

            if (!empty($service)) {
                $whereConditions[] = "informasi_medis = ?";
                $params[] = $service;
                $types .= 's';
            }

            $whereClause = '';
            if (!empty($whereConditions)) {
                $whereClause = "WHERE " . implode(" AND ", $whereConditions);
            }

            // Count total records
            $countQuery = "SELECT COUNT(*) as total FROM pasien $whereClause";
            $countStmt = $this->conn->prepare($countQuery);
            
            if (!empty($params)) {
                $countStmt->bind_param($types, ...$params);
            }
            
            $countStmt->execute();
            $countResult = $countStmt->get_result();
            $totalCount = $countResult->fetch_assoc()['total'];
            $totalPages = ceil($totalCount / $limit);

            $dataQuery = "SELECT * FROM pasien $whereClause ORDER BY created_at DESC, id_pasien DESC LIMIT ? OFFSET ?";
            $dataStmt = $this->conn->prepare($dataQuery);
            
            $params[] = $limit;
            $params[] = $offset;
            $types .= 'ii';

            if (!empty($params)) {
                $dataStmt->bind_param($types, ...$params);
            }
            
            $dataStmt->execute();
            $result = $dataStmt->get_result();

            $patients = [];
            while ($row = $result->fetch_assoc()) {
                // Decrypt the data for display
                $row['nama_lengkap'] = $this->xorDecrypt($row['nama_lengkap'], XOR_KEY);
                $row['alamat_lengkap'] = $this->xorDecrypt($row['alamat_lengkap'], XOR_KEY);
                $row['hasil_pemeriksaan'] = $this->altbashAesDecrypt($row['hasil_pemeriksaan']);
                
                $patients[] = $row;
            }

            $response = [
                'patients' => $patients,
                'total_pages' => $totalPages,
                'current_page' => $page,
                'total_count' => $totalCount
            ];

            $this->sendSuccess($response, "Patients list loaded");

        } catch (Exception $e) {
            $this->sendError("Error loading patients list: " . $e->getMessage());
        }
    }

    private function getPatientDetail()
    {
        try {
            $patientId = intval($_GET['patient_id'] ?? $_POST['patient_id'] ?? 0);

            if ($patientId <= 0) {
                throw new Exception("Patient ID tidak valid");
            }

            $query = "SELECT * FROM pasien WHERE id_pasien = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->bind_param("i", $patientId);
            $stmt->execute();
            $result = $stmt->get_result();

            if ($result->num_rows === 0) {
                throw new Exception("Data pasien tidak ditemukan");
            }

            $patient = $result->fetch_assoc();

            // Decrypt all encrypted data
            $patient['nama_lengkap'] = $this->xorDecrypt($patient['nama_lengkap'], XOR_KEY);
            $patient['alamat_lengkap'] = $this->xorDecrypt($patient['alamat_lengkap'], XOR_KEY);
            $patient['hasil_pemeriksaan'] = $this->altbashAesDecrypt($patient['hasil_pemeriksaan']);

            // ✅ FIXED: Extract medical message from image menggunakan algoritma yang sudah diperbaiki
            $medicalMessage = '';
            if (!empty($patient['foto_pasien'])) {
                $possiblePaths = [
                    __DIR__ . '/../../uploads/images/' . $patient['foto_pasien'],
                    __DIR__ . '/../uploads/images/' . $patient['foto_pasien'],
                    $_SERVER['DOCUMENT_ROOT'] . '/uploads/images/' . $patient['foto_pasien'],
                ];

                $imagePath = null;
                foreach ($possiblePaths as $path) {
                    if (file_exists($path)) {
                        $imagePath = $path;
                        break;
                    }
                }

                if ($imagePath !== null) {
                    $medicalMessage = $this->extractMessageFromImage($imagePath);
                    if ($medicalMessage === false) {
                        $medicalMessage = ''; // Jika ekstraksi gagal, set kosong
                    }
                }
            }
            $patient['medical_message'] = $medicalMessage;

            $this->sendSuccess($patient, "Patient detail loaded");

        } catch (Exception $e) {
            $this->sendError("Error loading patient detail: " . $e->getMessage());
        }
    }

    private function updatePatient()
    {
        try {
            $patientId = intval($_POST['patient_id'] ?? 0);
            
            if ($patientId <= 0) {
                throw new Exception("Patient ID tidak valid");
            }

            // Get form data
            $nama_pasien = $this->sanitizeInput($_POST['nama_pasien']);
            $tanggal_lahir = $_POST['tanggal_lahir'];
            $alamat = $this->sanitizeInput($_POST['alamat']);
            $jenis_layanan = $this->sanitizeInput($_POST['jenis_layanan']);
            $status_pasien = $this->sanitizeInput($_POST['status_pasien']);
            $hasil_pemeriksaan = $this->sanitizeInput($_POST['hasil_pemeriksaan']);
            $jumlah_pembayaran = floatval($_POST['jumlah_pembayaran']);

            // Encrypt data before updating
            $encrypted_nama = $this->xorEncrypt($nama_pasien, XOR_KEY);
            $encrypted_alamat = $this->xorEncrypt($alamat, XOR_KEY);
            $encrypted_hasil = $this->altbashAesEncrypt($hasil_pemeriksaan);

            $query = "UPDATE pasien SET 
                nama_lengkap = ?, 
                tanggal_lahir = ?, 
                alamat_lengkap = ?, 
                informasi_medis = ?, 
                status_pasien = ?, 
                hasil_pemeriksaan = ?, 
                jumlah_pembayaran = ?,
                updated_at = NOW()
                WHERE id_pasien = ?";

            $stmt = $this->conn->prepare($query);
            $stmt->bind_param(
                "ssssssdi",
                $encrypted_nama,
                $tanggal_lahir,
                $encrypted_alamat,
                $jenis_layanan,
                $status_pasien,
                $encrypted_hasil,
                $jumlah_pembayaran,
                $patientId
            );

            if ($stmt->execute()) {
                $this->sendSuccess([], "Data pasien berhasil diperbarui");
            } else {
                throw new Exception("Gagal memperbarui data: " . $stmt->error);
            }

        } catch (Exception $e) {
            $this->sendError("Error updating patient: " . $e->getMessage());
        }
    }

    private function deletePatient()
    {
        try {
            $patientId = intval($_POST['patient_id'] ?? 0);

            if ($patientId <= 0) {
                throw new Exception("Patient ID tidak valid");
            }

            $query = "DELETE FROM pasien WHERE id_pasien = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->bind_param("i", $patientId);

            if ($stmt->execute()) {
                $this->sendSuccess([], "Data pasien berhasil dihapus");
            } else {
                throw new Exception("Gagal menghapus data: " . $stmt->error);
            }

        } catch (Exception $e) {
            $this->sendError("Error deleting patient: " . $e->getMessage());
        }
    }

    // ==================== ENCRYPTION METHODS (for update) ====================

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

    // ==================== UTILITY METHODS ====================

    private function logMessage($message)
    {
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[$timestamp] $message\n";
        error_log($logMessage, 3, __DIR__ . '/dashboard_errors.log');
    }

    private function sanitizeInput($data)
    {
        if ($this->conn) {
            return $this->conn->real_escape_string(trim($data));
        }
        return trim($data);
    }

    private function sendSuccess($data, $message = "")
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

    /**
     * Update patient files (foto dan PDF)
     * Called from edit form when user uploads new files
     */
    private function updatePatientFiles()
    {
        try {
            $patientId = intval($_POST['patient_id'] ?? 0);
            
            if ($patientId <= 0) {
                throw new Exception("Patient ID tidak valid");
            }

            // Check if patient exists
            $query = "SELECT id_pasien FROM pasien WHERE id_pasien = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->bind_param("i", $patientId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                throw new Exception("Patient tidak ditemukan");
            }

            $updates = [];
            $updateFields = [];

            // Handle foto upload
            if (isset($_FILES['fotoPasien']) && $_FILES['fotoPasien']['error'] === UPLOAD_ERR_OK) {
                $fotoFile = $_FILES['fotoPasien'];
                
                // Validate image
                $imageInfo = getimagesize($fotoFile['tmp_name']);
                if ($imageInfo === false) {
                    throw new Exception("File foto bukan gambar yang valid");
                }

                // Handle file upload (simplified - just move file)
                $uploadDir = __DIR__ . '/../uploads/images/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0755, true);
                }

                $fileExtension = pathinfo($fotoFile['name'], PATHINFO_EXTENSION);
                $newFileName = uniqid() . '_' . time() . '.' . $fileExtension;
                $targetPath = $uploadDir . $newFileName;

                if (move_uploaded_file($fotoFile['tmp_name'], $targetPath)) {
                    $updateFields[] = 'foto_pasien = ?';
                    $updates['foto'] = $newFileName;
                } else {
                    throw new Exception("Gagal upload foto");
                }
            }

            // Handle PDF upload
            if (isset($_FILES['pdfDokumen']) && $_FILES['pdfDokumen']['error'] === UPLOAD_ERR_OK) {
                $pdfFile = $_FILES['pdfDokumen'];
                
                // Validate PDF
                $finfo = finfo_open(FILEINFO_MIME_TYPE);
                $mime = finfo_file($finfo, $pdfFile['tmp_name']);
                finfo_close($finfo);
                
                if ($mime !== 'application/pdf') {
                    throw new Exception("File bukan PDF yang valid");
                }

                // For now, just move PDF without encryption (or could add encryption later)
                $uploadDir = __DIR__ . '/../uploads/pdfs/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0755, true);
                }

                $fileExtension = pathinfo($pdfFile['name'], PATHINFO_EXTENSION);
                $newFileName = uniqid() . '_' . time() . '.' . $fileExtension;
                $targetPath = $uploadDir . $newFileName;

                if (move_uploaded_file($pdfFile['tmp_name'], $targetPath)) {
                    $updateFields[] = 'dokumen_pdf = ?';
                    $updates['pdf'] = $newFileName;
                } else {
                    throw new Exception("Gagal upload PDF");
                }
            }

            // If no files to update, return success with no changes
            if (empty($updateFields)) {
                $this->sendSuccess([], "Tidak ada file yang diupload");
                return;
            }

            // Update database
            $updateFields[] = 'updated_at = NOW()';
            $updateSql = "UPDATE pasien SET " . implode(', ', $updateFields) . " WHERE id_pasien = ?";
            
            $stmt = $this->conn->prepare($updateSql);
            if (!$stmt) {
                throw new Exception("Prepare statement gagal: " . $this->conn->error);
            }

            // Build bind parameters
            $params = array_values($updates);
            $params[] = $patientId;
            $types = str_repeat('s', count($updates)) . 'i';
            
            $stmt->bind_param($types, ...$params);
            
            if ($stmt->execute()) {
                $this->sendSuccess($updates, "File pasien berhasil diupdate");
            } else {
                throw new Exception("Update gagal: " . $stmt->error);
            }

        } catch (Exception $e) {
            $this->sendError("Error updating files: " . $e->getMessage());
        }
    }

    public function __destruct()
    {
        if ($this->conn) {
            $this->conn->close();
        }
    }
}

// Handle the request
$handler = new DashboardView();
$handler->handleRequest();
?>