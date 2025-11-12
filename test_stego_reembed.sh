#!/bin/bash

# Test steganography preservation on edit

echo "================================"
echo "Testing Steganography Preservation"
echo "================================"
echo ""

PATIENT_ID=22
UPLOAD_DIR="/Applications/XAMPP/xamppfiles/htdocs/web_kriptografi/uploads/images"
TEST_IMG="$UPLOAD_DIR/6913af600393b_1762897760.png"
NEW_IMG="$UPLOAD_DIR/6912faf1cce86_1762851569.jpg"

echo "1. Checking original patient image..."
curl -s "http://localhost/web_kriptografi/backend/dashboardview.php?action=get_patient_detail&patient_id=$PATIENT_ID" | jq '.data | {foto_pasien, medical_message: .medical_message[0:50]}'

echo ""
echo "2. Extracting steganography from current image..."
curl -s "http://localhost/web_kriptografi/backend/dashboardview.php?action=extract_steganography&patient_id=$PATIENT_ID" 2>&1 | jq '.message[0:50]?' || echo "Need session..."

echo ""
echo "3. Done! Now test edit in browser:"
echo "   - Go to Dashboard"
echo "   - Click Edit on Patient 22"
echo "   - Upload a new photo"
echo "   - Check if steganography is still there"
