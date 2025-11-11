<?php
session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$response = [
    'logged_in' => false,
    'user' => null,
    'message' => 'Not logged in'
];

// Check session berdasarkan login.php Anda
if (isset($_SESSION['user_id']) && isset($_SESSION['username'])) {
    $response['logged_in'] = true;
    $response['user'] = [
        'id' => $_SESSION['user_id'],
        'username' => $_SESSION['username'],
        'nama' => $_SESSION['nama'] ?? 'User'
    ];
    $response['message'] = 'User is logged in';
    
    // Session timeout (24 jam)
    $last_activity = $_SESSION['last_activity'] ?? time();
    if ((time() - $last_activity) > (24 * 60 * 60)) {
        session_destroy();
        $response['logged_in'] = false;
        $response['user'] = null;
        $response['message'] = 'Session expired';
    } else {
        $_SESSION['last_activity'] = time();
    }
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
?>