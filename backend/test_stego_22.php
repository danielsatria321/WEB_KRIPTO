<?php
// Test ekstraksi steganografi langsung

session_start();
$_SESSION['username'] = 'test_dokter';  // Set session untuk test

// Include dashboard view
require_once 'dashboardview.php';

// Test dengan patient 22
echo "Testing steganography extraction for patient 22...\n";
echo "=================================================\n\n";

// Simulate GET request
$_GET['patient_id'] = 22;

// Create instance and call directly
$handler = new DashboardView();
$handler->extractSteganographyMessage();
?>
