document.getElementById("registerForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const submitBtn = document.getElementById("submitBtn");
    const btnText = submitBtn.querySelector(".button-text");
    const loading = submitBtn.querySelector(".button-loading");
    const msg = document.getElementById("message");

    // tampilkan loading kecil
    btnText.style.display = "none";
    loading.style.display = "inline";

    const formData = new FormData();
    formData.append("nama", document.getElementById("nama").value);
    formData.append("username", document.getElementById("username").value);
    formData.append("password", document.getElementById("password").value);

    try {
        const res = await fetch("../backend/registrasi.php", {
            method: "POST",
            body: formData
        });

        // coba parse JSON (jika response bukan JSON, akan masuk catch)
        const data = await res.json();

        if (res.ok && data.status === "success") {
            msg.innerHTML = "<p style='color: green;'>" + data.message + "</p>";

            // disable form supaya user gak spam tombol
            submitBtn.disabled = true;

            // redirect setelah 2 detik (2000 ms) ke halaman login
            // ubah path berikut sesuai lokasi halaman login kamu jika perlu
            setTimeout(() => {
                window.location.href = "../templates/login.html"; // atau "/login.php" atau "../login.php"
            }, 2000);
        } else {
            // tampilkan pesan error dari server
            const errorMessage = data.message || "Terjadi kesalahan saat mendaftar.";
            msg.innerHTML = "<p style='color: red;'>" + errorMessage + "</p>";
        }
    } catch (err) {
        console.error(err);
        msg.innerHTML = "<p style='color: red;'>Terjadi kesalahan.</p>";
    } finally {
        // sembunyikan loading kembali (jika tidak redirect)
        btnText.style.display = "inline";
        loading.style.display = "none";
    }
});