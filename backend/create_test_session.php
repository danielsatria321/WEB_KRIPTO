<?php
/**
 * backend/create_test_session.php
 * Temporary endpoint to create a test session for debugging only.
 * Usage (GET): /backend/create_test_session.php?username=testuser&nama=Nama+Dokter
 */

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);

session_start();

// Read from query for flexibility
$username = trim($_GET['username'] ?? 'testdoc');
$nama = trim($_GET['nama'] ?? 'Dokter Test');
$user_id = intval($_GET['user_id'] ?? 999);

$_SESSION['user_id'] = $user_id;
$_SESSION['username'] = $username;
$_SESSION['nama'] = $nama;

echo json_encode([
    'success' => true,
    'message' => 'Test session created',
    'data' => [
        'user_id' => $user_id,
        'username' => $username,
        'nama' => $nama
    ]
]);
exit;
?>