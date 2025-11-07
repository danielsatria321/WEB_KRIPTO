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
            $medical_message = isset($_POST['medmsg']) ? $this->sanitizeInput($_POST['medmsg']) : '';

            $this->logMessage("Form data sanitized successfully");
            $this->logMessage("Medical message: " . $medical_message);

            // Encrypt sensitive data
            $encrypted_nama = $this->xorEncrypt($nama_lengkap, XOR_KEY);
            $encrypted_alamat = $this->xorEncrypt($alamat_lengkap, XOR_KEY);
            $encrypted_hasil = $this->altbashAesEncrypt($hasil_pemeriksaan);

            $this->logMessage("Data encrypted successfully");

            // Handle file uploads
            $this->logMessage("Starting file upload process...");
            $foto_pasien = $this->handleFileUpload('fotoPasien', 'images', $medical_message);
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
                    'medical_message' => $medical_message,
                    'steganography_applied' => !empty($medical_message) && !empty($foto_pasien),
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

    private function handleFileUpload($fieldName, $type, $medicalMessage = '')
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
            __DIR__ . '/../../uploads/' . $type . '/',
            __DIR__ . '/../uploads/' . $type . '/',
            $_SERVER['DOCUMENT_ROOT'] . '/uploads/' . $type . '/',
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

        // Handle different file types
        if ($type === 'pdfs') {
            $this->logMessage("Starting PDF encryption process...");
            if (!$this->encryptPdfFile($file['tmp_name'], $targetPath)) {
                $this->logMessage("ERROR: PDF encryption failed");
                return null;
            }
            $this->logMessage("PDF encrypted and saved successfully");
        } elseif ($type === 'images') {
            $this->logMessage("Starting image steganography process...");
            
            $this->logMessage("Medical message for steganography: " . $medicalMessage);
            
            if (!$this->applySteganographyToImage($file['tmp_name'], $targetPath, $medicalMessage)) {
                $this->logMessage("ERROR: Image steganography failed");
                // Fallback: move original file without steganography
                if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
                    $this->logMessage("ERROR: Fallback move_uploaded_file also failed");
                    return null;
                }
                $this->logMessage("Fallback: Original image moved without steganography");
            } else {
                $this->logMessage("Image steganography applied successfully");
            }
        } else {
            // For other file types, just move normally
            if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
                $this->logMessage("ERROR: move_uploaded_file failed");
                $this->logMessage("Last PHP error: " . error_get_last()['message'] ?? 'Unknown');
                return null;
            }
            $this->logMessage("File moved successfully");
        }

        // Verify file was actually saved
        if (file_exists($targetPath)) {
            $fileSize = filesize($targetPath);
            $this->logMessage("File verified - Size: " . $fileSize . " bytes");
            return $fileName;
        } else {
            $this->logMessage("ERROR: File not found at target after processing");
            return null;
        }
    }

    /**
     * Apply AES + LSB Steganography to Image
     */
    private function applySteganographyToImage($sourcePath, $targetPath, $message)
    {
        try {
            $this->logMessage("=== START IMAGE STEGANOGRAPHY ===");
            
            if (empty($message)) {
                $this->logMessage("No message provided for steganography, copying original image");
                return copy($sourcePath, $targetPath);
            }

            $this->logMessage("Original message: " . $message);
            
            // Step 1: Encrypt message with AES
            $encryptedMessage = $this->aesEncryptForSteganography($message);
            $this->logMessage("Message encrypted with AES");
            
            // Step 2: Get image dimensions and type
            $imageInfo = getimagesize($sourcePath);
            if ($imageInfo === false) {
                throw new Exception("Cannot get image information");
            }

            $width = $imageInfo[0];
            $height = $imageInfo[1];
            $imageType = $imageInfo[2];
            
            $this->logMessage("Image dimensions: {$width}x{$height}, Type: {$imageType}");

            // Step 3: Load image based on type
            switch ($imageType) {
                case IMAGETYPE_JPEG:
                    $image = imagecreatefromjpeg($sourcePath);
                    break;
                case IMAGETYPE_PNG:
                    $image = imagecreatefrompng($sourcePath);
                    break;
                case IMAGETYPE_GIF:
                    $image = imagecreatefromgif($sourcePath);
                    break;
                default:
                    throw new Exception("Unsupported image type");
            }

            if (!$image) {
                throw new Exception("Cannot create image from source");
            }

            // Step 4: Calculate maximum message capacity
            $maxCapacity = ($width * $height * 3) / 8; // 3 bits per pixel (RGB)
            $messageLength = strlen($encryptedMessage);
            
            $this->logMessage("Max capacity: " . $maxCapacity . " bytes");
            $this->logMessage("Encrypted message length: " . $messageLength . " bytes");

            if ($messageLength > $maxCapacity - 10) { // Reserve 10 bytes for header
                throw new Exception("Message too large for image. Max: " . ($maxCapacity - 10) . " bytes, Current: " . $messageLength . " bytes");
            }

            // Step 5: Add header to message (message length + encrypted message)
            $header = pack('N', $messageLength); // 4 bytes for length
            $dataToHide = $header . $encryptedMessage;
            $dataToHideLength = strlen($dataToHide);

            $this->logMessage("Total data to hide: " . $dataToHideLength . " bytes");

            // Step 6: Convert data to binary string
            $binaryData = '';
            for ($i = 0; $i < $dataToHideLength; $i++) {
                $byte = ord($dataToHide[$i]);
                $binaryData .= str_pad(decbin($byte), 8, '0', STR_PAD_LEFT);
            }

            $binaryDataLength = strlen($binaryData);
            $this->logMessage("Binary data length: " . $binaryDataLength . " bits");

            // Step 7: Embed data using LSB
            $bitPosition = 0;
            $dataEmbedded = false;

            for ($y = 0; $y < $height; $y++) {
                for ($x = 0; $x < $width; $x++) {
                    if ($bitPosition >= $binaryDataLength) {
                        $dataEmbedded = true;
                        break 2;
                    }

                    $rgb = imagecolorat($image, $x, $y);
                    $r = ($rgb >> 16) & 0xFF;
                    $g = ($rgb >> 8) & 0xFF;
                    $b = $rgb & 0xFF;

                    // Embed in Red channel
                    if ($bitPosition < $binaryDataLength) {
                        $r = ($r & 0xFE) | intval($binaryData[$bitPosition]);
                        $bitPosition++;
                    }

                    // Embed in Green channel  
                    if ($bitPosition < $binaryDataLength) {
                        $g = ($g & 0xFE) | intval($binaryData[$bitPosition]);
                        $bitPosition++;
                    }

                    // Embed in Blue channel
                    if ($bitPosition < $binaryDataLength) {
                        $b = ($b & 0xFE) | intval($binaryData[$bitPosition]);
                        $bitPosition++;
                    }

                    $newColor = imagecolorallocate($image, $r, $g, $b);
                    imagesetpixel($image, $x, $y, $newColor);
                }
            }

            if (!$dataEmbedded && $bitPosition < $binaryDataLength) {
                throw new Exception("Could not embed all data into image");
            }

            $this->logMessage("Data embedded successfully. Bits used: " . $bitPosition);

            // Step 8: Save the steganographed image
            $saveResult = false;
            switch ($imageType) {
                case IMAGETYPE_JPEG:
                    $saveResult = imagejpeg($image, $targetPath, 90); // 90% quality
                    break;
                case IMAGETYPE_PNG:
                    $saveResult = imagepng($image, $targetPath, 9); // Maximum compression
                    break;
                case IMAGETYPE_GIF:
                    $saveResult = imagegif($image, $targetPath);
                    break;
            }

            if (!$saveResult) {
                throw new Exception("Failed to save steganographed image");
            }

            // Step 9: Clean up
            imagedestroy($image);

            $this->logMessage("Steganographed image saved successfully: " . $targetPath);
            
            // Verify the saved file
            if (file_exists($targetPath)) {
                $finalSize = filesize($targetPath);
                $this->logMessage("Final file size: " . $finalSize . " bytes");
                return true;
            } else {
                throw new Exception("Steganographed file not found after save");
            }

        } catch (Exception $e) {
            $this->logMessage("ERROR in applySteganographyToImage: " . $e->getMessage());
            
            
            return false;
        }
    }

    /**
     * AES Encryption for Steganography (returns binary data)
     */
    private function aesEncryptForSteganography($data)
    {
        if (empty($data)) {
            return '';
        }

        $this->logMessage("Encrypting message for steganography: " . $data);
        
        // Use AES-256-CBC with proper padding
        $paddedData = $this->pkcs7Pad($data, 16);
        
        $encrypted = openssl_encrypt(
            $paddedData,
            'AES-256-CBC',
            AES_KEY,
            OPENSSL_RAW_DATA,
            AES_IV
        );

        if ($encrypted === false) {
            throw new Exception("AES encryption failed: " . openssl_error_string());
        }

        $this->logMessage("AES encryption successful, encrypted length: " . strlen($encrypted) . " bytes");
        
        return $encrypted;
    }

    /**
     * PKCS7 Padding for AES
     */
    private function pkcs7Pad($data, $blockSize)
    {
        $padding = $blockSize - (strlen($data) % $blockSize);
        return $data . str_repeat(chr($padding), $padding);
    }

    /**
     * PKCS7 Unpadding for AES
     */
    private function pkcs7Unpad($data)
    {
        $padding = ord($data[strlen($data) - 1]);
        return substr($data, 0, -$padding);
    }

    /**
     * Extract hidden message from steganographed image (for verification)
     */
    public function extractMessageFromImage($imagePath)
    {
        try {
            $this->logMessage("=== EXTRACTING MESSAGE FROM IMAGE ===");
            
            $imageInfo = getimagesize($imagePath);
            if ($imageInfo === false) {
                throw new Exception("Cannot get image information");
            }

            $width = $imageInfo[0];
            $height = $imageInfo[1];
            $imageType = $imageInfo[2];

            // Load image
            switch ($imageType) {
                case IMAGETYPE_JPEG:
                    $image = imagecreatefromjpeg($imagePath);
                    break;
                case IMAGETYPE_PNG:
                    $image = imagecreatefrompng($imagePath);
                    break;
                case IMAGETYPE_GIF:
                    $image = imagecreatefromgif($imagePath);
                    break;
                default:
                    throw new Exception("Unsupported image type");
            }

            if (!$image) {
                throw new Exception("Cannot create image from source");
            }

            // Extract header first (4 bytes = 32 bits)
            $headerBits = '';
            $bitsExtracted = 0;
            $headerSize = 32; // 4 bytes * 8 bits

            for ($y = 0; $y < $height; $y++) {
                for ($x = 0; $x < $width; $x++) {
                    if ($bitsExtracted >= $headerSize) break 2;
                    
                    $rgb = imagecolorat($image, $x, $y);
                    $r = ($rgb >> 16) & 0xFF;
                    $g = ($rgb >> 8) & 0xFF;
                    $b = $rgb & 0xFF;

                    // Extract from LSB
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

            // Convert header bits to message length
            $messageLength = 0;
            for ($i = 0; $i < 32; $i += 8) {
                $byte = bindec(substr($headerBits, $i, 8));
                $messageLength = ($messageLength << 8) | $byte;
            }

            $this->logMessage("Extracted message length: " . $messageLength);

            // Extract encrypted message
            $encryptedBits = '';
            $bitsNeeded = $messageLength * 8;
            $bitsExtracted = 0;

            for ($y = 0; $y < $height; $y++) {
                for ($x = 0; $x < $width; $x++) {
                    if ($bitsExtracted >= $bitsNeeded) break 2;
                    
                    $rgb = imagecolorat($image, $x, $y);
                    $r = ($rgb >> 16) & 0xFF;
                    $g = ($rgb >> 8) & 0xFF;
                    $b = $rgb & 0xFF;

                    // Skip header bits we already extracted
                    $pixelBitIndex = ($y * $width + $x) * 3;
                    if ($pixelBitIndex < 32) continue;

                    // Extract from LSB
                    if ($bitsExtracted < $bitsNeeded) {
                        $encryptedBits .= $r & 1;
                        $bitsExtracted++;
                    }
                    if ($bitsExtracted < $bitsNeeded) {
                        $encryptedBits .= $g & 1;
                        $bitsExtracted++;
                    }
                    if ($bitsExtracted < $bitsNeeded) {
                        $encryptedBits .= $b & 1;
                        $bitsExtracted++;
                    }
                }
            }

            // Convert bits to bytes
            $encryptedMessage = '';
            for ($i = 0; $i < $bitsNeeded; $i += 8) {
                $byte = bindec(substr($encryptedBits, $i, 8));
                $encryptedMessage .= chr($byte);
            }

            $this->logMessage("Encrypted message extracted, length: " . strlen($encryptedMessage));

            // Decrypt the message
            $decrypted = openssl_decrypt(
                $encryptedMessage,
                'AES-256-CBC',
                AES_KEY,
                OPENSSL_RAW_DATA,
                AES_IV
            );

            if ($decrypted === false) {
                throw new Exception("AES decryption failed: " . openssl_error_string());
            }

            $originalMessage = $this->pkcs7Unpad($decrypted);
            
            $this->logMessage("Message successfully extracted and decrypted: " . $originalMessage);
            
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
     * Encrypt PDF file with Caesar Cipher + AES
     */
    private function encryptPdfFile($sourcePath, $targetPath)
    {
        try {
            $this->logMessage("Reading PDF file from: " . $sourcePath);
            
            // Read the PDF file
            $pdfContent = file_get_contents($sourcePath);
            if ($pdfContent === false) {
                $this->logMessage("ERROR: Cannot read PDF file");
                return false;
            }

            $this->logMessage("PDF file read successfully, size: " . strlen($pdfContent) . " bytes");

            // Step 1: Apply Caesar Cipher (shift of 5)
            $this->logMessage("Applying Caesar Cipher...");
            $caesarEncrypted = $this->caesarCipherEncrypt($pdfContent, 5);
            $this->logMessage("Caesar Cipher applied successfully");

            // Step 2: Apply AES encryption
            $this->logMessage("Applying AES encryption...");
            $aesEncrypted = $this->aesEncryptBinary($caesarEncrypted);
            if ($aesEncrypted === false) {
                $this->logMessage("ERROR: AES encryption failed");
                return false;
            }
            $this->logMessage("AES encryption applied successfully");

            // Save encrypted file
            $this->logMessage("Writing encrypted PDF to: " . $targetPath);
            $result = file_put_contents($targetPath, $aesEncrypted);
            if ($result === false) {
                $this->logMessage("ERROR: Cannot write encrypted PDF file");
                return false;
            }

            $this->logMessage("Encrypted PDF saved successfully, size: " . $result . " bytes");
            return true;

        } catch (Exception $e) {
            $this->logMessage("ERROR in encryptPdfFile: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Caesar Cipher encryption for binary data
     */
    private function caesarCipherEncrypt($data, $shift)
    {
        $encrypted = '';
        $length = strlen($data);
        
        for ($i = 0; $i < $length; $i++) {
            $byte = ord($data[$i]);
            // Apply Caesar shift (mod 256 for bytes)
            $encryptedByte = ($byte + $shift) % 256;
            $encrypted .= chr($encryptedByte);
        }
        
        return $encrypted;
    }

    /**
     * AES encryption for binary data
     */
    private function aesEncryptBinary($data)
    {
        if (empty($data)) {
            return false;
        }

        $encrypted = openssl_encrypt(
            $data,
            'AES-256-CBC',
            AES_KEY,
            OPENSSL_RAW_DATA,
            AES_IV
        );

        return $encrypted;
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
?>