<?php
header('Content-Type: text/plain; charset=utf-8');

define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'kriptoproject');

echo "=== CHECK TABLE STRUCTURE ===\n\n";

try {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    if ($conn->connect_error) {
        die("❌ DATABASE CONNECTION FAILED: " . $conn->connect_error);
    }
    echo "✅ DATABASE CONNECTED\n\n";

    // Check actual table structure
    echo "ACTUAL TABLE STRUCTURE:\n";
    $structure = $conn->query("DESCRIBE pasien");
    
    $columns = [];
    while ($row = $structure->fetch_assoc()) {
        echo "   - " . $row['Field'] . " | " . $row['Type'] . " | " . $row['Null'] . "\n";
        $columns[] = $row['Field'];
    }
    
    echo "\nAVAILABLE COLUMNS: " . implode(", ", $columns) . "\n\n";

    // Check primary key
    $primary = $conn->query("SHOW KEYS FROM pasien WHERE Key_name = 'PRIMARY'");
    if ($primary->num_rows > 0) {
        $pk = $primary->fetch_assoc();
        echo "PRIMARY KEY: " . $pk['Column_name'] . "\n\n";
    } else {
        echo "❌ NO PRIMARY KEY FOUND\n\n";
    }

    // Show sample data with actual columns
    echo "SAMPLE DATA (using actual columns):\n";
    $data = $conn->query("SELECT * FROM pasien LIMIT 3");
    
    $i = 1;
    while ($row = $data->fetch_assoc()) {
        echo "   Record " . $i . ":\n";
        foreach ($row as $key => $value) {
            echo "     " . $key . ": " . substr($value, 0, 30) . "\n";
        }
        echo "\n";
        $i++;
    }

    $conn->close();

} catch (Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
}
?>