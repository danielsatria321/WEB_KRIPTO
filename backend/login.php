<?php
// backend/login.php
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
session_start();

// DB config — sesuaikan dengan environmentmu
$servername   = "localhost";
$username_db  = "root";
$password_db  = "";
$database     = "kriptoproject";

$conn = new mysqli($servername, $username_db, $password_db, $database);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Koneksi DB gagal"]);
    exit;
}

// Pastikan POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Metode harus POST"]);
    exit;
}

// Ambil input (form kamu punya input id="email" sehingga kita ambil 'email' sebagai username)
$inputUser = trim($_POST['email'] ?? '');
$inputPass = $_POST['password'] ?? '';

if ($inputUser === '' || $inputPass === '') {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Semua field wajib diisi"]);
    exit;
}

// Ambil user dari DB berdasarkan username (atau jika kamu pakai email, ganti query)
$stmt = $conn->prepare("SELECT id, nama, username, password FROM users WHERE username = ? LIMIT 1");
if (!$stmt) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Prepare statement gagal: " . $conn->error]);
    $conn->close();
    exit;
}
$stmt->bind_param("s", $inputUser);
$stmt->execute();
$res = $stmt->get_result();
$user = $res->fetch_assoc();

if (!$user) {
    // Jangan beri tahu apakah username atau password salah — cukup generic message
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Username atau password salah"]);
    $stmt->close();
    $conn->close();
    exit;
}

// Verifikasi password bcrypt
if (!password_verify($inputPass, $user['password'])) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Username atau password salah"]);
    $stmt->close();
    $conn->close();
    exit;
}

// Login sukses: buat session aman
session_regenerate_id(true);
$_SESSION['user_id'] = $user['id'];
$_SESSION['username'] = $user['username'];
$_SESSION['nama'] = $user['nama'];

// Optional: kirim response sukses
echo json_encode([
    "status" => "success",
    "message" => "Login berhasil",
    "data" => [
        "id" => $user['id'],
        "username" => $user['username'],
        "nama" => $user['nama']
    ]
]);

$stmt->close();
$conn->close();
exit;
