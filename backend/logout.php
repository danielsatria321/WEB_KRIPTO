<?php
/**
 * backend/logout.php - Handle user logout
 * Destroy session dan redirect ke login page
 */

session_start();

// Destroy all session data
session_destroy();

// Destroy session cookie
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// Redirect to login page
header('Location: ../templates/login.html');
exit;
?>
