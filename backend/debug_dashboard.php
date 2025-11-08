<?php
header('Content-Type: text/plain; charset=utf-8');

define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'kriptoproject');

echo "=== DASHBOARDVIEW DEBUG ===\n\n";

try {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    if ($conn->connect_error) {
        die("❌ DATABASE CONNECTION FAILED: " . $conn->connect_error);
    }
    echo "✅ DATABASE CONNECTED\n\n";

    // Test 1: Check if table exists and has data
    echo "1. CHECKING TABLE & DATA:\n";
    $result = $conn->query("SELECT COUNT(*) as total FROM pasien");
    $total = $result->fetch_assoc()['total'];
    echo "   Total records in 'pasien' table: " . $total . "\n\n";

    if ($total == 0) {
        echo "❌ PROBLEM: Table 'pasien' exists but has NO DATA\n";
        echo "   Solution: Add some patient data first via your form\n";
        exit;
    }

    // Test 2: Show actual data (raw encrypted)
    echo "2. RAW DATA FROM DATABASE (ENCRYPTED):\n";
    $data = $conn->query("SELECT id, nama_lengkap, informasi_medis, status_pasien, created_at FROM pasien LIMIT 3");
    
    $i = 1;
    while ($row = $data->fetch_assoc()) {
        echo "   Record " . $i . ":\n";
        echo "     ID: " . $row['id'] . "\n";
        echo "     Nama (encrypted): " . substr($row['nama_lengkap'], 0, 50) . "\n";
        echo "     Layanan: " . $row['informasi_medis'] . "\n";
        echo "     Status: " . $row['status_pasien'] . "\n";
        echo "     Created: " . $row['created_at'] . "\n";
        echo "     Nama length: " . strlen($row['nama_lengkap']) . " chars\n";
        echo "\n";
        $i++;
    }

    // Test 3: Test decryption
    echo "3. TESTING DECRYPTION:\n";
    define('XOR_KEY', 'medicare_secret_key_2024');
    define('AES_KEY', 'medicare_aes_key_2024_32bytes_long!');
    define('AES_IV', '1234567890123456');

    // Test XOR Decryption
    function xorDecrypt($encryptedData, $key) {
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

    $testData = $conn->query("SELECT nama_lengkap FROM pasien LIMIT 1");
    if ($testRow = $testData->fetch_assoc()) {
        $encryptedName = $testRow['nama_lengkap'];
        echo "   Encrypted name: " . substr($encryptedName, 0, 30) . "...\n";
        
        // Check if it's base64
        if (base64_decode($encryptedName, true) === false) {
            echo "   ❌ NOT BASE64: Data might not be encrypted properly\n";
        } else {
            $decryptedName = xorDecrypt($encryptedName, XOR_KEY);
            echo "   Decrypted name: " . $decryptedName . "\n";
            
            if (empty($decryptedName)) {
                echo "   ❌ DECRYPTION FAILED: Wrong key or encryption method\n";
            } else {
                echo "   ✅ DECRYPTION SUCCESSFUL\n";
            }
        }
    }

    $conn->close();

} catch (Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
}

echo "\n=== DEBUG COMPLETE ===\n";
?>