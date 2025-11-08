<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/dashboard_errors.log');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
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
            default:
                $this->sendError('Action tidak valid');
        }
    }

    // ==================== DECRYPTION METHODS ====================

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

            // New patients (last 7 days) - PERBAIKI: gunakan created_at
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
            // PERBAIKI: gunakan created_at yang benar
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

            // PERBAIKI: gunakan created_at yang benar
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

            // PERBAIKI: gunakan id_pasien yang benar
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

            // PERBAIKI: gunakan id_pasien yang benar
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

            // PERBAIKI: gunakan id_pasien yang benar
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