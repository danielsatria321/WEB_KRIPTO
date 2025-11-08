<?php
header('Content-Type: text/html; charset=utf-8');
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Encryption keys (SAMA PERSIS dengan upload)
define('AES_KEY', 'medicare_aes_key_2024_32bytes_long!');
define('AES_IV', '1234567890123456');

class SteganographyTesterFixed
{
    public $logFile;
    
    public function __construct()
    {
        $this->logFile = __DIR__ . '/steganography_test_fixed.log';
        file_put_contents($this->logFile, "=== STEGANOGRAPHY TEST FIXED STARTED ===\n" . date('Y-m-d H:i:s') . "\n\n");
    }
    
    private function log($message)
    {
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[$timestamp] $message\n";
        file_put_contents($this->logFile, $logMessage, FILE_APPEND);
        echo "<pre style='margin:0; padding:5px; border-bottom:1px solid #eee;'>$logMessage</pre>";
    }
    
    public function testAllImages()
    {
        $this->log("Testing steganography on all patient images with FIXED algorithm...");
        
        $conn = $this->connectDB();
        if (!$conn) {
            $this->log("ERROR: Database connection failed");
            return;
        }
        
        $query = "SELECT id_pasien, nama_lengkap, foto_pasien FROM pasien WHERE foto_pasien IS NOT NULL AND foto_pasien != ''";
        $result = $conn->query($query);
        
        if ($result->num_rows === 0) {
            $this->log("No patients with images found");
            return;
        }
        
        $this->log("Found " . $result->num_rows . " patients with images");
        $results = [];
        
        while ($row = $result->fetch_assoc()) {
            $this->log("\n--- Testing Patient: " . $row['nama_lengkap'] . " (ID: " . $row['id_pasien'] . ") ---");
            $message = $this->testSingleImage($row['foto_pasien'], $row['id_pasien']);
            $results[] = [
                'patient_id' => $row['id_pasien'],
                'patient_name' => $row['nama_lengkap'],
                'image_file' => $row['foto_pasien'],
                'message' => $message,
                'success' => $message !== false
            ];
        }
        
        $conn->close();
        return $results;
    }
    
    public function testSingleImage($filename, $patientId = null)
    {
        $this->log("Testing image: $filename");
        
        $possiblePaths = [
            __DIR__ . '/../../uploads/images/' . $filename,
            __DIR__ . '/../uploads/images/' . $filename,
            $_SERVER['DOCUMENT_ROOT'] . '/uploads/images/' . $filename,
            '/Applications/XAMPP/xamppfiles/htdocs/web_kriptografi/uploads/images/' . $filename
        ];
        
        $imagePath = null;
        foreach ($possiblePaths as $path) {
            $this->log("Checking path: " . $path);
            if (file_exists($path)) {
                $imagePath = $path;
                $this->log("✓ Image found at: " . $path);
                $this->log("✓ File size: " . filesize($path) . " bytes");
                break;
            }
        }
        
        if ($imagePath === null) {
            $this->log("✗ ERROR: Image not found in any path");
            return false;
        }
        
        // Test extraction dengan algoritma yang DIPERBAIKI
        $message = $this->extractMessageFromImageFixed($imagePath);
        
        if ($message !== false && !empty($message)) {
            $this->log("✓ SUCCESS: Message extracted: \"" . htmlspecialchars($message) . "\"");
            return $message;
        } else {
            $this->log("✗ No message found or extraction failed");
            return false;
        }
    }
    
