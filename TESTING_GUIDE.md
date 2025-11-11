# 🔍 Debug Patient Detail Loading - Complete Testing Guide

## ✅ Backend Status

- **API bekerja**: ✓ Tested dengan curl - returns patient data correctly
- **Session handling**: ✓ Added to all methods
- **CORS headers**: ✓ Fixed with credentials support
- **All fetches**: ✓ Have `credentials: 'same-origin'`

## 🧪 Testing Steps

### Step 1: Simple Test (Easiest)

**URL**: `http://localhost/web_kriptografi/simple-test.html`

1. Buka di browser
2. Klik tombol "Test Login → Check Session → Get Patient"
3. Lihat output di halaman (harus muncul nama pasien "Cristiano Ronaldo")
4. Jika ada error, copy-paste error message

### Step 2: Debug with Console

**URL**: `http://localhost/web_kriptografi/debug-patient.html`

1. Buka di browser
2. Buka Developer Console (F12 → Console tab)
3. Klik "1. Login (321/321)" → lihat output
4. Klik "2. Check Session After Login" → lihat output
5. Klik "3. Get Patient Detail" → lihat output
6. Jika error, lihat di console tab

### Step 3: Real Dashboard Test

**URL**: `http://localhost/web_kriptografi/templates/dashboard.html`

1. Fresh reload halaman (Ctrl+Shift+R untuk clear cache)
2. Tunggu sampai dashboard fully loaded
3. Seharusnya sidebar menampilkan "Dr. 321"
4. Klik tombol "Lihat" (👁️) di salah satu pasien
5. Modal detail pasien seharusnya terbuka
6. Jika error: Buka F12 → Console → copy-paste error message

---

## 🐛 Common Issues & Solutions

| Gejala                       | Kemungkinan Penyebab               | Solusi                    |
| ---------------------------- | ---------------------------------- | ------------------------- |
| "gagal memuat detail pasien" | Browser tidak kirim session cookie | Clear cookies, re-login   |
| Modal tidak terbuka          | CSS issue atau element tidak ada   | Buka F12, cek Console tab |
| "Session tidak valid"        | Session expired                    | Logout + Login lagi       |
| Data kosong di modal         | Response tidak di-parse            | Check F12 → Network tab   |

---

## 📊 Expected Outputs

### simple-test.html Output Should Look Like:

```
=== START TEST ===

[1] LOGIN
Status: 200
Response: {"status":"success","message":"Login berhasil","data":{"id":9,"username":"321","nama":"321"}}
✓ Login successful

[2] CHECK SESSION
Status: 200
Response: {"success":true,"data":{"user_id":9,"username":"321","nama":"321"}}
✓ Session valid

[3] GET PATIENT DETAIL
Status: 200
✓ Patient loaded: Cristiano Ronaldo
Alamat: Portugal

=== END TEST ===
```

---

## 🔧 If Still Error - Debug Steps:

### Check 1: Clear Browser Cookies

- Open DevTools (F12)
- Go to Application → Cookies → localhost
- Delete all cookies
- Refresh page
- Try login again

### Check 2: Check Network Requests

- Open DevTools (F12)
- Go to Network tab
- Try login again
- Find the `login.php` request
- Check if it has `Set-Cookie` header in Response

### Check 3: Check Console Errors

- Open DevTools (F12)
- Go to Console tab
- Reload page
- Take screenshot of any red errors

---

## 📝 Commands to Run in Terminal

```bash
# Check if PHP sessions working
/Applications/XAMPP/bin/php -l /Applications/XAMPP/xamppfiles/htdocs/web_kriptografi/backend/dashboardview.php

# Test login with curl
curl -c /tmp/cookies.txt -X POST http://localhost/web_kriptografi/backend/login.php -d "email=321&password=321"

# Test patient detail with session cookie
curl -b /tmp/cookies.txt "http://localhost/web_kriptografi/backend/dashboardview.php?action=get_patient_detail&patient_id=1" | python3 -m json.tool
```

---

## ✅ Status Checklist

- [x] Backend API returns data correctly
- [x] Session cookies are being set
- [x] All fetch calls include credentials
- [x] CORS headers are correct
- [x] Test pages created for debugging
- [ ] simple-test.html shows success
- [ ] Dashboard modal opens and shows data

---

**Next Action**:

1. Open `simple-test.html` in browser
2. Click the test button
3. If error, share the output/error message
4. If success, try opening dashboard.html and click "Lihat" button on any patient
