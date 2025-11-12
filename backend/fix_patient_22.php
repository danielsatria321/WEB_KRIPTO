<?php
// Quick fix script to update patient 22 foto_pasien to original file

define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'kriptoproject');

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$newFileName = '6913af600393b_1762897760.png';
$patientId = 22;

$query = "UPDATE pasien SET foto_pasien = ? WHERE id_pasien = ?";
$stmt = $conn->prepare($query);
$stmt->bind_param("si", $newFileName, $patientId);

if ($stmt->execute()) {
    echo "✅ Database updated successfully. Patient 22 now points to original file with steganography.\n";
    echo "File: " . $newFileName . "\n";
} else {
    echo "❌ Update failed: " . $stmt->error . "\n";
}

$conn->close();
?>
