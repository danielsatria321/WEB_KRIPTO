<?php
/**
 * backend/check_session.php - Check if user is logged in and return session data
 */

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);

session_start();

// Check if user is logged in
if (!isset($_SESSION['username'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'User not logged in'
    ]);
    exit;
}

// Return session data
echo json_encode([
    'success' => true,
    'data' => [
        'user_id' => $_SESSION['user_id'] ?? null,
        'username' => $_SESSION['username'] ?? '',
        'nama' => $_SESSION['nama'] ?? ''
    ]
]);
exit;
?>
