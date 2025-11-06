// Inisialisasi dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Update tanggal saat ini
    updateCurrentDate();
    
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
            
            // Validasi form
            if (validateForm()) {
                // Simulasi penyimpanan data
                showNotification('Data pemeriksaan berhasil disimpan!', 'success');
                modal.classList.remove('active');
                this.reset();
                resetFileNames();
                resetSelectableCards();
            }
        });
    }
    
    // Initialize selectable cards
    initializeSelectableCards();
});

// Fungsi untuk update tanggal
function updateCurrentDate() {
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

// Fungsi untuk setup file upload
function setupFileUpload(inputId, fileNameId) {
    const fileInput = document.getElementById(inputId);
    const fileName = document.getElementById(fileNameId);
    
    if (fileInput && fileName) {
        fileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                fileName.textContent = this.files[0].name;
                fileName.style.color = '#28a745'; // Warna success
            } else {
                fileName.textContent = 'Belum ada file';
                fileName.style.color = '#6c757d'; // Warna secondary
            }
        });
    }
}

// Fungsi untuk reset nama file
function resetFileNames() {
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

// Selectable Card Functionality
function initializeSelectableCards() {
    const cardGroup = document.getElementById('jenisLayananGroup');
    if (!cardGroup) return;
    
    const cards = cardGroup.querySelectorAll('.selectable-card');
    
    cards.forEach(card => {
        card.addEventListener('click', function() {
            // Hapus selected class dari semua cards
            cards.forEach(c => c.classList.remove('selected'));
            
            // Tambahkan selected class ke card yang diklik
            this.classList.add('selected');
            
            // Trigger the radio input
            const radioInput = this.querySelector('.card-input');
            if (radioInput) {
                radioInput.checked = true;
                
                // Trigger change event untuk form validation
                radioInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        
        // Keyboard accessibility
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
        
        // Set tabindex untuk accessibility
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-pressed', 'false');
    });
    
    // Form validation feedback
    const form = document.getElementById('patientForm');
    if (form) {
        const jenisLayananInputs = form.querySelectorAll('input[name="jenisLayanan"]');
        
        jenisLayananInputs.forEach(input => {
            input.addEventListener('invalid', function() {
                cardGroup.style.border = '2px solid #dc3545';
                cardGroup.style.borderRadius = '8px';
                cardGroup.style.padding = '8px';
                cardGroup.style.background = 'rgba(220, 53, 69, 0.05)';
            });
            
            input.addEventListener('change', function() {
                cardGroup.style.border = 'none';
                cardGroup.style.padding = '0';
                cardGroup.style.background = 'transparent';
            });
        });
    }
}

// Fungsi untuk reset selectable cards
function resetSelectableCards() {
    const cards = document.querySelectorAll('.selectable-card');
    cards.forEach(card => {
        card.classList.remove('selected');
        const radioInput = card.querySelector('.card-input');
        if (radioInput) {
            radioInput.checked = false;
        }
    });
}

// Fungsi untuk validasi form
function validateForm() {
    const form = document.getElementById('patientForm');
    if (!form) return false;
    
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.style.borderColor = '#dc3545';
            field.addEventListener('input', function() {
                this.style.borderColor = '#d1d5db';
            });
        }
    });
    
    // Validasi khusus untuk selectable cards
    const selectedCard = document.querySelector('.selectable-card.selected');
    if (!selectedCard) {
        isValid = false;
        const cardGroup = document.getElementById('jenisLayananGroup');
        if (cardGroup) {
            cardGroup.style.border = '2px solid #dc3545';
            cardGroup.style.borderRadius = '8px';
            cardGroup.style.padding = '8px';
            cardGroup.style.background = 'rgba(220, 53, 69, 0.05)';
        }
    }
    
    return isValid;
}

// Fungsi untuk menampilkan notifikasi
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification-toast notification-${type}`;
    
    const iconClass = type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
    const backgroundColor = type === 'success' ? '#28a745' : '#007bff';
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${iconClass}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Style untuk notifikasi
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${backgroundColor};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 1001;
        animation: slideInRight 0.3s ease;
        min-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove setelah 5 detik
    const autoRemove = setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
    
    // Close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            clearTimeout(autoRemove);
            notification.remove();
        });
    }
    
    // Tambahkan stylesheet untuk animasi jika belum ada
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
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
            
            .notification-toast {
                animation: slideInRight 0.3s ease;
            }
            
            .notification-close {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                padding: 5px;
                margin-left: auto;
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
        `;
        document.head.appendChild(style);
    }
}

// Fungsi untuk mendapatkan nilai yang dipilih
function getSelectedLayanan() {
    const selectedCard = document.querySelector('.selectable-card.selected');
    return selectedCard ? selectedCard.dataset.value : null;
}

// Fungsi untuk set nilai secara programmatic
function setSelectedLayanan(value) {
    const cards = document.querySelectorAll('.selectable-card');
    cards.forEach(card => {
        if (card.dataset.value === value) {
            card.classList.add('selected');
            const radioInput = card.querySelector('.card-input');
            if (radioInput) {
                radioInput.checked = true;
            }
        } else {
            card.classList.remove('selected');
            const radioInput = card.querySelector('.card-input');
            if (radioInput) {
                radioInput.checked = false;
            }
        }
    });
}