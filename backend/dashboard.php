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
define('DB_USER', 'root'); // Ganti dengan username database Anda
define('DB_PASS', ''); // Ganti dengan password database Anda
define('DB_NAME', 'kriptoproject');

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
            $jumlah_pembayaran = floatval($_POST['jumlahPembayaran']);

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

            // Bind parameters
            $stmt->bind_param(
                "ssssssssd",
                $nama_lengkap,
                $tanggal_lahir,
                $alamat_lengkap,
                $jenis_layanan, // disimpan di informasi_medis
                $status_pasien,
                $hasil_pemeriksaan,
                $foto_pasien,
                $dokumen_pdf,
                $jumlah_pembayaran
            );

            if ($stmt->execute()) {
                $patientId = $stmt->insert_id;
                $this->sendSuccess([
                    'id_pasien' => $patientId,
                    'nama_lengkap' => $nama_lengkap,
                    'tanggal_lahir' => $tanggal_lahir,
                    'jenis_layanan' => $jenis_layanan,
                    'status_pasien' => $status_pasien,
                    'jumlah_pembayaran' => $jumlah_pembayaran,
                    'foto_pasien' => $foto_pasien,
                    'dokumen_pdf' => $dokumen_pdf
                ], "Data pasien berhasil disimpan!");
            } else {
                throw new Exception("Execute failed: " . $stmt->error);
            }

            $stmt->close();
        } catch (Exception $e) {
            $this->sendError($e->getMessage());
        }
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
                $errors[] = $label;
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