    /**
     * EKSTRAKSI YANG DIPERBAIKI - Sinkron dengan algoritma enkripsi
     */
    private function extractMessageFromImageFixed($imagePath)
    {
        try {
            $this->log("Starting FIXED steganography extraction...");
            
            $imageInfo = getimagesize($imagePath);
            if ($imageInfo === false) {
                $this->log("ERROR: Cannot get image information");
                return false;
            }

            $width = $imageInfo[0];
            $height = $imageInfo[1];
            $imageType = $imageInfo[2];
            
            $this->log("Image dimensions: {$width}x{$height}, Type: {$imageType}");

            // Load image - SUPPORT WebP
            $image = null;
            switch ($imageType) {
                case IMAGETYPE_JPEG:
                    $image = imagecreatefromjpeg($imagePath);
                    $this->log("Loaded as JPEG");
                    break;
                case IMAGETYPE_PNG:
                    $image = imagecreatefrompng($imagePath);
                    $this->log("Loaded as PNG");
                    break;
                case IMAGETYPE_GIF:
                    $image = imagecreatefromgif($imagePath);
                    $this->log("Loaded as GIF");
                    break;
                case 18: // IMAGETYPE_WEBP
                    if (function_exists('imagecreatefromwebp')) {
                        $image = imagecreatefromwebp($imagePath);
                        $this->log("Loaded as WEBP");
                    } else {
                        $this->log("ERROR: WebP not supported on this server");
                        return false;
                    }
                    break;
                default:
                    $this->log("ERROR: Unsupported image type: " . $imageType);
                    return false;
            }

            if (!$image) {
                $this->log("ERROR: Cannot create image from source");
                return false;
            }

            // ✅ EKSTRAKSI HEADER - SAMA dengan enkripsi
            $headerBits = '';
            $bitsExtracted = 0;
            $headerSize = 32;

            $this->log("Extracting header...");
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

            $this->log("Header bits extracted: " . $bitsExtracted);

            // Convert header bits to message length
            $messageLength = 0;
            for ($i = 0; $i < 32; $i += 8) {
                $byte = bindec(substr($headerBits, $i, 8));
                $messageLength = ($messageLength << 8) | $byte;
            }

            $this->log("Message length from header: " . $messageLength);

            if ($messageLength <= 0 || $messageLength > 100000) {
                $this->log("No valid message found (invalid length: $messageLength)");
                imagedestroy($image);
                return false;
            }

            // ✅ EKSTRAKSI PESAN - ALGORITMA YANG DIPERBAIKI
            $encryptedBits = '';
            $bitsNeeded = $messageLength * 8;
            $bitsExtracted = 0;

            $this->log("Extracting message data ($bitsNeeded bits needed)...");
            
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

            $this->log("Message bits extracted: " . $bitsExtracted);
            $this->log("Total bits processed: " . $globalBitCounter);

            if ($bitsExtracted < $bitsNeeded) {
                $this->log("ERROR: Not enough bits extracted. Needed: $bitsNeeded, Got: $bitsExtracted");
                imagedestroy($image);
                return false;
            }

            // Convert bits to bytes
            $encryptedMessage = '';
            for ($i = 0; $i < $bitsNeeded; $i += 8) {
                $byteBits = substr($encryptedBits, $i, 8);
                if (strlen($byteBits) < 8) {
                    $this->log("ERROR: Incomplete byte at position $i");
                    break;
                }
                $byte = bindec($byteBits);
                $encryptedMessage .= chr($byte);
            }

            $this->log("Encrypted message length: " . strlen($encryptedMessage) . " bytes");

            // ✅ DECRYPTION dengan error handling yang lebih baik
            $this->log("Attempting AES decryption...");
            
            $decrypted = openssl_decrypt(
                $encryptedMessage,
                'AES-256-CBC',
                AES_KEY,
                OPENSSL_RAW_DATA,
                AES_IV
            );

            if ($decrypted === false) {
                $error = openssl_error_string();
                $this->log("AES decryption failed: " . $error);
                
                // Coba alternatif: handle padding manual
                $decrypted = $this->decryptWithPaddingHandling($encryptedMessage);
                if ($decrypted === false) {
                    $this->log("Alternative decryption also failed");
                    imagedestroy($image);
                    return false;
                }
            }

            // Remove PKCS7 padding
            $originalMessage = $this->pkcs7Unpad($decrypted);
            
            if ($originalMessage === false) {
                $this->log("Padding removal failed, using raw decrypted data");
                $originalMessage = $decrypted;
            }
            
            $this->log("✓ Decryption successful");
            
            imagedestroy($image);
            
            return $originalMessage;

        } catch (Exception $e) {
            $this->log("ERROR in extractMessageFromImage: " . $e->getMessage());
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
        $this->log("Trying alternative decryption with padding handling...");
        
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

    private function connectDB()
    {
        $host = 'localhost';
        $user = 'root';
        $pass = '';
        $dbname = 'kriptoproject';
        
        $conn = new mysqli($host, $user, $pass, $dbname);
        
        if ($conn->connect_error) {
            $this->log("Database connection failed: " . $conn->connect_error);
            return false;
        }
        
        $conn->set_charset("utf8mb4");
        return $conn;
    }
    
    public function showLog()
    {
        if (file_exists($this->logFile)) {
            $logContent = file_get_contents($this->logFile);
            echo "<h3>Steganography Test Log (Fixed Algorithm)</h3>";
            echo "<div style='background: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace; white-space: pre-wrap; max-height: 500px; overflow-y: auto;'>";
            echo htmlspecialchars($logContent);
            echo "</div>";
        }
    }
}

// Handle the request
$tester = new SteganographyTesterFixed();

echo "<!DOCTYPE html>
<html>
<head>
    <title>Steganography Test - FIXED</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f9f9f9; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .button { 
            background: #28a745; 
            color: white; 
            padding: 12px 24px; 
            border: none; 
            border-radius: 5px; 
            cursor: pointer; 
            margin: 5px; 
            text-decoration: none;
            display: inline-block;
            font-size: 14px;
        }
        .button:hover { background: #218838; }
        .button-test { background: #007cba; }
        .button-test:hover { background: #005a87; }
        .log { 
            background: #1e1e1e; 
            color: #00ff00; 
            padding: 15px; 
            border-radius: 5px; 
            margin-top: 20px;
            font-family: 'Courier New', monospace;
            white-space: pre-wrap;
            max-height: 500px;
            overflow-y: auto;
            font-size: 12px;
        }
        .success { color: #28a745; font-weight: bold; }
        .error { color: #dc3545; font-weight: bold; }
        .section { margin: 25px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #f8f9fa; }
        h1 { color: #333; border-bottom: 2px solid #007cba; padding-bottom: 10px; }
        .debug-info { background: #e9ecef; padding: 10px; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class='container'>
        <h1>🔧 Steganography Testing Tool - FIXED VERSION</h1>
        <div class='debug-info'>
            <strong>Perbaikan yang diterapkan:</strong>
            <ul>
                <li>✅ Algoritma ekstraksi bit yang sinkron dengan enkripsi</li>
                <li>✅ Support untuk format WebP</li>
                <li>✅ Perbaikan handling AES padding</li>
                <li>✅ Error handling yang lebih robust</li>
            </ul>
        </div>
        
        <div class='section'>
            <h3>Quick Actions</h3>
            <a href='?action=test_all' class='button button-test'>Test All Images (Fixed Algorithm)</a>
            <a href='?action=show_log' class='button'>Show Log</a>
            <a href='?action=clear_log' class='button'>Clear Log</a>
        </div>
        
        <div class='section'>
            <h3>Test Specific Patient</h3>
            <form method='POST'>
                <input type='number' name='patient_id' placeholder='Patient ID' required style='padding: 8px; margin-right: 10px; border: 1px solid #ddd; border-radius: 4px;'>
                <button type='submit' name='test_patient' class='button button-test'>Test Patient</button>
            </form>
        </div>
        
        <div class='section'>
            <h3>Test Specific Image File</h3>
            <form method='POST'>
                <input type='text' name='filename' placeholder='Image filename' style='width: 300px; padding: 8px; margin-right: 10px; border: 1px solid #ddd; border-radius: 4px;' required>
                <button type='submit' name='test_file' class='button button-test'>Test Image File</button>
            </form>
        </div>
        
        <hr>";

// Handle actions
$action = $_GET['action'] ?? '';
$patientId = $_POST['patient_id'] ?? '';
$filename = $_POST['filename'] ?? '';

if ($action === 'test_all') {
    echo "<h2>Testing All Images with Fixed Algorithm</h2>";
    $results = $tester->testAllImages();
    
    // Show summary
    if ($results) {
        $successCount = count(array_filter($results, function($r) { return $r['success']; }));
        echo "<div class='section'>";
        echo "<h3>Results Summary: $successCount/" . count($results) . " successful</h3>";
        foreach ($results as $result) {
            $status = $result['success'] ? "<span class='success'>✓ SUCCESS</span>" : "<span class='error'>✗ FAILED</span>";
            echo "<div>Patient {$result['patient_id']} ({$result['patient_name']}): $status</div>";
            if ($result['message']) {
                echo "<div style='margin-left: 20px; color: #666;'>Message: \"" . htmlspecialchars($result['message']) . "\"</div>";
            }
        }
        echo "</div>";
    }
} elseif ($action === 'show_log') {
    $tester->showLog();
} elseif ($action === 'clear_log') {
    file_put_contents($tester->logFile, "=== LOG CLEARED ===\n" . date('Y-m-d H:i:s') . "\n\n");
    echo "<div class='success'>Log cleared successfully</div>";
} elseif (isset($_POST['test_patient']) && $patientId) {
    echo "<h2>Testing Patient ID: $patientId</h2>";
    $result = $tester->testSingleImage($patientId);
    if ($result) {
        echo "<div class='success'>✓ Message found: \"" . htmlspecialchars($result) . "\"</div>";
    } else {
        echo "<div class='error'>✗ No message found or extraction failed</div>";
    }
} elseif (isset($_POST['test_file']) && $filename) {
    echo "<h2>Testing File: $filename</h2>";
    $result = $tester->testSingleImage($filename);
    if ($result) {
        echo "<div class='success'>✓ Message found: \"" . htmlspecialchars($result) . "\"</div>";
    } else {
        echo "<div class='error'>✗ No message found or extraction failed</div>";
    }
}

// Always show current log at bottom
echo "<h3>Current Log</h3>";
$tester->showLog();

echo "</div></body></html>";
?>