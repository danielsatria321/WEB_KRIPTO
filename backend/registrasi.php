<?php

$servername = "localhost";
$username_db = "root";   // ganti kalau perlu
$password_db = "";       // ganti kalau ada password
$database = "kriptoproject"; // ganti dengan nama database kamu

$conn = new mysqli($servername, $username_db, $password_db, $database);

if ($conn->connect_error) {
    die(json_encode(["status" => "error", "message" => "Koneksi gagal"]));
}

// Ambil request POST
$nama = $_POST['nama'] ?? '';
$username = $_POST['username'] ?? '';
$password = $_POST['password'] ?? '';

// Validasi sederhana
if (empty($nama) || empty($username) || empty($password)) {
    echo json_encode(["status" => "error", "message" => "Semua field wajib diisi"]);
    exit;
}

// Enkripsi password (bcrypt)
$hashedPassword = password_hash($password, PASSWORD_BCRYPT);

// Query insert
$stmt = $conn->prepare("INSERT INTO users (nama, username, password) VALUES (?, ?, ?)");
$stmt->bind_param("sss", $nama, $username, $hashedPassword);

if ($stmt->execute()) {
    echo json_encode(["status" => "success", "message" => "Registrasi berhasil"]);
} else {
    echo json_encode(["status" => "error", "message" => "Username sudah dipakai atau error lain"]);
}

$stmt->close();
$conn->close();
