// Inisialisasi dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Update tanggal saat ini
    updateCurrentDate();
    
    // Load data dari API
    loadDashboardData();
    
    // Modal functionality
    const modal = document.getElementById('formModal');
    const openModalBtn = document.getElementById('inputPemeriksaanBtn');
    const closeModalBtn = document.getElementById('closeModal');
    const cancelFormBtn = document.getElementById('cancelForm');
    
    // Buka modal
    if (openModalBtn) {
        openModalBtn.addEventListener('click', function(e) {
            e.preventDefault();
            modal.classList.add('active');
        });
    }
    
    // Tutup modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            modal.classList.remove('active');
        });
    }
    
    if (cancelFormBtn) {
        cancelFormBtn.addEventListener('click', function() {
            modal.classList.remove('active');
        });
    }
    
    // Tutup modal saat klik di luar
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }
    
    // File upload functionality
    setupFileUpload('fotoPasien', 'fotoFileName');
    setupFileUpload('pdfDokumen', 'pdfFileName');
    
    // Form submission
    const patientForm = document.getElementById('patientForm');
    if (patientForm) {
        patientForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitPatientForm(this);
        });
    }
    
    // Search functionality
    const searchBox = document.querySelector('.search-box input');
    if (searchBox) {
        searchBox.addEventListener('input', function(e) {
            const searchTerm = e.target.value.trim();
            if (searchTerm.length > 2 || searchTerm.length === 0) {
                searchPatients(searchTerm);
            }
        });
    }
    
    // Initialize selectable cards
    initializeSelectableCards();
});

// Fungsi untuk load data dashboard
async function loadDashboardData() {
    try {
        // Load stats
        const statsResponse = await fetch('/api/patients/stats');
        const statsData = await statsResponse.json();
        
        if (statsData.success) {
            updateStats(statsData.stats);
        }
        
        // Load recent patients
        const recentResponse = await fetch('/api/recent-patients');
        const recentData = await recentResponse.json();
        
        if (recentData.success) {
            updateRecentPatients(recentData.patients);
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Fungsi untuk update statistik
function updateStats(stats) {
    const statNumbers = document.querySelectorAll('.stat-number');
    if (statNumbers.length >= 4) {
        statNumbers[0].textContent = stats.total_pasien || '0';
        statNumbers[1].textContent = stats.rawat_inap || '0';
        statNumbers[2].textContent = stats.rawat_jalan || '0';
        statNumbers[3].textContent = stats.pemeriksaan || '0';
    }
}

// Fungsi untuk update pasien terbaru
function updateRecentPatients(patients) {
    const patientsList = document.querySelector('.patients-list');
    if (!patientsList) return;
    
    if (patients.length === 0) {
        patientsList.innerHTML = '<div class="no-data">Tidak ada data pasien</div>';
        return;
    }
    
    patientsList.innerHTML = patients.map(patient => `
        <div class="patient-item">
            <div class="patient-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="patient-info">
                <h4>${patient.nama_pasien}</h4>
                <p>${formatServiceType(patient.jenis_layanan)} • ${calculateAge(patient.tanggal_lahir)} Tahun</p>
                <span class="patient-date">${formatDate(patient.tanggal_dibuat)}</span>
            </div>
            <span class="status-badge ${getStatusClass(patient.status_pasien)}">${formatStatus(patient.status_pasien)}</span>
        </div>
    `).join('');
}

// Fungsi untuk submit form
async function submitPatientForm(form) {
    // Validasi form
    if (!validateForm()) {
        return;
    }
    
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    try {
        // Show loading state
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
        submitBtn.disabled = true;
        
        const response = await fetch('/api/patients', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Data pemeriksaan berhasil disimpan!', 'success');
            
            // Reset form
            form.reset();
            resetFileNames();
            resetSelectableCards();
            
            // Close modal
            const modal = document.getElementById('formModal');
            modal.classList.remove('active');
            
            // Reload dashboard data
            loadDashboardData();
        } else {
            showNotification(result.message || 'Gagal menyimpan data', 'error');
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        showNotification('Terjadi kesalahan saat menyimpan data', 'error');
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Fungsi untuk search patients
async function searchPatients(searchTerm) {
    try {
        const response = await fetch(`/api/patients?search=${encodeURIComponent(searchTerm)}`);
        const data = await response.json();
        
        if (data.success) {
            // Update UI dengan hasil pencarian
            if (searchTerm) {
                // Tampilkan hasil pencarian di section recent patients
                updateRecentPatients(data.patients);
            } else {
                // Tampilkan data terbaru jika search kosong
                loadDashboardData();
            }
        }
    } catch (error) {
        console.error('Error searching patients:', error);
    }
}

// Helper functions
function formatServiceType(type) {
    const types = {
        'rawat-inap': 'Rawat Inap',
        'rawat-jalan': 'Rawat Jalan',
        'pemeriksaan': 'Pemeriksaan'
    };
    return types[type] || type;
}

function formatStatus(status) {
    const statuses = {
        'menunggu': 'Menunggu',
        'perawatan': 'Perawatan',
        'selesai': 'Selesai'
    };
    return statuses[status] || status;
}

function getStatusClass(status) {
    const classes = {
        'menunggu': 'pending',
        'perawatan': 'in-progress',
        'selesai': 'completed'
    };
    return classes[status] || 'pending';
}

function calculateAge(birthDate) {
    if (!birthDate) return '?';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

// ... (fungsi-fungsi lainnya tetap sama seperti sebelumnya)
// [Masukkan semua fungsi JavaScript dari kode sebelumnya di sini]