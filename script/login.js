document.addEventListener("DOMContentLoaded", function() {
    const form = document.querySelector("form");
    const msg = document.getElementById("message") || null; // optional place to show messages

    form.addEventListener("submit", async function(e) {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        // simple client-side validation
        if (!email || !password) {
            alert("Isi semua field!");
            return;
        }

        const formData = new FormData();
        formData.append("email", email);       // server expects 'email' (we treat as username)
        formData.append("password", password);

        try {
            const res = await fetch("../backend/login.php", {
                method: "POST",
                body: formData,
                cache: "no-store",
                // ensure cookies (Set-Cookie from PHP) are accepted for same-origin
                credentials: 'same-origin'
            });

            // baca response sebagai text dahulu untuk debugging bila bukan JSON
            const text = await res.text();
            let data;
            try { data = JSON.parse(text); } 
            catch (err) {
                console.error("Response bukan JSON:", text);
                alert("Terjadi kesalahan server.");
                return;
            }

            if (res.ok && data.status === "success") {
                // optional: tampilkan pesan singkat
                if (msg) msg.innerHTML = `<p style="color:green">${data.message}</p>`;

                // redirect ke halaman yang diinginkan (ubah sesuai project)
                setTimeout(() => {
                    window.location.href = "../templates/dashboard.html"; // ganti dengan path sebenarnya
                }, 800); // delay kecil supaya user lihat pesan
            } else {
                const errMsg = data.message || "Login gagal";
                if (msg) msg.innerHTML = `<p style="color:red">${errMsg}</p>`;
                else alert(errMsg);
            }
        } catch (err) {
            console.error("Fetch error:", err);
            alert("Terjadi kesalahan koneksi.");
        }
    });
});
