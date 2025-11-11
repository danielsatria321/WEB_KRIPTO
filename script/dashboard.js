class Dashboard {
    constructor() {
        this.currentPage = 1;
        this.currentView = 'dashboard';
        this.searchTerm = '';
        this.statusFilter = '';
        this.serviceFilter = '';
        this.isLoading = false;
        this.sessionData = null;
        this.init();
    }

    init() {
        console.log('Initializing Dashboard...');
        
        // Check session first
        this.checkSession().then(hasSession => {
            if (!hasSession) {
                // Redirect to login if no session
                window.location.href = '../templates/login.html';
                return;
            }
            
            // Session valid, initialize dashboard
            this.updateCurrentDate();
            this.initializeModal();
            this.initializeFileUploads();
            this.initializeSelectableCards();
            this.initializeFormSubmission();
            this.initializeEventListeners();
            this.addGlobalStyles();
            
            // Load initial data
            this.loadDashboardStats();
            
            // Auto-select first card
            setTimeout(() => {
                const firstCard = document.querySelector('.selectable-card');
                if (firstCard) {
                    this.selectCard(firstCard);
                }
            }, 100);
        });
    }

    // ==================== SESSION MANAGEMENT ====================

    async checkSession() {
        try {
            // include credentials so browser sends PHP session cookie (same-origin)
            const response = await fetch('../backend/check_session.php', { credentials: 'same-origin' });
            const result = await response.json();
            
            if (result.success) {
                this.sessionData = result.data;
                // Update doctor name in sidebar
                this.updateDoctorName();
                return true;
            } else {
                console.log('No active session');
                return false;
            }
        } catch (error) {
            console.error('Error checking session:', error);
            return false;
        }
    }

    updateDoctorName() {
        if (!this.sessionData || !this.sessionData.username) {
            console.warn('No session data to update doctor name');
            return;
        }
        
        const doctorNameEl = document.getElementById('doctorName');
        if (doctorNameEl) {
            // Format: Dr. (nama)
            const nama = this.sessionData.nama || this.sessionData.username;
            doctorNameEl.textContent = `Dr. ${nama}`;
            console.log('Updated doctor name to:', doctorNameEl.textContent);
        }
    }

    // ==================== VIEW MANAGEMENT ====================

    switchView(view) {
        if (this.isLoading) return;
        
        this.currentView = view;
        
        const dashboardContent = document.getElementById('dashboardContent');
        const patientsContent = document.getElementById('patientsContent');
        const pageTitle = document.getElementById('pageTitle');
        const pageSubtitle = document.getElementById('pageSubtitle');

        // Update menu active state
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });

        if (view === 'dashboard') {
            dashboardContent.classList.remove('hidden');
            patientsContent.classList.add('hidden');
            document.getElementById('dashboardMenu').parentElement.classList.add('active');
            pageTitle.textContent = 'Dashboard MediCare';
            pageSubtitle.textContent = 'Manajemen Data Pasien Terintegrasi';
            this.loadDashboardStats();
        } else if (view === 'patients') {
            dashboardContent.classList.add('hidden');
            patientsContent.classList.remove('hidden');
            document.getElementById('patientsMenu').parentElement.classList.add('active');
            pageTitle.textContent = 'Daftar Pasien';
            pageSubtitle.textContent = 'Kelola data pasien secara lengkap';
            this.loadPatientsList(1); // Selalu mulai dari page 1
        }
    }

    // ==================== DATA LOADING METHODS ====================

    async loadDashboardStats() {
        try {
            this.showLoadingState('statsGrid', 'stat-card', 'Memuat statistik...');
            
            const response = await fetch('../backend/dashboardview.php?action=get_stats');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();

            if (result.success) {
                this.displayStats(result.data);
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Error loading stats:', error);
            this.showNotification('Gagal memuat data statistik', 'error');
            this.showErrorState('statsGrid', 'Gagal memuat statistik');
        }
    }

    displayStats(stats) {
        const statsGrid = document.getElementById('statsGrid');
        
        if (!statsGrid) {
            console.error('Stats grid element not found');
            return;
        }

        const statsData = [
            {
                icon: 'fas fa-user-injured',
                title: 'Total Pasien',
                value: stats.total_pasien || 0,
                change: '+12%',
                changeType: 'positive'
            },
            {
                icon: 'fas fa-procedures',
                title: 'Rawat Inap',
                value: stats.rawat_inap || 0,
                change: '+5%',
                changeType: 'positive'
            },
            {
                icon: 'fas fa-walking',
                title: 'Rawat Jalan',
                value: stats.rawat_jalan || 0,
                change: '+8%',
                changeType: 'positive'
            },
            {
                icon: 'fas fa-stethoscope',
                title: 'Pemeriksaan',
                value: stats.pemeriksaan || 0,
                change: '-3%',
                changeType: 'negative'
            },
            {
                icon: 'fas fa-money-bill-wave',
                title: 'Total Pembayaran',
                value: `Rp ${(stats.total_pembayaran || 0).toLocaleString()}`,
                change: '+15%',
                changeType: 'positive'
            },
            {
                icon: 'fas fa-user-plus',
                title: 'Pasien Baru',
                value: stats.pasien_baru || 0,
                change: '+10%',
                changeType: 'positive'
            }
        ];

        statsGrid.innerHTML = statsData.map(stat => `
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="${stat.icon}"></i>
                </div>
                <div class="stat-info">
                    <h3>${stat.title}</h3>
                    <span class="stat-number">${stat.value}</span>
                    <span class="stat-change ${stat.changeType}">${stat.change}</span>
                </div>
            </div>
        `).join('');
    }

    async loadPatientsList(page = 1) {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            this.currentPage = page;
            
            this.showLoadingState('patientsTableBody', 'table-row', 'Memuat data pasien...');
            
            const params = new URLSearchParams({
                action: 'get_patients',
                page: page,
                limit: 10,
                search: this.searchTerm,
                status: this.statusFilter,
                service: this.serviceFilter
            });

            const response = await fetch(`../backend/dashboardview.php?${params}`, { credentials: 'same-origin' });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();

            if (result.success) {
                this.displayPatientsList(result.data);
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Error loading patients list:', error);
            this.showNotification('Gagal memuat daftar pasien', 'error');
            this.showErrorState('patientsTableBody', 'Gagal memuat data pasien');
        } finally {
            this.isLoading = false;
        }
    }

    displayPatientsList(data) {
        const tableBody = document.getElementById('patientsTableBody');
        const pagination = document.getElementById('pagination');

        if (!tableBody) {
            console.error('Table body element not found');
            return;
        }

        // Display patients table
        if (!data.patients || data.patients.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-table">
                        <i class="fas fa-search"></i>
                        <p>Tidak ada data pasien yang ditemukan</p>
                        ${this.searchTerm || this.statusFilter || this.serviceFilter ? 
                            '<button class="btn-clear-filters" onclick="window.medicareDashboard.clearFilters()">Hapus Filter</button>' : 
                            ''
                        }
                    </td>
                </tr>
            `;
        } else {
            tableBody.innerHTML = data.patients.map(patient => {
                const statusClass = this.getStatusClass(patient.status_pasien);
                const date = new Date(patient.created_at).toLocaleDateString('id-ID');
                const birthDate = new Date(patient.tanggal_lahir).toLocaleDateString('id-ID');
                
                return `
                    <tr data-patient-id="${patient.id_pasien}">
                        <td>
                            <div class="patient-name">
                                <strong>${patient.nama_lengkap || 'N/A'}</strong>
                            </div>
                        </td>
                        <td>${birthDate}</td>
                        <td>
                            <span class="service-badge ${patient.informasi_medis}">
                                <i class="${this.getServiceIcon(patient.informasi_medis)}"></i>
                                ${this.formatServiceType(patient.informasi_medis)}
                            </span>
                        </td>
                        <td>
                            <span class="status-badge ${statusClass}">${this.formatStatus(patient.status_pasien)}</span>
                        </td>
                        <td>${date}</td>
                        <td>Rp ${parseInt(patient.jumlah_pembayaran || 0).toLocaleString()}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn-icon view-btn" title="Lihat Detail" data-patient-id="${patient.id_pasien}">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn-icon edit-btn" title="Edit" data-patient-id="${patient.id_pasien}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-icon delete-btn" title="Hapus" data-patient-id="${patient.id_pasien}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            // Add event listeners to action buttons
            this.attachTableEventListeners();
        }

        // Display pagination
        if (data.total_pages > 1) {
            this.displayPagination(data.total_pages, data.current_page);
        } else {
            if (pagination) {
                pagination.innerHTML = '';
            }
        }
    }

    displayPagination(totalPages, currentPage) {
        const pagination = document.getElementById('pagination');
        
        if (!pagination) {
            console.error('Pagination element not found');
            return;
        }

        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        
        // Previous button
        if (currentPage > 1) {
            paginationHTML += `
                <button class="page-btn prev-btn" data-page="${currentPage - 1}">
                    <i class="fas fa-chevron-left"></i>
                    Sebelumnya
                </button>`;
        }

        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        // Adjust if we're at the end
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // First page and ellipsis
        if (startPage > 1) {
            paginationHTML += `<button class="page-btn" data-page="1">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="page-dots">...</span>`;
            }
        }

        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            if (i === currentPage) {
                paginationHTML += `<button class="page-btn active" data-page="${i}">${i}</button>`;
            } else {
                paginationHTML += `<button class="page-btn" data-page="${i}">${i}</button>`;
            }
        }

        // Last page and ellipsis
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="page-dots">...</span>`;
            }
            paginationHTML += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
        }

        // Next button
        if (currentPage < totalPages) {
            paginationHTML += `
                <button class="page-btn next-btn" data-page="${currentPage + 1}">
                    Selanjutnya
                    <i class="fas fa-chevron-right"></i>
                </button>`;
        }

        pagination.innerHTML = paginationHTML;

        // Add event listeners to pagination buttons
        pagination.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(btn.dataset.page);
                if (page !== this.currentPage) {
                    this.loadPatientsList(page);
                    // Scroll to top of table
                    const tableContainer = document.querySelector('.patients-table-container');
                    if (tableContainer) {
                        tableContainer.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
        });
    }

    // ==================== LOADING & ERROR STATES ====================

    showLoadingState(containerId, itemClass, message = 'Memuat...') {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (containerId === 'patientsTableBody') {
            container.innerHTML = `
                <tr>
                    <td colspan="7" class="loading-state">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>${message}</p>
                    </td>
                </tr>
            `;
        } else if (containerId === 'statsGrid') {
            container.innerHTML = `
                <div class="stat-card loading">
                    <div class="stat-icon">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${message}</h3>
                        <span class="stat-number">-</span>
                        <span class="stat-change">-</span>
                    </div>
                </div>
            `;
        }
    }

    showErrorState(containerId, message = 'Terjadi kesalahan') {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (containerId === 'patientsTableBody') {
            container.innerHTML = `
                <tr>
                    <td colspan="7" class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>${message}</p>
                        <button class="btn-retry" onclick="window.medicareDashboard.loadPatientsList(${this.currentPage})">
                            <i class="fas fa-redo"></i>
                            Coba Lagi
                        </button>
                    </td>
                </tr>
            `;
        } else if (containerId === 'statsGrid') {
            container.innerHTML = `
                <div class="stat-card error">
                    <div class="stat-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Error</h3>
                        <span class="stat-number">-</span>
                        <button class="btn-retry" onclick="window.medicareDashboard.loadDashboardStats()">
                            Coba Lagi
                        </button>
                    </div>
                </div>
            `;
        }
    }

    clearFilters() {
        this.searchTerm = '';
        this.statusFilter = '';
        this.serviceFilter = '';
        
        // Reset filter inputs
        const globalSearch = document.getElementById('globalSearch');
        const statusFilter = document.getElementById('statusFilter');
        const serviceFilter = document.getElementById('serviceFilter');
        
        if (globalSearch) globalSearch.value = '';
        if (statusFilter) statusFilter.value = '';
        if (serviceFilter) serviceFilter.value = '';
        
        // Reload data
        this.loadPatientsList(1);
    }

    // ==================== PATIENT CRUD OPERATIONS ====================

    async showPatientDetail(patientId) {
        try {
            this.showNotification('Memuat detail pasien...', 'info');
            
            const response = await fetch(`../backend/dashboardview.php?action=get_patient_detail&patient_id=${patientId}`, { credentials: 'same-origin' });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();

            if (result.success) {
                this.displayPatientDetail(result.data);
                this.showNotification('Detail pasien berhasil dimuat', 'success');
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Error loading patient detail:', error);
            this.showNotification('Gagal memuat detail pasien', 'error');
        }
    }

    // Dalam method displayPatientDetail - GANTI bagian patient-detail-header dan tambahkan section gambar
    displayPatientDetail(patient) {
        const modal = document.getElementById('detailModal');
        const content = document.getElementById('patientDetailContent');
        
        if (!modal || !content) {
            console.error('Detail modal elements not found');
            return;
        }

        const statusClass = this.getStatusClass(patient.status_pasien);
        const serviceIcon = this.getServiceIcon(patient.informasi_medis);
        const createdDate = new Date(patient.created_at).toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const birthDate = new Date(patient.tanggal_lahir).toLocaleDateString('id-ID');

        // ✅ Dapatkan path gambar untuk ditampilkan
        const imagePath = this.getImagePath(patient.foto_pasien);
        const hasImage = imagePath !== null;

        // Tombol download PDF hanya ditampilkan jika ada dokumen PDF
        const downloadPdfButton = patient.dokumen_pdf ? `
            <button class="btn-primary" id="downloadPdfBtn" data-patient-id="${patient.id_pasien}">
                <i class="fas fa-download"></i>
                Download PDF (Decrypted)
            </button>
        ` : '';

        // ✅ PERBAIKAN: Tampilkan gambar pasien jika ada
        const patientImageSection = hasImage ? `
            <div class="detail-section">
                <h4><i class="fas fa-image"></i> Foto Pasien</h4>
                <div class="patient-image-container">
                    <div class="image-wrapper">
                        <img src="${imagePath}" alt="Foto Pasien ${patient.nama_lengkap}" 
                             class="patient-image" onerror="this.style.display='none'">
                        <div class="image-overlay">
                            <button class="btn-view-image" id="viewImageBtn">
                                <i class="fas fa-expand"></i>
                                Lihat Gambar
                            </button>
                        </div>
                    </div>
                    <div class="image-info">
                        <div class="file-info">
                            <strong>File:</strong> ${patient.foto_pasien}
                        </div>
                        <div class="image-meta">
                            <span class="image-size" id="imageSizeInfo">Memuat...</span>
                        </div>
                    </div>
                </div>
            </div>
        ` : `
            <div class="detail-section">
                <h4><i class="fas fa-image"></i> Foto Pasien</h4>
                <div class="no-image-message">
                    <i class="fas fa-camera-slash"></i>
                    <p>Tidak ada foto pasien</p>
                </div>
            </div>
        `;

        // ✅ PERBAIKAN: Tampilkan medical message dengan styling yang lebih baik
        const medicalMessageSection = patient.medical_message ? `
            <div class="detail-section">
                <h4><i class="fas fa-comment-medical"></i> Pesan Medis Tersembunyi (Steganografi)</h4>
                <div class="steganography-message">
                    <div class="message-content">
                        <p><strong>Pesan yang diekstrak:</strong></p>
                        <div class="message-text">${this.escapeHtml(patient.medical_message)}</div>
                    </div>
                    <div class="message-meta">
                        <small class="message-source">
                            <i class="fas fa-shield-alt"></i>
                            Pesan ini diekstrak dari gambar menggunakan teknik steganografi LSB + AES
                        </small>
                        <button class="btn-small" id="copyMessageBtn" data-message="${this.escapeHtml(patient.medical_message)}">
                            <i class="fas fa-copy"></i>
                            Salin Pesan
                        </button>
                    </div>
                </div>
            </div>
        ` : `
            <div class="detail-section">
                <h4><i class="fas fa-comment-medical"></i> Pesan Medis Tersembunyi (Steganografi)</h4>
                <div class="no-steganography-message">
                    <i class="fas fa-search"></i>
                    <p>Tidak ada pesan tersembunyi yang ditemukan dalam gambar</p>
                    <small class="message-info">
                        Gambar mungkin tidak mengandung pesan steganografi atau proses ekstraksi gagal
                    </small>
                </div>
            </div>
        `;

        // ✅ PERBAIKAN: Informasi status steganografi
        const steganographyInfoSection = patient.foto_pasien ? `
            <div class="detail-section">
                <h4><i class="fas fa-info-circle"></i> Status Steganografi</h4>
                <div class="steganography-status-info">
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">File Gambar:</span>
                            <span class="status-value">${patient.foto_pasien}</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Status Ekstraksi:</span>
                            <span class="status-badge ${patient.medical_message ? 'success' : 'warning'}">
                                <i class="fas ${patient.medical_message ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                                ${patient.medical_message ? 'Berhasil' : 'Tidak ditemukan'}
                            </span>
                        </div>
                        ${patient.medical_message ? `
                        <div class="status-item full-width">
                            <span class="status-label">Panjang Pesan:</span>
                            <span class="status-value">${patient.medical_message.length} karakter</span>
                        </div>
                        ` : ''}
                    </div>
                    ${patient.medical_message ? `
                    <div class="extraction-actions">
                        <button class="btn-small btn-outline" id="reExtractBtn" data-patient-id="${patient.id_pasien}">
                            <i class="fas fa-redo"></i>
                            Ekstrak Ulang Pesan
                        </button>
                    </div>
                    ` : ''}
                </div>
            </div>
        ` : '';

        content.innerHTML = `
            <div class="patient-detail-header">
                <div class="patient-avatar large">
                    ${hasImage ? 
                        `<img src="${imagePath}" alt="${patient.nama_lengkap}" class="avatar-image" onerror="this.style.display='none'">` : 
                        `<i class="fas fa-user"></i>`
                    }
                </div>
                <div class="patient-basic-info">
                    <h3>${patient.nama_lengkap || 'N/A'}</h3>
                    <p>${this.calculateAge(patient.tanggal_lahir)} Tahun • ${patient.alamat_lengkap || 'Alamat tidak tersedia'}</p>
                    <div class="patient-meta">
                        <span class="status-badge ${statusClass}">${this.formatStatus(patient.status_pasien)}</span>
                        <span class="service-badge ${patient.informasi_medis}">
                            <i class="${serviceIcon}"></i>
                            ${this.formatServiceType(patient.informasi_medis)}
                        </span>
                    </div>
                </div>
            </div>

            <div class="detail-sections">
                <div class="detail-section">
                    <h4><i class="fas fa-info-circle"></i> Informasi Pribadi</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Tanggal Lahir</label>
                            <span>${birthDate}</span>
                        </div>
                        <div class="detail-item">
                            <label>Usia</label>
                            <span>${this.calculateAge(patient.tanggal_lahir)} Tahun</span>
                        </div>
                        <div class="detail-item full-width">
                            <label>Alamat</label>
                            <span>${patient.alamat_lengkap || 'Tidak tersedia'}</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4><i class="fas fa-stethoscope"></i> Informasi Medis</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Jenis Layanan</label>
                            <span>${this.formatServiceType(patient.informasi_medis)}</span>
                        </div>
                        <div class="detail-item">
                            <label>Status</label>
                            <span class="status-badge ${statusClass}">${this.formatStatus(patient.status_pasien)}</span>
                        </div>
                        <div class="detail-item full-width">
                            <label>Tanggal Pendaftaran</label>
                            <span>${createdDate}</span>
                        </div>
                    </div>
                </div>

                ${patientImageSection}

                <div class="detail-section">
                    <h4><i class="fas fa-file-medical"></i> Hasil Pemeriksaan</h4>
                    <div class="medical-notes">
                        ${patient.hasil_pemeriksaan || '<em>Tidak ada catatan pemeriksaan</em>'}
                    </div>
                </div>

                ${steganographyInfoSection}

                ${medicalMessageSection}

                <div class="detail-section">
                    <h4><i class="fas fa-money-bill-wave"></i> Informasi Pembayaran</h4>
                    <div class="payment-info">
                        <div class="payment-amount">
                            Rp ${parseInt(patient.jumlah_pembayaran || 0).toLocaleString()}
                        </div>
                    </div>
                </div>

                ${patient.dokumen_pdf ? `
                <div class="detail-section">
                    <h4><i class="fas fa-file-pdf"></i> Dokumen</h4>
                    <div class="document-actions">
                        ${downloadPdfButton}
                        <small class="document-info">
                            <i class="fas fa-shield-alt"></i>
                            PDF ini didekripsi menggunakan Caesar Cipher + AES
                        </small>
                    </div>
                </div>
                ` : ''}
            </div>

            <div class="detail-actions">
                <button class="btn-secondary" id="closeDetailModal">
                    <i class="fas fa-times"></i>
                    Tutup
                </button>
                <button class="btn-primary" id="editPatientFromDetail" data-patient-id="${patient.id_pasien}">
                    <i class="fas fa-edit"></i>
                    Edit Data
                </button>
            </div>
        `;

        // Show modal
        modal.classList.add('active');

        // Add event listeners
        this.attachDetailModalEventListeners(patient);

        // ✅ Load image size information jika ada gambar
        if (hasImage) {
            this.loadImageSizeInfo(imagePath);
        }
    }

    // ✅ NEW: Method untuk mendapatkan path gambar
    getImagePath(filename) {
        if (!filename) return null;

        const possiblePaths = [
            `../uploads/images/${filename}`,
            `../../uploads/images/${filename}`,
            `../../../uploads/images/${filename}`,
            `/uploads/images/${filename}`
        ];

        for (const path of possiblePaths) {
            // Dalam real implementation, kita bisa check jika file exists
            // Untuk sekarang kita return path relatif
            return path;
        }
        return null;
    }

    // ✅ NEW: Method untuk load info ukuran gambar
    loadImageSizeInfo(imagePath) {
        const img = new Image();
        img.onload = () => {
            const sizeInfo = document.getElementById('imageSizeInfo');
            if (sizeInfo) {
                sizeInfo.textContent = `${img.naturalWidth} × ${img.naturalHeight} pixels`;
            }
        };
        img.onerror = () => {
            const sizeInfo = document.getElementById('imageSizeInfo');
            if (sizeInfo) {
                sizeInfo.textContent = 'Gagal memuat gambar';
            }
        };
        img.src = imagePath;
    }

    attachDetailModalEventListeners(patient) {
        const closeBtn = document.getElementById('closeDetailModal');
        const editBtn = document.getElementById('editPatientFromDetail');
        const downloadPdfBtn = document.getElementById('downloadPdfBtn');
        const copyMessageBtn = document.getElementById('copyMessageBtn');
        const reExtractBtn = document.getElementById('reExtractBtn');
        const viewImageBtn = document.getElementById('viewImageBtn');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.getElementById('detailModal').classList.remove('active');
            });
        }

        if (editBtn) {
            editBtn.addEventListener('click', () => {
                document.getElementById('detailModal').classList.remove('active');
                this.editPatient(patient.id_pasien);
            });
        }

        if (downloadPdfBtn) {
            downloadPdfBtn.addEventListener('click', () => {
                this.downloadDecryptedPdf(patient.id_pasien);
            });
        }

        if (copyMessageBtn) {
            copyMessageBtn.addEventListener('click', (e) => {
                const message = e.target.dataset.message || e.target.closest('#copyMessageBtn').dataset.message;
                this.copyToClipboard(message);
            });
        }

        if (reExtractBtn) {
            reExtractBtn.addEventListener('click', async (e) => {
                const patientId = e.target.dataset.patientId || e.target.closest('#reExtractBtn').dataset.patientId;
                await this.reExtractSteganography(patientId);
            });
        }

        if (viewImageBtn) {
            viewImageBtn.addEventListener('click', () => {
                this.viewFullImage(patient.foto_pasien);
            });
        }
    }

    // ✅ NEW: Method untuk melihat gambar full size
    viewFullImage(filename) {
        const imagePath = this.getImagePath(filename);
        if (imagePath) {
            window.open(imagePath, '_blank');
        }
    }

    // ✅ NEW: Method untuk mengekstrak ulang pesan steganografi
    async reExtractSteganography(patientId) {
        try {
            this.showNotification('Mengekstrak ulang pesan dari gambar...', 'info');
            
            const response = await fetch(`../backend/dashboardview.php?action=extract_steganography&patient_id=${patientId}`, { credentials: 'same-origin' });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.showNotification('Pesan berhasil diekstrak ulang!', 'success');
                // Reload detail pasien untuk menampilkan pesan baru
                this.showPatientDetail(patientId);
            } else {
                throw new Error(result.error || 'Gagal mengekstrak pesan');
            }
        } catch (error) {
            console.error('Error re-extracting steganography:', error);
            this.showNotification('Gagal mengekstrak pesan: ' + error.message, 'error');
        }
    }

    // ✅ NEW: Method untuk copy pesan ke clipboard
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('Pesan berhasil disalin ke clipboard', 'success');
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            this.showNotification('Gagal menyalin pesan', 'error');
        });
    }

    // ✅ NEW: Method untuk escape HTML
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    async downloadDecryptedPdf(patientId) {
        try {
            // Show loading
            this.showNotification('Mempersiapkan download PDF...', 'info');
            
            const response = await fetch(`../backend/dashboardview.php?action=download_decrypted_pdf&patient_id=${patientId}`, { credentials: 'same-origin' });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Check if response is JSON (error) or PDF
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const result = await response.json();
                throw new Error(result.error || 'Unknown error');
            }

            // Create blob and download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `decrypted_patient_${patientId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            this.showNotification('PDF berhasil diunduh dan didekripsi', 'success');
            
        } catch (error) {
            console.error('Error downloading PDF:', error);
            this.showNotification('Gagal mengunduh PDF: ' + error.message, 'error');
        }
    }

    async editPatient(patientId) {
        try {
            const response = await fetch(`../backend/dashboardview.php?action=get_patient_detail&patient_id=${patientId}`, { credentials: 'same-origin' });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();

            if (result.success) {
                this.populateEditForm(result.data);
                this.openModal();
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Error loading patient for edit:', error);
            this.showNotification('Gagal memuat data pasien untuk edit', 'error');
        }
    }

    populateEditForm(patient) {
        // Set form mode to edit
        const patientIdField = document.getElementById('patientId');
        const namaPasienField = document.getElementById('namaPasien');
        const tanggalLahirField = document.getElementById('tanggalLahir');
        const alamatField = document.getElementById('alamat');
        const statusPasienField = document.getElementById('statusPasien');
        const hasilPemeriksaanField = document.getElementById('hasilPemeriksaan');
        const jumlahPembayaranField = document.getElementById('jumlahPembayaran');
        const medmsgField = document.getElementById('medmsg');

        if (patientIdField) patientIdField.value = patient.id_pasien || '';
        if (namaPasienField) namaPasienField.value = patient.nama_lengkap || '';
        if (tanggalLahirField) tanggalLahirField.value = patient.tanggal_lahir || '';
        if (alamatField) alamatField.value = patient.alamat_lengkap || '';
        if (statusPasienField) statusPasienField.value = patient.status_pasien || '';
        if (hasilPemeriksaanField) hasilPemeriksaanField.value = patient.hasil_pemeriksaan || '';
        if (jumlahPembayaranField) jumlahPembayaranField.value = patient.jumlah_pembayaran || '';
        if (medmsgField) medmsgField.value = patient.medical_message || '';

        // Select the service type card
        if (patient.informasi_medis) {
            const serviceCard = document.querySelector(`.selectable-card[data-value="${patient.informasi_medis}"]`);
            if (serviceCard) {
                this.selectCard(serviceCard);
            }
        }

        // Update form title and button
        const formTitle = document.querySelector('.modal-header h2');
        const submitBtn = document.getElementById('submitFormBtn');
        
        if (formTitle) {
            formTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Data Pasien';
        }
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Data Pasien';
        }
    }

    showDeleteConfirmation(patientId, patientName) {
        const modal = document.getElementById('deleteModal');
        const patientNameElement = document.getElementById('deletePatientName');
        
        if (!modal || !patientNameElement) {
            console.error('Delete modal elements not found');
            return;
        }
        
        patientNameElement.textContent = patientName || 'Pasien';
        modal.classList.add('active');

        // Add event listeners
        const cancelDelete = document.getElementById('cancelDelete');
        const confirmDelete = document.getElementById('confirmDelete');
        const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

        const closeModal = () => modal.classList.remove('active');

        if (cancelDelete) cancelDelete.addEventListener('click', closeModal);
        if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeModal);
        if (confirmDelete) {
            confirmDelete.addEventListener('click', async () => {
                await this.deletePatient(patientId);
                closeModal();
            });
        }
    }

    async deletePatient(patientId) {
        try {
            const formData = new FormData();
            formData.append('action', 'delete_patient');
            formData.append('patient_id', patientId);

            const response = await fetch('../backend/dashboardview.php', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.showNotification('Data pasien berhasil dihapus', 'success');
                
                // Reload the current view
                if (this.currentView === 'dashboard') {
                    this.loadDashboardStats();
                } else {
                    this.loadPatientsList(this.currentPage);
                }
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Error deleting patient:', error);
            this.showNotification('Gagal menghapus data pasien', 'error');
        }
    }

    // ==================== UTILITY METHODS ====================

    calculateAge(birthDate) {
        if (!birthDate) return 'Tidak diketahui';
        
        const today = new Date();
        const birth = new Date(birthDate);
        
        if (isNaN(birth.getTime())) return 'Tanggal tidak valid';
        
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }

    getStatusClass(status) {
        const statusMap = {
            'menunggu': 'pending',
            'dalam perawatan': 'in-progress',
            'selesai': 'completed'
        };
        return statusMap[status] || 'pending';
    }

    formatStatus(status) {
        const statusMap = {
            'menunggu': 'Menunggu',
            'dalam perawatan': 'Perawatan',
            'selesai': 'Selesai'
        };
        return statusMap[status] || status;
    }

    getServiceIcon(service) {
        const iconMap = {
            'rawat-inap': 'fas fa-procedures',
            'rawat-jalan': 'fas fa-walking',
            'pemeriksaan': 'fas fa-stethoscope'
        };
        return iconMap[service] || 'fas fa-stethoscope';
    }

    formatServiceType(service) {
        const serviceMap = {
            'rawat-inap': 'Rawat Inap',
            'rawat-jalan': 'Rawat Jalan',
            'pemeriksaan': 'Pemeriksaan'
        };
        return serviceMap[service] || service;
    }

    // ==================== FILE UPLOAD METHODS ====================

    setupFileUpload(inputId, fileNameId) {
        const fileInput = document.getElementById(inputId);
        const fileName = document.getElementById(fileNameId);
        
        if (fileInput && fileName) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileChange(e.target, fileName, inputId);
            });
        }
    }

    handleFileChange(fileInput, fileNameElement, inputId) {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            
            if (this.validateFile(file, inputId)) {
                fileNameElement.textContent = file.name;
                fileNameElement.style.color = '#28a745';
            } else {
                fileInput.value = '';
                fileNameElement.textContent = 'Belum ada file';
                fileNameElement.style.color = '#6c757d';
            }
        } else {
            fileNameElement.textContent = 'Belum ada file';
            fileNameElement.style.color = '#6c757d';
        }
    }

    validateFile(file, inputId) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        if (file.size > maxSize) {
            this.showNotification('Ukuran file terlalu besar (maksimal 5MB)', 'error');
            return false;
        }

        if (inputId === 'fotoPasien') {
            const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!validImageTypes.includes(file.type)) {
                this.showNotification('Format file tidak didukung. Gunakan JPG, PNG, atau GIF.', 'error');
                return false;
            }
        }

        if (inputId === 'pdfDokumen') {
            if (file.type !== 'application/pdf') {
                this.showNotification('Hanya file PDF yang diperbolehkan.', 'error');
                return false;
            }
        }

        return true;
    }

    // ==================== EXISTING METHODS (dengan improvement) ====================

    updateCurrentDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        const currentDateElement = document.getElementById('currentDate');
        if (currentDateElement) {
            currentDateElement.textContent = now.toLocaleDateString('id-ID', options);
        }
    }

    initializeModal() {
        this.modal = document.getElementById('formModal');
        this.openModalBtn = document.getElementById('inputPemeriksaanBtn');
        this.closeModalBtn = document.getElementById('closeModal');
        this.cancelFormBtn = document.getElementById('cancelForm');

        this.setupModalEvents();
    }

    setupModalEvents() {
        // Open modal
        if (this.openModalBtn) {
            this.openModalBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openModal();
            });
        }

        // Close modal events
        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', () => this.closeModal());
        }

        if (this.cancelFormBtn) {
            this.cancelFormBtn.addEventListener('click', () => this.closeModal());
        }

        // Close on background click and escape key
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.closeModal();
                }
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal?.classList.contains('active')) {
                this.closeModal();
            }
        });
    }

    openModal() {
        if (this.modal) {
            this.modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal() {
        if (this.modal) {
            this.modal.classList.remove('active');
            document.body.style.overflow = '';
            this.resetForm();
        }
    }

    initializeFileUploads() {
        this.setupFileUpload('fotoPasien', 'fotoFileName');
        this.setupFileUpload('pdfDokumen', 'pdfFileName');
    }

    initializeSelectableCards() {
        this.cardGroup = document.getElementById('jenisLayananGroup');
        if (!this.cardGroup) return;
        
        this.cards = this.cardGroup.querySelectorAll('.selectable-card');
        this.setupCardEvents();
    }

    setupCardEvents() {
        this.cards.forEach(card => {
            card.addEventListener('click', () => this.selectCard(card));
            card.addEventListener('keydown', (e) => this.handleCardKeydown(e, card));
            
            // Accessibility
            card.setAttribute('tabindex', '0');
            card.setAttribute('role', 'radio');
            card.setAttribute('aria-checked', 'false');
        });
    }

    handleCardKeydown(e, card) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.selectCard(card);
        }
    }

    selectCard(selectedCard) {
        if (!this.cards) return;
        
        this.cards.forEach(card => {
            card.classList.remove('selected');
            card.setAttribute('aria-checked', 'false');
            const radioInput = card.querySelector('.card-input');
            if (radioInput) radioInput.checked = false;
        });

        selectedCard.classList.add('selected');
        selectedCard.setAttribute('aria-checked', 'true');
        
        const radioInput = selectedCard.querySelector('.card-input');
        if (radioInput) {
            radioInput.checked = true;
        }

        this.hideCardGroupError();
    }

    hideCardGroupError() {
        if (this.cardGroup) {
            this.cardGroup.style.border = 'none';
            this.cardGroup.style.padding = '0';
            this.cardGroup.style.background = 'transparent';
        }
    }

    showCardGroupError() {
        if (this.cardGroup) {
            this.cardGroup.style.border = '2px solid #dc3545';
            this.cardGroup.style.borderRadius = '8px';
            this.cardGroup.style.padding = '8px';
            this.cardGroup.style.background = 'rgba(220, 53, 69, 0.05)';
        }
    }

    initializeFormSubmission() {
        this.patientForm = document.getElementById('patientForm');
        if (!this.patientForm) return;
        
        this.patientForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        console.log('Form submission started...');

        if (!this.validateForm()) {
            this.showNotification("Harap lengkapi semua field yang wajib diisi!", "error");
            this.scrollToFirstError();
            return;
        }

        await this.submitFormData();
    }

    validateForm() {
        this.clearAllErrors();
        let isValid = true;

        // Check all required fields
        const requiredFields = [
            { id: 'namaPasien', name: 'Nama Pasien' },
            { id: 'tanggalLahir', name: 'Tanggal Lahir' },
            { id: 'alamat', name: 'Alamat' },
            { id: 'statusPasien', name: 'Status Pasien' },
            { id: 'hasilPemeriksaan', name: 'Hasil Pemeriksaan' },
            { id: 'jumlahPembayaran', name: 'Jumlah Pembayaran' }
        ];

        requiredFields.forEach(field => {
            const element = document.getElementById(field.id);
            if (element && !this.isFieldValid(element)) {
                isValid = false;
                this.showFieldError(element, `${field.name} harus diisi`);
            }
        });

        // Check selectable cards
        const selectedCard = document.querySelector('.selectable-card.selected');
        if (!selectedCard) {
            isValid = false;
            this.showCardGroupError();
        }

        return isValid;
    }

    isFieldValid(field) {
        if (!field) return false;

        const value = field.value;
        const type = field.type;

        if (type === 'date') {
            return value !== '';
        } else if (type === 'number') {
            return value !== '' && !isNaN(value) && Number(value) >= 0;
        } else if (type === 'select-one') {
            return value !== '';
        } else {
            return value.trim() !== '';
        }
    }

    showFieldError(field, message) {
        if (!field) return;

        // Add error styling
        field.classList.add('field-error');
        field.style.borderColor = '#dc3545';
        field.style.backgroundColor = '#fff5f5';

        // Remove existing error
        this.removeFieldError(field);

        // Add error message
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error-message';
        errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        
        field.parentNode.appendChild(errorElement);

        // Auto-remove error on input
        const removeErrorHandler = () => {
            field.classList.remove('field-error');
            field.style.borderColor = '';
            field.style.backgroundColor = '';
            this.removeFieldError(field);
            field.removeEventListener('input', removeErrorHandler);
        };

        field.addEventListener('input', removeErrorHandler, { once: true });
    }

    removeFieldError(field) {
        const existingError = field.parentNode.querySelector('.field-error-message');
        if (existingError) {
            existingError.remove();
        }
    }

    clearAllErrors() {
        // Remove error styling
        const errorFields = document.querySelectorAll('.field-error');
        errorFields.forEach(field => {
            field.classList.remove('field-error');
            field.style.borderColor = '';
            field.style.backgroundColor = '';
        });

        // Remove error messages
        const errorMessages = document.querySelectorAll('.field-error-message');
        errorMessages.forEach(msg => msg.remove());

        // Remove card group error
        this.hideCardGroupError();
    }

    scrollToFirstError() {
        const firstError = document.querySelector('.field-error-message');
        if (firstError) {
            firstError.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }
    }

    async submitFormData() {
        const submitBtn = this.patientForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        // Show loading state
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
        submitBtn.disabled = true;

        try {
            const formData = new FormData(this.patientForm);
            const patientId = document.getElementById('patientId').value;
            
            let url = "../backend/dashboard.php";
            let method = "POST";

            // If editing existing patient, use update endpoint
            if (patientId) {
                url = "../backend/dashboardview.php";
                formData.append('action', 'update_patient');
                formData.append('patient_id', patientId);
                // Rename fields to match update endpoint
                formData.append('nama_pasien', formData.get('namaPasien'));
                formData.append('tanggal_lahir', formData.get('tanggalLahir'));
                formData.append('alamat', formData.get('alamat'));
                formData.append('jenis_layanan', formData.get('jenisLayanan'));
                formData.append('status_pasien', formData.get('statusPasien'));
                formData.append('hasil_pemeriksaan', formData.get('hasilPemeriksaan'));
                formData.append('jumlah_pembayaran', formData.get('jumlahPembayaran'));
            }
            
            const response = await fetch(url, {
                 method: method,
                 body: formData
             });
             
            const result = await this.handleResponse(response);

            if (result.success) {
                this.handleSuccess(result, patientId);
            } else {
                throw new Error(result.error || 'Gagal menyimpan data');
            }

        } catch (error) {
            console.error('Submission error:', error);
            this.showNotification("Gagal menyimpan data: " + error.message, "error");
        } finally {
            // Reset button state
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async handleResponse(response) {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseText = await response.text();

        if (!responseText) {
            return { success: true, message: "Data berhasil disimpan" };
        }

        try {
            return JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            return { success: true, message: "Data berhasil disimpan" };
        }
    }

    handleSuccess(result, patientId) {
        const message = patientId ? "Data pasien berhasil diperbarui!" : "Data pemeriksaan berhasil disimpan!";
        this.showNotification(result.message || message, "success");
        this.closeModal();
        this.resetForm();
        this.clearAllErrors();
        
        // Reload data based on current view
        if (this.currentView === 'dashboard') {
            this.loadDashboardStats();
        } else {
            this.loadPatientsList(this.currentPage);
        }
    }

    resetForm() {
        if (this.patientForm) {
            this.patientForm.reset();
            // Clear hidden patient ID field
            const patientIdField = document.getElementById('patientId');
            if (patientIdField) patientIdField.value = '';
        }
        this.resetFileNames();
        this.resetSelectableCards();
        
        // Reset form title and button to default
        const formTitle = document.querySelector('.modal-header h2');
        const submitBtn = document.getElementById('submitFormBtn');
        
        if (formTitle) {
            formTitle.innerHTML = '<i class="fas fa-file-medical"></i> Input Hasil Pemeriksaan';
        }
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Data Pemeriksaan';
        }
    }

    resetFileNames() {
        const fotoFileName = document.getElementById('fotoFileName');
        const pdfFileName = document.getElementById('pdfFileName');
        
        if (fotoFileName) {
            fotoFileName.textContent = 'Belum ada file';
            fotoFileName.style.color = '#6c757d';
        }
        
        if (pdfFileName) {
            pdfFileName.textContent = 'Belum ada file';
            pdfFileName.style.color = '#6c757d';
        }
    }

    resetSelectableCards() {
        if (this.cards && this.cards.length > 0) {
            this.selectCard(this.cards[0]);
        }
    }

    // ==================== EVENT LISTENERS ====================

    initializeEventListeners() {
        this.setupSearch();
        this.setupNotificationBell();
        this.setupLogout();
        
        // View switching
        document.getElementById('dashboardMenu').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchView('dashboard');
        });

        document.getElementById('patientsMenu').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchView('patients');
        });

        // Quick actions
        const quickAddPatient = document.getElementById('quickAddPatient');
        if (quickAddPatient) {
            quickAddPatient.addEventListener('click', (e) => {
                e.preventDefault();
                this.openModal();
            });
        }

        const quickViewPatients = document.getElementById('quickViewPatients');
        if (quickViewPatients) {
            quickViewPatients.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchView('patients');
            });
        }

        document.getElementById('addNewPatient').addEventListener('click', (e) => {
            e.preventDefault();
            this.openModal();
        });

        // Filters - reset to page 1 when filters change
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.statusFilter = e.target.value;
            this.loadPatientsList(1);
        });

        document.getElementById('serviceFilter').addEventListener('change', (e) => {
            this.serviceFilter = e.target.value;
            this.loadPatientsList(1);
        });

        // Global search with debounce
        document.getElementById('globalSearch').addEventListener('input', this.debounce((e) => {
            this.searchTerm = e.target.value;
            if (this.currentView === 'patients') {
                this.loadPatientsList(1);
            }
        }, 500));
    }

    setupSearch() {
        const searchBox = document.querySelector('.search-box input');
        if (searchBox) {
            searchBox.addEventListener('input', this.debounce((e) => {
                this.performSearch(e.target.value);
            }, 300));
        }
    }

    setupNotificationBell() {
        const notificationBell = document.querySelector('.notification');
        if (notificationBell) {
            notificationBell.addEventListener('click', () => {
                this.showNotification("Fitur notifikasi belum tersedia", "info");
            });
        }
    }

    setupLogout() {
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Apakah Anda yakin ingin keluar?')) {
                    this.showNotification("Berhasil logout", "success");
                    window.location.href = '../backend/logout.php';
                }
            });
        }
    }

    attachTableEventListeners() {
        // View buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const patientId = btn.dataset.patientId;
                this.showPatientDetail(patientId);
            });
        });

        // Edit buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const patientId = btn.dataset.patientId;
                this.editPatient(patientId);
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const patientId = btn.dataset.patientId;
                const patientName = btn.closest('tr').querySelector('.patient-name strong').textContent;
                this.showDeleteConfirmation(patientId, patientName);
            });
        });

        // Row click for quick view
        document.querySelectorAll('#patientsTableBody tr[data-patient-id]').forEach(row => {
            row.addEventListener('click', () => {
                const patientId = row.dataset.patientId;
                this.showPatientDetail(patientId);
            });
        });
    }

    performSearch(query) {
        // Optional: implement additional search functionality if needed
        if (query.length > 2) {
            console.log('Searching for:', query);
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ==================== NOTIFICATION SYSTEM ====================

    showNotification(message, type = 'info') {
        // Remove existing notifications
        this.removeExistingNotifications();

        const notification = this.createNotificationElement(message, type);
        document.body.appendChild(notification);

        this.setupNotificationAutoRemove(notification);
        this.setupNotificationClose(notification);
    }

    removeExistingNotifications() {
        const existingNotifications = document.querySelectorAll('.notification-toast');
        existingNotifications.forEach(notif => {
            notif.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notif.remove(), 300);
        });
    }

    createNotificationElement(message, type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#007bff'
        };

        const notification = document.createElement('div');
        notification.className = `notification-toast notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${icons[type]}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" aria-label="Tutup notifikasi">
                <i class="fas fa-times"></i>
            </button>
        `;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            min-width: 300px;
            max-width: 500px;
            font-family: inherit;
        `;

        return notification;
    }

    setupNotificationAutoRemove(notification) {
        const autoRemove = setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);

        notification.autoRemoveTimeout = autoRemove;
    }

    setupNotificationClose(notification) {
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                clearTimeout(notification.autoRemoveTimeout);
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            });
        }
    }

    // ==================== GLOBAL STYLES ====================

    addGlobalStyles() {
        if (!document.querySelector('#dashboard-styles')) {
            const style = document.createElement('style');
            style.id = 'dashboard-styles';
            style.textContent = `
                /* ✅ IMPROVED: Padding dan spacing untuk detail modal */
                .modal-content.large {
                    max-width: 800px;
                    max-height: 90vh;
                    overflow-y: auto;
                }

                .modal-body {
                    padding: 0;
                }

                .detail-sections {
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .detail-section {
                    background: white;
                    border: 1px solid #e9ecef;
                    border-radius: 12px;
                    padding: 24px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                    transition: box-shadow 0.2s ease;
                }

                .detail-section:hover {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.12);
                }

                .detail-section h4 {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin: 0 0 20px 0;
                    padding-bottom: 16px;
                    border-bottom: 2px solid #f8f9fa;
                    color: #2c3e50;
                    font-size: 1.2rem;
                    font-weight: 600;
                }

                .detail-section h4 i {
                    color: var(--primary);
                    font-size: 1.1em;
                    width: 24px;
                    text-align: center;
                }

                .patient-detail-header {
                    display: flex;
                    align-items: center;
                    gap: 24px;
                    padding: 32px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border-radius: 12px 12px 0 0;
                }

                .patient-avatar.large {
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 2.5rem;
                    border: 4px solid rgba(255,255,255,0.3);
                    overflow: hidden;
                    flex-shrink: 0;
                }

                .patient-avatar.large .avatar-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 50%;
                }

                .patient-basic-info {
                    flex: 1;
                }

                .patient-basic-info h3 {
                    margin: 0 0 8px 0;
                    font-size: 1.8rem;
                    font-weight: 700;
                }

                .patient-basic-info > p {
                    margin: 0 0 16px 0;
                    opacity: 0.9;
                    font-size: 1.1rem;
                }

                .patient-meta {
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                }

                .detail-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }

                .detail-item {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .detail-item.full-width {
                    grid-column: 1 / -1;
                }

                .detail-item label {
                    font-weight: 600;
                    color: #6c757d;
                    font-size: 0.9rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .detail-item span {
                    color: #2c3e50;
                    font-size: 1rem;
                    line-height: 1.5;
                }

                .medical-notes {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    border-left: 4px solid var(--primary);
                    line-height: 1.6;
                    color: #495057;
                }

                .payment-amount {
                    font-size: 2.5rem;
                    font-weight: 700;
                    color: var(--success);
                    text-align: center;
                    padding: 20px;
                    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                    border-radius: 12px;
                    border: 2px dashed #dee2e6;
                }

                /* ✅ NEW: Styles untuk gambar pasien */
                .patient-image-container {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .image-wrapper {
                    position: relative;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    background: #f8f9fa;
                    min-height: 200px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .patient-image {
                    max-width: 100%;
                    max-height: 400px;
                    width: auto;
                    height: auto;
                    display: block;
                    margin: 0 auto;
                }

                .image-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }

                .image-wrapper:hover .image-overlay {
                    opacity: 1;
                }

                .btn-view-image {
                    background: rgba(255,255,255,0.9);
                    color: #2c3e50;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 25px;
                    cursor: pointer;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.3s ease;
                }

                .btn-view-image:hover {
                    background: white;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }

                .image-info {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    border: 1px solid #e9ecef;
                }

                .file-info {
                    font-family: 'Courier New', monospace;
                    font-size: 0.9rem;
                    color: #495057;
                }

                .image-meta {
                    font-size: 0.85rem;
                    color: #6c757d;
                }

                .no-image-message {
                    text-align: center;
                    padding: 40px 20px;
                    background: #f8f9fa;
                    border: 2px dashed #dee2e6;
                    border-radius: 12px;
                    color: #6c757d;
                }

                .no-image-message i {
                    font-size: 3rem;
                    margin-bottom: 16px;
                    opacity: 0.5;
                }

                .no-image-message p {
                    margin: 0;
                    font-size: 1.1rem;
                }

                /* ✅ NEW: Styles untuk status steganografi */
                .steganography-status-info {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    border: 1px solid #e9ecef;
                }

                .status-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                    margin-bottom: 16px;
                }

                .status-item {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .status-item.full-width {
                    grid-column: 1 / -1;
                }

                .status-label {
                    font-weight: 600;
                    color: #6c757d;
                    font-size: 0.85rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .status-value {
                    color: #2c3e50;
                    font-size: 0.95rem;
                    font-family: 'Courier New', monospace;
                }

                .extraction-actions {
                    display: flex;
                    justify-content: flex-end;
                }

                /* ✅ IMPROVED: Styles untuk pesan steganografi */
                .steganography-message {
                    background: linear-gradient(135deg, #e8f5e8 0%, #d4edda 100%);
                    border: 1px solid #c3e6cb;
                    border-radius: 12px;
                    padding: 24px;
                    margin-top: 8px;
                }

                .message-content {
                    margin-bottom: 20px;
                }

                .message-content p {
                    margin: 0 0 12px 0;
                    font-weight: 700;
                    color: #155724;
                    font-size: 1.1rem;
                }

                .message-text {
                    background: white;
                    padding: 16px;
                    border-radius: 8px;
                    border: 1px solid #c3e6cb;
                    font-family: 'Courier New', monospace;
                    color: #155724;
                    line-height: 1.6;
                    word-break: break-word;
                    font-size: 0.95rem;
                    max-height: 200px;
                    overflow-y: auto;
                }

                .message-meta {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 12px;
                    padding-top: 16px;
                    border-top: 1px solid rgba(195, 230, 203, 0.5);
                }

                .message-source {
                    color: #155724;
                    font-size: 0.85rem;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    opacity: 0.8;
                }

                .btn-small {
                    background: #28a745;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.85rem;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.2s ease;
                    font-weight: 500;
                }

                .btn-small:hover {
                    background: #218838;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
                }

                .btn-outline {
                    background: transparent;
                    color: #28a745;
                    border: 1px solid #28a745;
                }

                .btn-outline:hover {
                    background: #28a745;
                    color: white;
                }

                .no-steganography-message {
                    text-align: center;
                    padding: 40px 20px;
                    background: #f8f9fa;
                    border-radius: 12px;
                    border: 2px dashed #dee2e6;
                    color: #6c757d;
                }

                .no-steganography-message i {
                    font-size: 2.5rem;
                    margin-bottom: 16px;
                    opacity: 0.5;
                }

                .no-steganography-message p {
                    margin: 0 0 12px 0;
                    font-size: 1.1rem;
                }

                .message-info {
                    color: #6c757d;
                    font-size: 0.9rem;
                }

                .detail-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                    padding: 24px;
                    background: #f8f9fa;
                    border-top: 1px solid #e9ecef;
                    border-radius: 0 0 12px 12px;
                }

                /* Responsive design */
                @media (max-width: 768px) {
                    .patient-detail-header {
                        flex-direction: column;
                        text-align: center;
                        gap: 16px;
                        padding: 24px;
                    }

                    .patient-meta {
                        justify-content: center;
                    }

                    .detail-grid {
                        grid-template-columns: 1fr;
                        gap: 16px;
                    }

                    .status-grid {
                        grid-template-columns: 1fr;
                    }

                    .message-meta {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .detail-actions {
                        flex-direction: column;
                    }

                    .modal-content.large {
                        margin: 20px;
                        width: calc(100% - 40px);
                    }
                }

                /* Existing styles tetap dipertahankan... */
                .service-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 500;
                }

                .service-badge.rawat-inap {
                    background: #fff3cd;
                    color: #856404;
                }

                .service-badge.rawat-jalan {
                    background: #d1ecf1;
                    color: #0c5460;
                }

                .service-badge.pemeriksaan {
                    background: #d4edda;
                    color: #155724;
                }

                .status-badge {
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .status-badge.pending {
                    background: #fff3cd;
                    color: #856404;
                }

                .status-badge.in-progress {
                    background: #cce7ff;
                    color: #004085;
                }

                .status-badge.completed {
                    background: #d4edda;
                    color: #155724;
                }

                .status-badge.success {
                    background: #d4edda;
                    color: #155724;
                }

                .status-badge.warning {
                    background: #fff3cd;
                    color: #856404;
                }

                /* Notification, Pagination, dan existing styles lainnya */
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
                .notification-close {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 4px;
                    margin-left: auto;
                    opacity: 0.8;
                    transition: opacity 0.2s;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 24px;
                    height: 24px;
                }
                .notification-close:hover {
                    opacity: 1;
                    background: rgba(255, 255, 255, 0.1);
                }
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex: 1;
                }
                .notification-content i {
                    font-size: 1.2em;
                }
                .field-error-message {
                    color: #dc3545;
                    font-size: 0.875rem;
                    margin-top: 5px;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                .field-error-message i {
                    font-size: 0.75rem;
                }
                .field-error {
                    border-color: #dc3545 !important;
                    background-color: #fff5f5 !important;
                }
                .hidden {
                    display: none !important;
                }
                .action-buttons {
                    display: flex;
                    gap: 8px;
                }
                .btn-icon {
                    width: 32px;
                    height: 32px;
                    border: none;
                    border-radius: 6px;
                    background: #f8f9fa;
                    color: var(--gray);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }
                .btn-icon:hover {
                    background: var(--primary);
                    color: white;
                }
                .btn-icon.delete-btn:hover {
                    background: var(--danger);
                }
                .pagination {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 8px;
                    margin-top: 24px;
                    padding: 16px;
                    flex-wrap: wrap;
                }
                .page-btn {
                    padding: 8px 16px;
                    border: 1px solid #ddd;
                    background: white;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-size: 0.875rem;
                    min-width: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                }
                .page-btn:hover {
                    background: #f8f9fa;
                    border-color: var(--primary);
                }
                .page-btn.active {
                    background: var(--primary);
                    color: white;
                    border-color: var(--primary);
                }
                .page-btn.prev-btn, .page-btn.next-btn {
                    padding: 8px 12px;
                }
                .page-dots {
                    padding: 8px 4px;
                    color: var(--gray);
                }
                .empty-state, .empty-table {
                    text-align: center;
                    padding: 40px 20px;
                    color: var(--gray);
                }
                .empty-state i, .empty-table i {
                    font-size: 2rem;
                    margin-bottom: 16px;
                    opacity: 0.5;
                }
                .loading-state, .error-state {
                    text-align: center;
                    padding: 40px 20px;
                }
                .loading-state i, .error-state i {
                    font-size: 2rem;
                    margin-bottom: 16px;
                }
                .loading-state {
                    color: var(--primary);
                }
                .error-state {
                    color: var(--danger);
                }
                .btn-retry {
                    background: var(--primary);
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    margin-top: 12px;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    transition: background 0.2s ease;
                }
                .btn-retry:hover {
                    background: var(--primary-dark);
                }
                .btn-clear-filters {
                    background: var(--warning);
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    margin-top: 12px;
                    transition: background 0.2s ease;
                }
                .btn-clear-filters:hover {
                    background: #e0a800;
                }
                .btn-danger {
                    background: var(--danger);
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: background 0.2s ease;
                }
                .btn-danger:hover {
                    background: #c82333;
                }
                .stat-card.loading .stat-icon {
                    color: var(--primary);
                }
                .stat-card.error .stat-icon {
                    color: var(--danger);
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.medicareDashboard = new Dashboard();
});

// Global error handling
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
});

// Handle page unload
window.addEventListener('beforeunload', function() {
    // Cleanup jika diperlukan
});