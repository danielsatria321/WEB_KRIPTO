// dashboard.js - Complete Working Version with Steganography
class Dashboard {
    constructor() {
        this.STEGANOGRAPHY_KEY = "medcare-secure-key-2024"; // Key untuk AES encryption
        this.init();
    }

    init() {
        console.log('Initializing Dashboard with Steganography...');
        this.updateCurrentDate();
        this.initializeModal();
        this.initializeFileUploads();
        this.initializeSelectableCards();
        this.initializeFormSubmission();
        this.initializeEventListeners();
        this.addGlobalStyles();
        
        // Auto-select first card
        setTimeout(() => {
            const firstCard = document.querySelector('.selectable-card');
            if (firstCard) {
                this.selectCard(firstCard);
            }
        }, 100);
    }

    // ==================== STEGANOGRAPHY METHODS ====================

    // AES Encryption using Web Crypto API
    async encryptAES(message, key) {
        try {
            // Convert key to proper format
            const encoder = new TextEncoder();
            const keyData = encoder.encode(key);
            const messageData = encoder.encode(message);

            // Import key
            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                keyData,
                { name: 'AES-CBC', length: 256 },
                false,
                ['encrypt']
            );

            // Generate IV (Initialization Vector)
            const iv = crypto.getRandomValues(new Uint8Array(16));

            // Encrypt
            const encrypted = await crypto.subtle.encrypt(
                {
                    name: 'AES-CBC',
                    iv: iv
                },
                cryptoKey,
                messageData
            );

            // Combine IV and encrypted data
            const result = new Uint8Array(iv.length + encrypted.byteLength);
            result.set(iv);
            result.set(new Uint8Array(encrypted), iv.length);

            return result;
        } catch (error) {
            console.error('AES Encryption error:', error);
            throw new Error('Gagal mengenkripsi pesan');
        }
    }

    // Convert data to binary string
    dataToBinary(data) {
        let binary = '';
        for (let i = 0; i < data.length; i++) {
            binary += data[i].toString(2).padStart(8, '0');
        }
        return binary;
    }

    // Embed encrypted message into image using LSB
    embedMessageInImage(imageData, encryptedMessage) {
        const data = imageData.data;
        const binaryMessage = this.dataToBinary(encryptedMessage);
        
        // Add header: message length (32 bits)
        const messageLength = binaryMessage.length;
        const lengthBinary = messageLength.toString(2).padStart(32, '0');
        const fullBinary = lengthBinary + binaryMessage;

        // Check if image can hold the message
        const availableBits = data.length * 4; // Each RGBA pixel has 4 channels
        if (fullBinary.length > availableBits) {
            throw new Error(`Pesan terlalu panjang untuk gambar ini. Diperlukan: ${fullBinary.length} bits, Tersedia: ${availableBits} bits`);
        }

        let bitIndex = 0;
        
        // Embed the message in LSB
        for (let i = 0; i < data.length; i++) {
            if (bitIndex < fullBinary.length) {
                // Clear the least significant bit and set it to our message bit
                data[i] = (data[i] & 0xFE) | parseInt(fullBinary[bitIndex], 2);
                bitIndex++;
            } else {
                break;
            }
        }

        return imageData;
    }

    // Process image with steganography
    async processImageWithSteganography(file, message) {
        return new Promise((resolve, reject) => {
            // Encrypt the message first
            this.encryptAES(message, this.STEGANOGRAPHY_KEY)
                .then(encryptedData => {
                    const img = new Image();
                    img.onload = () => {
                        try {
                            // Create canvas
                            const canvas = document.createElement('canvas');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            const ctx = canvas.getContext('2d');
                            
                            // Draw image to canvas
                            ctx.drawImage(img, 0, 0);
                            
                            // Get image data
                            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            
                            // Embed encrypted message
                            const modifiedImageData = this.embedMessageInImage(imageData, encryptedData);
                            
                            // Put modified data back
                            ctx.putImageData(modifiedImageData, 0, 0);
                            
                            // Convert to blob
                            canvas.toBlob(blob => {
                                if (blob) {
                                    resolve(blob);
                                } else {
                                    reject(new Error('Gagal mengonversi gambar'));
                                }
                            }, file.type, 0.95); // Maintain good quality
                            
                        } catch (error) {
                            reject(error);
                        }
                    };
                    
                    img.onerror = () => {
                        reject(new Error('Gagal memuat gambar'));
                    };
                    
                    img.src = URL.createObjectURL(file);
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    // Modified file upload handler with steganography
    setupFileUpload(inputId, fileNameId) {
        const fileInput = document.getElementById(inputId);
        const fileName = document.getElementById(fileNameId);
        
        if (fileInput && fileName) {
            fileInput.addEventListener('change', async (e) => {
                await this.handleFileChangeWithSteganography(e.target, fileName, inputId);
            });
        }
    }

    // Enhanced file change handler with steganography
    async handleFileChangeWithSteganography(fileInput, fileNameElement, inputId) {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            
            // Only apply steganography for image files when medmsg exists
            if (inputId === 'fotoPasien' && this.validateFile(file, inputId)) {
                const medmsg = document.getElementById('medmsg').value.trim();
                
                if (medmsg) {
                    try {
                        // Show processing notification
                        this.showNotification('Menyisipkan pesan medis ke dalam gambar...', 'info');
                        
                        // Process image with steganography
                        const processedBlob = await this.processImageWithSteganography(file, medmsg);
                        
                        // Create new file from processed blob
                        const processedFile = new File([processedBlob], file.name, {
                            type: file.type,
                            lastModified: new Date().getTime()
                        });
                        
                        // Replace the original file with processed one
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(processedFile);
                        fileInput.files = dataTransfer.files;
                        
                        fileNameElement.textContent = `✓ ${file.name} (dengan pesan medis)`;
                        fileNameElement.style.color = '#28a745';
                        
                        this.showNotification('Pesan medis berhasil disisipkan ke dalam gambar!', 'success');
                        
                    } catch (error) {
                        console.error('Steganography error:', error);
                        fileNameElement.textContent = file.name;
                        fileNameElement.style.color = '#dc3545';
                        this.showNotification(`Gagal menyisipkan pesan: ${error.message}`, 'error');
                    }
                } else {
                    // No medmsg, proceed normally
                    this.handleFileChange(fileInput, fileNameElement, inputId);
                }
            } else {
                // Not an image or validation failed, proceed normally
                this.handleFileChange(fileInput, fileNameElement, inputId);
            }
        } else {
            fileNameElement.textContent = 'Belum ada file';
            fileNameElement.style.color = '#6c757d';
        }
    }

    // Original file change handler (for non-image files)
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

    // ==================== EXISTING METHODS (with minor updates) ====================

    // Update current date display
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

    // Modal functionality
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

    // File upload functionality
    initializeFileUploads() {
        this.setupFileUpload('fotoPasien', 'fotoFileName');
        this.setupFileUpload('pdfDokumen', 'pdfFileName');
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

    // Selectable cards functionality
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

    // Form submission
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
            
            // Log steganography status
            const medmsg = document.getElementById('medmsg').value.trim();
            const hasImage = formData.get('fotoPasien') && formData.get('fotoPasien').size > 0;
            
            if (hasImage && medmsg) {
                console.log('Data dikirim dengan steganografi AES+LSB');
            }
            
            // Simulate successful submission (remove this in production)
            // await this.simulateSubmission(formData);
            
            const response = await fetch("../backend/dashboard.php", {
                 method: "POST",
                 body: formData
             });
             
            const result = await this.handleResponse(response);

            this.handleSuccess({
                success: true,
                message: "Data pemeriksaan berhasil disimpan!" + (hasImage && medmsg ? " (dengan steganografi)" : ""),
                data: {
                    id: 'SIM-' + Date.now(),
                    nama: formData.get('namaPasien'),
                    status: formData.get('statusPasien'),
                    jenis_layanan: formData.get('jenisLayanan')
                }
            });

        } catch (error) {
            console.error('Submission error:', error);
            this.showNotification("Gagal menyimpan data: " + error.message, "error");
        } finally {
            // Reset button state
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    // Simulate successful submission (for testing without backend)
    async simulateSubmission(formData) {
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('Simulated form data:', {
                    namaPasien: formData.get('namaPasien'),
                    tanggalLahir: formData.get('tanggalLahir'),
                    alamat: formData.get('alamat'),
                    jenisLayanan: formData.get('jenisLayanan'),
                    statusPasien: formData.get('statusPasien'),
                    hasilPemeriksaan: formData.get('hasilPemeriksaan'),
                    jumlahPembayaran: formData.get('jumlahPembayaran'),
                    medmsg: formData.get('medmsg')
                });
                resolve();
            }, 1500);
        });
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

    handleSuccess(result) {
        this.showNotification(result.message || "Data pemeriksaan berhasil disimpan!", "success");
        this.closeModal();
        this.resetForm();
        this.clearAllErrors();
        
        // Update dashboard stats (simulated)
        this.updateDashboardStats();
    }

    updateDashboardStats() {
        // Simulate updating the dashboard numbers
        const statNumbers = document.querySelectorAll('.stat-number');
        if (statNumbers.length > 0) {
            const current = parseInt(statNumbers[0].textContent);
            statNumbers[0].textContent = current + 1;
        }
    }

    resetForm() {
        if (this.patientForm) {
            this.patientForm.reset();
        }
        this.resetFileNames();
        this.resetSelectableCards();
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
        if (this.cards) {
            this.cards.forEach(card => {
                card.classList.remove('selected');
                card.setAttribute('aria-checked', 'false');
                const radioInput = card.querySelector('.card-input');
                if (radioInput) radioInput.checked = false;
            });

            // Select first card by default
            if (this.cards.length > 0) {
                this.selectCard(this.cards[0]);
            }
        }
    }

    // Notification system
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

    // Additional event listeners
    initializeEventListeners() {
        this.setupSearch();
        this.setupNotificationBell();
        this.setupLogout();
        this.setupViewAllButton();
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
                    // window.location.href = 'logout.php';
                }
            });
        }
    }

    setupViewAllButton() {
        const viewAllBtn = document.querySelector('.view-all-btn');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', () => {
                this.showNotification("Fitur lihat semua pasien belum tersedia", "info");
            });
        }
    }

    performSearch(query) {
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

    // Global styles
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