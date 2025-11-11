class Dashboard {
    constructor() {
        this.currentPage = 1;
        this.currentView = 'dashboard';
        this.searchTerm = '';
        this.statusFilter = '';
        this.serviceFilter = '';
        this.dateFilter = '';
        this.isLoading = false;
        this.patients = [];
        this.init();
    }

    init() {
        console.log('Initializing Dashboard...');
        this.updateCurrentDate();
        this.initializeModal();
        this.initializeFileUploads();
        this.initializeSelectableCards();
        this.initializeFormSubmission();
        this.initializeEventListeners();
        this.initializeCharts();
        this.addGlobalStyles();
        
        // Load initial data
        this.loadDashboardStats();
        this.loadRecentPatients();
        
        // Auto-select first card
        setTimeout(() => {
            const firstCard = document.querySelector('.selectable-card');
            if (firstCard) {
                this.selectCard(firstCard);
            }
        }, 100);
    }

    // ==================== VIEW MANAGEMENT ====================

    switchView(view) {
        if (this.isLoading) return;
        
        this.currentView = view;
        
        const dashboardContent = document.getElementById('dashboardContent');
        const patientsContent = document.getElementById('patientsContent');
        const reportsContent = document.getElementById('reportsContent');
        const pageTitle = document.getElementById('pageTitle');
        const pageSubtitle = document.getElementById('pageSubtitle');

        // Hide all content
        dashboardContent.classList.add('hidden');
        patientsContent.classList.add('hidden');
        reportsContent.classList.add('hidden');

        // Update menu active state
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });

        if (view === 'dashboard') {
            dashboardContent.classList.remove('hidden');
            document.getElementById('dashboardMenu').parentElement.classList.add('active');
            pageTitle.textContent = 'Dashboard MediCare';
            pageSubtitle.textContent = 'Manajemen Data Pasien Terintegrasi';
            this.loadDashboardStats();
            this.loadRecentPatients();
        } else if (view === 'patients') {
            patientsContent.classList.remove('hidden');
            document.getElementById('patientsMenu').parentElement.classList.add('active');
            pageTitle.textContent = 'Daftar Pasien';
            pageSubtitle.textContent = 'Kelola data pasien secara lengkap';
            this.loadPatientsList(1);
        } else if (view === 'reports') {
            reportsContent.classList.remove('hidden');
            document.getElementById('reportsMenu').parentElement.classList.add('active');
            pageTitle.textContent = 'Laporan & Statistik';
            pageSubtitle.textContent = 'Analisis data dan laporan kinerja';
            this.updateCharts();
        }
    }

    // ==================== DATA LOADING METHODS ====================

    async loadDashboardStats() {
        try {
            this.showLoadingState('statsGrid', 'stat-card', 'Memuat statistik...');
            
            // Simulate API call
            setTimeout(() => {
                const mockStats = {
                    total_pasien: 156,
                    rawat_inap: 45,
                    rawat_jalan: 78,
                    pemeriksaan: 33,
                    total_pembayaran: 125000000,
                    pasien_baru: 12
                };
                this.displayStats(mockStats);
            }, 1000);
            
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

    async loadRecentPatients() {
        try {
            // Simulate API call
            setTimeout(() => {
                const mockPatients = [
                    {
                        id: 1,
                        name: 'Budi Santoso',
                        service: 'Rawat Inap',
                        date: '2024-01-15',
                        status: 'dalam perawatan'
                    },
                    {
                        id: 2,
                        name: 'Siti Rahayu',
                        service: 'Rawat Jalan',
                        date: '2024-01-14',
                        status: 'selesai'
                    },
                    {
                        id: 3,
                        name: 'Ahmad Wijaya',
                        service: 'Pemeriksaan',
                        date: '2024-01-16',
                        status: 'menunggu'
                    },
                    {
                        id: 4,
                        name: 'Maria Sari',
                        service: 'Rawat Inap',
                        date: '2024-01-13',
                        status: 'dalam perawatan'
                    },
                    {
                        id: 5,
                        name: 'Joko Prasetyo',
                        service: 'Rawat Jalan',
                        date: '2024-01-12',
                        status: 'selesai'
                    }
                ];
                this.displayRecentPatients(mockPatients);
            }, 800);
            
        } catch (error) {
            console.error('Error loading recent patients:', error);
            this.showErrorState('recentPatientsList', 'Gagal memuat data pasien terbaru');
        }
    }

    displayRecentPatients(patients) {
        const container = document.getElementById('recentPatientsList');
        
        if (!container) {
            console.error('Recent patients container not found');
            return;
        }

        if (!patients || patients.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-slash"></i>
                    <p>Tidak ada data pasien terbaru</p>
                </div>
            `;
            return;
        }

        container.innerHTML = patients.map(patient => {
            const statusClass = this.getStatusClass(patient.status);
            const date = new Date(patient.date).toLocaleDateString('id-ID');
            
            return `
                <div class="patient-item" data-patient-id="${patient.id}">
                    <div class="patient-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="patient-info">
                        <h4>${patient.name}</h4>
                        <p>${patient.service}</p>
                        <span class="patient-date">${date}</span>
                    </div>
                    <span class="status-badge ${statusClass}">${this.formatStatus(patient.status)}</span>
                </div>
            `;
        }).join('');

        // Add click event to patient items
        container.querySelectorAll('.patient-item').forEach(item => {
            item.addEventListener('click', () => {
                const patientId = item.dataset.patientId;
                this.showPatientDetail(patientId);
            });
        });
    }

    async loadPatientsList(page = 1) {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            this.currentPage = page;
            
            this.showLoadingState('patientsTableBody', 'table-row', 'Memuat data pasien...');
            
            // Simulate API call with mock data
            setTimeout(() => {
                const mockPatients = [
                    {
                        id_pasien: 1,
                        nama_lengkap: 'Budi Santoso',
                        tanggal_lahir: '1985-03-15',
                        informasi_medis: 'rawat-inap',
                        status_pasien: 'dalam perawatan',
                        created_at: '2024-01-15',
                        jumlah_pembayaran: 2500000
                    },
                    {
                        id_pasien: 2,
                        nama_lengkap: 'Siti Rahayu',
                        tanggal_lahir: '1990-07-22',
                        informasi_medis: 'rawat-jalan',
                        status_pasien: 'selesai',
                        created_at: '2024-01-14',
                        jumlah_pembayaran: 500000
                    },
                    {
                        id_pasien: 3,
                        nama_lengkap: 'Ahmad Wijaya',
                        tanggal_lahir: '1978-11-30',
                        informasi_medis: 'pemeriksaan',
                        status_pasien: 'menunggu',
                        created_at: '2024-01-16',
                        jumlah_pembayaran: 350000
                    },
                    {
                        id_pasien: 4,
                        nama_lengkap: 'Maria Sari',
                        tanggal_lahir: '1982-05-18',
                        informasi_medis: 'rawat-inap',
                        status_pasien: 'dalam perawatan',
                        created_at: '2024-01-13',
                        jumlah_pembayaran: 1800000
                    },
                    {
                        id_pasien: 5,
                        nama_lengkap: 'Joko Prasetyo',
                        tanggal_lahir: '1975-09-25',
                        informasi_medis: 'rawat-jalan',
                        status_pasien: 'selesai',
                        created_at: '2024-01-12',
                        jumlah_pembayaran: 750000
                    }
                ];

                const mockData = {
                    patients: mockPatients,
                    total_pages: 3,
                    current_page: page
                };

                this.displayPatientsList(mockData);
            }, 1500);
            
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

        // Store patients for later use
        this.patients = data.patients || [];

        // Display patients table
        if (!data.patients || data.patients.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-table">
                        <i class="fas fa-search"></i>
                        <p>Tidak ada data pasien yang ditemukan</p>
                        ${this.searchTerm || this.statusFilter || this.serviceFilter ? 
                            '<button class="btn-primary" onclick="window.dashboard.clearFilters()">Hapus Filter</button>' : 
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

    // ==================== PATIENT CRUD OPERATIONS ====================

    async showPatientDetail(patientId) {
        try {
            this.showNotification('Memuat detail pasien...', 'info');
            
            // Simulate API call
            setTimeout(() => {
                const mockPatient = {
                    id_pasien: patientId,
                    nama_lengkap: 'Budi Santoso',
                    tanggal_lahir: '1985-03-15',
                    alamat_lengkap: 'Jl. Merdeka No. 123, Jakarta Pusat',
                    informasi_medis: 'rawat-inap',
                    status_pasien: 'dalam perawatan',
                    hasil_pemeriksaan: 'Pasien mengalami demam tinggi dan batuk berdahak. Diagnosis: Pneumonia. Dirawat dengan antibiotik dan terapi suportif.',
                    jumlah_pembayaran: 2500000,
                    created_at: '2024-01-15',
                    foto_pasien: 'patient1.jpg',
                    medical_message: 'Pasien perlu monitoring ketat untuk saturasi oksigen. Kemungkinan perlu tambahan terapi oksigen jika kondisi tidak membaik dalam 24 jam.',
                    no_telepon: '081234567890',
                    email: 'budi.santoso@email.com',
                    diagnosis: 'Pneumonia',
                    resep_obat: 'Amoxicillin 500mg 3x1, Paracetamol 500mg 3x1, Ambroxol 30mg 3x1',
                    metode_pembayaran: 'BPJS',
                    catatan_pembayaran: 'Pembayaran melalui BPJS dengan no. kartu 1234567890'
                };
                
                this.displayPatientDetail(mockPatient);
                this.showNotification('Detail pasien berhasil dimuat', 'success');
            }, 1000);
            
        } catch (error) {
            console.error('Error loading patient detail:', error);
            this.showNotification('Gagal memuat detail pasien', 'error');
        }
    }

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

        content.innerHTML = `
            <div class="patient-detail-header">
                <div class="patient-avatar large">
                    <i class="fas fa-user"></i>
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
                        <div class="detail-item">
                            <label>No. Telepon</label>
                            <span>${patient.no_telepon || 'Tidak tersedia'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Email</label>
                            <span>${patient.email || 'Tidak tersedia'}</span>
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
                        <div class="detail-item">
                            <label>Diagnosis</label>
                            <span>${patient.diagnosis || 'Tidak tersedia'}</span>
                        </div>
                        <div class="detail-item full-width">
                            <label>Tanggal Pendaftaran</label>
                            <span>${createdDate}</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4><i class="fas fa-file-medical"></i> Hasil Pemeriksaan</h4>
                    <div class="medical-notes">
                        ${patient.hasil_pemeriksaan || '<em>Tidak ada catatan pemeriksaan</em>'}
                    </div>
                </div>

                ${patient.resep_obat ? `
                <div class="detail-section">
                    <h4><i class="fas fa-pills"></i> Resep Obat</h4>
                    <div class="medical-notes">
                        ${patient.resep_obat}
                    </div>
                </div>
                ` : ''}

                ${patient.medical_message ? `
                <div class="detail-section">
                    <h4><i class="fas fa-comment-medical"></i> Pesan Medis</h4>
                    <div class="medical-notes">
                        <strong>Pesan Khusus:</strong><br>
                        ${patient.medical_message}
                    </div>
                </div>
                ` : ''}

                <div class="detail-section">
                    <h4><i class="fas fa-money-bill-wave"></i> Informasi Pembayaran</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Jumlah Pembayaran</label>
                            <span>Rp ${parseInt(patient.jumlah_pembayaran || 0).toLocaleString()}</span>
                        </div>
                        <div class="detail-item">
                            <label>Metode Pembayaran</label>
                            <span>${patient.metode_pembayaran || 'Tunai'}</span>
                        </div>
                        ${patient.catatan_pembayaran ? `
                        <div class="detail-item full-width">
                            <label>Catatan Pembayaran</label>
                            <span>${patient.catatan_pembayaran}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>

            <div class="detail-actions">
                <button class="btn-secondary" id="closeDetailModalBtn">
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
    }

    attachDetailModalEventListeners(patient) {
        const closeBtn = document.getElementById('closeDetailModalBtn');
        const editBtn = document.getElementById('editPatientFromDetail');
        const modal = document.getElementById('detailModal');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }

        if (editBtn) {
            editBtn.addEventListener('click', () => {
                modal.classList.remove('active');
                this.editPatient(patient.id_pasien);
            });
        }
    }

    async editPatient(patientId) {
        try {
            // Simulate API call
            setTimeout(() => {
                const mockPatient = {
                    id_pasien: patientId,
                    nama_lengkap: 'Budi Santoso',
                    tanggal_lahir: '1985-03-15',
                    alamat_lengkap: 'Jl. Merdeka No. 123, Jakarta Pusat',
                    informasi_medis: 'rawat-inap',
                    status_pasien: 'dalam perawatan',
                    hasil_pemeriksaan: 'Pasien mengalami demam tinggi dan batuk berdahak. Diagnosis: Pneumonia.',
                    jumlah_pembayaran: 2500000,
                    no_telepon: '081234567890',
                    email: 'budi.santoso@email.com',
                    diagnosis: 'Pneumonia',
                    resep_obat: 'Amoxicillin 500mg 3x1, Paracetamol 500mg 3x1',
                    medmsg: 'Pasien perlu monitoring ketat untuk saturasi oksigen.',
                    metode_pembayaran: 'BPJS',
                    catatan_pembayaran: 'Pembayaran melalui BPJS',
                    prioritas: 'tinggi'
                };
                
                this.populateEditForm(mockPatient);
                this.openModal();
            }, 500);
            
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
        const noTeleponField = document.getElementById('noTelepon');
        const emailField = document.getElementById('email');
        const diagnosisField = document.getElementById('diagnosis');
        const resepObatField = document.getElementById('resepObat');
        const medmsgField = document.getElementById('medmsg');
        const metodePembayaranField = document.getElementById('metodePembayaran');
        const catatanPembayaranField = document.getElementById('catatanPembayaran');
        const prioritasField = document.getElementById('prioritas');

        if (patientIdField) patientIdField.value = patient.id_pasien || '';
        if (namaPasienField) namaPasienField.value = patient.nama_lengkap || '';
        if (tanggalLahirField) tanggalLahirField.value = patient.tanggal_lahir || '';
        if (alamatField) alamatField.value = patient.alamat_lengkap || '';
        if (statusPasienField) statusPasienField.value = patient.status_pasien || '';
        if (hasilPemeriksaanField) hasilPemeriksaanField.value = patient.hasil_pemeriksaan || '';
        if (jumlahPembayaranField) jumlahPembayaranField.value = patient.jumlah_pembayaran || '';
        if (noTeleponField) noTeleponField.value = patient.no_telepon || '';
        if (emailField) emailField.value = patient.email || '';
        if (diagnosisField) diagnosisField.value = patient.diagnosis || '';
        if (resepObatField) resepObatField.value = patient.resep_obat || '';
        if (medmsgField) medmsgField.value = patient.medmsg || '';
        if (metodePembayaranField) metodePembayaranField.value = patient.metode_pembayaran || '';
        if (catatanPembayaranField) catatanPembayaranField.value = patient.catatan_pembayaran || '';
        if (prioritasField) prioritasField.value = patient.prioritas || 'normal';

        // Select the service type card
        if (patient.informasi_medis) {
            const serviceCard = document.querySelector(`.selectable-card[data-value="${patient.informasi_medis}"]`);
            if (serviceCard) {
                this.selectCard(serviceCard);
            }
        }

        // Update form title and button
        const formTitle = document.querySelector('#formModal .modal-header h2');
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
            this.showNotification('Menghapus data pasien...', 'info');
            
            // Simulate API call
            setTimeout(() => {
                this.showNotification('Data pasien berhasil dihapus', 'success');
                
                // Reload the current view
                if (this.currentView === 'dashboard') {
                    this.loadDashboardStats();
                    this.loadRecentPatients();
                } else {
                    this.loadPatientsList(this.currentPage);
                }
            }, 1000);
            
        } catch (error) {
            console.error('Error deleting patient:', error);
            this.showNotification('Gagal menghapus data pasien', 'error');
        }
    }

    // ==================== FORM HANDLING ====================

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
        const maxSize = inputId === 'fotoPasien' ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB for images, 10MB for PDF
        
        if (file.size > maxSize) {
            this.showNotification(`Ukuran file terlalu besar (maksimal ${maxSize / 1024 / 1024}MB)`, 'error');
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
            
            // Simulate API call
            setTimeout(() => {
                this.handleSuccess(patientId);
            }, 2000);
            
        } catch (error) {
            console.error('Submission error:', error);
            this.showNotification("Gagal menyimpan data: " + error.message, "error");
        } finally {
            // Reset button state
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    handleSuccess(patientId) {
        const message = patientId ? "Data pasien berhasil diperbarui!" : "Data pemeriksaan berhasil disimpan!";
        
        // Show success modal
        this.showSuccessModal(message);
        
        // Close form modal
        this.closeModal();
        this.resetForm();
        this.clearAllErrors();
        
        // Reload data based on current view
        if (this.currentView === 'dashboard') {
            this.loadDashboardStats();
            this.loadRecentPatients();
        } else if (this.currentView === 'patients') {
            this.loadPatientsList(this.currentPage);
        }
    }

    showSuccessModal(message) {
        const modal = document.getElementById('successModal');
        const messageElement = document.getElementById('successMessage');
        const okBtn = document.getElementById('successOkBtn');
        const closeBtn = document.getElementById('closeSuccessModal');
        
        if (messageElement) {
            messageElement.textContent = message;
        }
        
        modal.classList.add('active');
        
        // Add event listeners
        const closeModal = () => modal.classList.remove('active');
        
        if (okBtn) okBtn.addEventListener('click', closeModal);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
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
        const formTitle = document.querySelector('#formModal .modal-header h2');
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

    // ==================== CHARTS AND REPORTS ====================

    initializeCharts() {
        this.serviceChart = null;
        this.trendChart = null;
        this.statusChart = null;
        this.revenueChart = null;
    }

    updateCharts() {
        this.createServiceDistributionChart();
        this.createPatientTrendChart();
        this.createStatusDistributionChart();
        this.createRevenueChart();
    }

    createServiceDistributionChart() {
        const ctx = document.getElementById('serviceDistributionChart').getContext('2d');
        
        if (this.serviceChart) {
            this.serviceChart.destroy();
        }
        
        this.serviceChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Rawat Inap', 'Rawat Jalan', 'Pemeriksaan'],
                datasets: [{
                    data: [45, 78, 33],
                    backgroundColor: [
                        '#39afd1',
                        '#00d97e',
                        '#f6c343'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    createPatientTrendChart() {
        const ctx = document.getElementById('patientTrendChart').getContext('2d');
        
        if (this.trendChart) {
            this.trendChart.destroy();
        }
        
        this.trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
                datasets: [{
                    label: 'Jumlah Pasien',
                    data: [120, 135, 110, 145, 160, 155, 170, 165, 180, 175, 190, 185],
                    borderColor: '#2c7be5',
                    backgroundColor: 'rgba(44, 123, 229, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            drawBorder: false
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    createStatusDistributionChart() {
        const ctx = document.getElementById('statusDistributionChart').getContext('2d');
        
        if (this.statusChart) {
            this.statusChart.destroy();
        }
        
        this.statusChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Menunggu', 'Dalam Perawatan', 'Selesai', 'Dirujuk'],
                datasets: [{
                    label: 'Jumlah Pasien',
                    data: [25, 45, 65, 10],
                    backgroundColor: [
                        '#f6c343',
                        '#2c7be5',
                        '#00d97e',
                        '#6c757d'
                    ],
                    borderWidth: 0,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            drawBorder: false
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    createRevenueChart() {
        const ctx = document.getElementById('revenueChart').getContext('2d');
        
        if (this.revenueChart) {
            this.revenueChart.destroy();
        }
        
        this.revenueChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
                datasets: [{
                    label: 'Pendapatan (Juta Rupiah)',
                    data: [85, 92, 78, 95, 110, 105, 120, 115, 130, 125, 140, 135],
                    backgroundColor: 'rgba(44, 123, 229, 0.8)',
                    borderColor: '#2c7be5',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            drawBorder: false
                        },
                        ticks: {
                            callback: function(value) {
                                return 'Rp ' + value + ' jt';
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // ==================== UTILITY METHODS ====================

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
            'selesai': 'completed',
            'rujukan': 'pending'
        };
        return statusMap[status] || 'pending';
    }

    formatStatus(status) {
        const statusMap = {
            'menunggu': 'Menunggu',
            'dalam perawatan': 'Perawatan',
            'selesai': 'Selesai',
            'rujukan': 'Dirujuk'
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

    clearFilters() {
        this.searchTerm = '';
        this.statusFilter = '';
        this.serviceFilter = '';
        this.dateFilter = '';
        
        // Reset filter inputs
        const globalSearch = document.getElementById('globalSearch');
        const statusFilter = document.getElementById('statusFilter');
        const serviceFilter = document.getElementById('serviceFilter');
        const dateFilter = document.getElementById('dateFilter');
        
        if (globalSearch) globalSearch.value = '';
        if (statusFilter) statusFilter.value = '';
        if (serviceFilter) serviceFilter.value = '';
        if (dateFilter) dateFilter.value = '';
        
        // Reload data
        this.loadPatientsList(1);
    }

    // ==================== LOADING & ERROR STATES ====================

    showLoadingState(containerId, itemClass, message = 'Memuat...') {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (containerId === 'patientsTableBody') {
            container.innerHTML = `
                <tr>
                    <td colspan="7" class="loading-table">
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
        } else if (containerId === 'recentPatientsList') {
            container.innerHTML = `
                <div class="patient-item loading">
                    <div class="patient-avatar">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                    <div class="patient-info">
                        <h4>${message}</h4>
                        <p>-</p>
                        <span class="patient-date">-</span>
                    </div>
                    <span class="status-badge pending">-</span>
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
                    <td colspan="7" class="empty-table">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>${message}</p>
                        <button class="btn-primary" onclick="window.dashboard.loadPatientsList(${this.currentPage})">
                            <i class="fas fa-redo"></i>
                            Coba Lagi
                        </button>
                    </td>
                </tr>
            `;
        } else if (containerId === 'statsGrid') {
            container.innerHTML = `
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Error</h3>
                        <span class="stat-number">-</span>
                        <button class="btn-primary" onclick="window.dashboard.loadDashboardStats()">
                            Coba Lagi
                        </button>
                    </div>
                </div>
            `;
        } else if (containerId === 'recentPatientsList') {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                    <button class="btn-primary" onclick="window.dashboard.loadRecentPatients()">
                        <i class="fas fa-redo"></i>
                        Coba Lagi
                    </button>
                </div>
            `;
        }
    }

    // ==================== EVENT LISTENERS ====================

    initializeEventListeners() {
        this.setupMenuEvents();
        this.setupQuickActions();
        this.setupSearch();
        this.setupFilters();
        this.setupNotificationBell();
        this.setupLogout();
        this.setupReports();
    }

    setupMenuEvents() {
        // View switching
        document.getElementById('dashboardMenu').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchView('dashboard');
        });

        document.getElementById('patientsMenu').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchView('patients');
        });

        document.getElementById('reportsMenu').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchView('reports');
        });

        document.getElementById('settingsMenu').addEventListener('click', (e) => {
            e.preventDefault();
            this.showNotification('Fitur pengaturan akan segera tersedia', 'info');
        });
    }

    setupQuickActions() {
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

        const quickReports = document.getElementById('quickReports');
        if (quickReports) {
            quickReports.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchView('reports');
            });
        }

        const quickEmergency = document.getElementById('quickEmergency');
        if (quickEmergency) {
            quickEmergency.addEventListener('click', (e) => {
                e.preventDefault();
                this.showNotification('Fitur kasus darurat akan segera tersedia', 'info');
            });
        }

        const viewAllPatients = document.getElementById('viewAllPatients');
        if (viewAllPatients) {
            viewAllPatients.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchView('patients');
            });
        }

        document.getElementById('addNewPatient').addEventListener('click', (e) => {
            e.preventDefault();
            this.openModal();
        });
    }

    setupSearch() {
        // Global search with debounce
        const globalSearch = document.getElementById('globalSearch');
        if (globalSearch) {
            globalSearch.addEventListener('input', this.debounce((e) => {
                this.searchTerm = e.target.value;
                if (this.currentView === 'patients') {
                    this.loadPatientsList(1);
                }
            }, 500));
        }
    }

    setupFilters() {
        // Filters - reset to page 1 when filters change
        const statusFilter = document.getElementById('statusFilter');
        const serviceFilter = document.getElementById('serviceFilter');
        const dateFilter = document.getElementById('dateFilter');
        
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.statusFilter = e.target.value;
                this.loadPatientsList(1);
            });
        }

        if (serviceFilter) {
            serviceFilter.addEventListener('change', (e) => {
                this.serviceFilter = e.target.value;
                this.loadPatientsList(1);
            });
        }

        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                this.dateFilter = e.target.value;
                this.loadPatientsList(1);
            });
        }
    }

    setupReports() {
        const reportPeriod = document.getElementById('reportPeriod');
        const exportReport = document.getElementById('exportReport');
        
        if (reportPeriod) {
            reportPeriod.addEventListener('change', (e) => {
                this.updateCharts();
            });
        }
        
        if (exportReport) {
            exportReport.addEventListener('click', (e) => {
                e.preventDefault();
                this.showNotification('Fitur export laporan akan segera tersedia', 'info');
            });
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
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Apakah Anda yakin ingin keluar?')) {
                    this.showNotification("Berhasil logout", "success");
                    // In a real app, you would redirect to logout page
                    // window.location.href = 'logout.php';
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

    // ==================== UTILITY FUNCTIONS ====================

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

    // ==================== GLOBAL STYLES ====================

    addGlobalStyles() {
        if (!document.querySelector('#dashboard-styles')) {
            const style = document.createElement('style');
            style.id = 'dashboard-styles';
            style.textContent = `
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
                
                .empty-state {
                    text-align: center;
                    padding: 40px 20px;
                    color: var(--secondary);
                }
                
                .empty-state i {
                    font-size: 2rem;
                    margin-bottom: 16px;
                    opacity: 0.5;
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.dashboard = new Dashboard();
});

// Global error handling
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
});

// Handle page unload
window.addEventListener('beforeunload', function() {
    // Cleanup if needed
});