class RegisterForm {
    constructor() {
        this.form = document.getElementById('registerForm');
        this.submitBtn = document.getElementById('submitBtn');
        this.messageDiv = document.getElementById('message');
        this.toggleBtn = document.getElementById('togglePassword');
        this.passwordInput = document.getElementById('password');
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        console.log('✅ Register form initialized');
    }
    
    setupEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Real-time validation
        this.setupRealTimeValidation();
        
        // Password toggle
        this.setupPasswordToggle();
    }
    
    setupRealTimeValidation() {
        const inputs = this.form.querySelectorAll('input');
        
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }
    
    setupPasswordToggle() {
        this.toggleBtn.addEventListener('click', () => {
            const type = this.passwordInput.type === 'password' ? 'text' : 'password';
            this.passwordInput.type = type;
            this.toggleBtn.querySelector('.toggle-icon').textContent = 
                type === 'password' ? '👁️' : '👁️‍🗨️';
        });
    }
    
    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';
        
        switch(field.name) {
            case 'nama':
                if (value.length < 2) {
                    isValid = false;
                    errorMessage = 'Nama harus minimal 2 karakter';
                }
                break;
                
            case 'username':
                if (value.length < 3) {
                    isValid = false;
                    errorMessage = 'Username harus minimal 3 karakter';
                } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                    isValid = false;
                    errorMessage = 'Hanya boleh huruf, angka, underscore';
                }
                break;
                
            case 'password':
                if (value.length < 6) {
                    isValid = false;
                    errorMessage = 'Password harus minimal 6 karakter';
                }
                break;
        }
        
        this.updateFieldUI(field, isValid, errorMessage);
        return isValid;
    }
    
    clearFieldError(field) {
        const errorElement = document.getElementById(field.name + 'Error');
        if (errorElement) {
            errorElement.textContent = '';
        }
        field.classList.remove('error');
    }
    
    updateFieldUI(field, isValid, errorMessage = '') {
        const errorElement = document.getElementById(field.name + 'Error');
        
        field.classList.remove('error', 'success');
        
        if (field.value.trim() === '') {
            if (errorElement) errorElement.textContent = '';
            return;
        }
        
        if (isValid) {
            field.classList.add('success');
            if (errorElement) errorElement.textContent = '';
        } else {
            field.classList.add('error');
            if (errorElement) errorElement.textContent = errorMessage;
        }
    }
    
    validateForm() {
        const fields = this.form.querySelectorAll('input[required]');
        let isValid = true;
        const errors = [];
        
        fields.forEach(field => {
            const fieldValid = this.validateField(field);
            if (!fieldValid) {
                isValid = false;
                const errorElement = document.getElementById(field.name + 'Error');
                if (errorElement && errorElement.textContent) {
                    errors.push(errorElement.textContent);
                }
            }
        });
        
        return { isValid, errors };
    }
    
    async handleSubmit(event) {
        event.preventDefault();
        console.log('🚀 Form submission started');
        
        // Validasi form
        const { isValid, errors } = this.validateForm();
        
        if (!isValid) {
            this.showMessage(errors[0], 'error');
            return;
        }
        
        // Prepare data
        const formData = new FormData(this.form);
        const data = {
            nama: formData.get('nama').trim(),
            username: formData.get('username').trim(),
            password: formData.get('password')
        };
        
        console.log('📤 Sending data:', { ...data, password: '***' });
        
        // Show loading state
        this.setLoading(true);
        
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            console.log('📥 Response:', result);
            
            if (result.success) {
                this.showMessage(result.message, 'success');
                this.form.reset();
                this.clearAllValidation();
                
                // Redirect ke login setelah 2 detik
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
                
            } else {
                this.showMessage(result.message, 'error');
            }
            
        } catch (error) {
            console.error('💥 Network error:', error);
            this.showMessage('Terjadi kesalahan jaringan. Silakan coba lagi.', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    setLoading(loading) {
        const buttonText = this.submitBtn.querySelector('.button-text');
        const buttonLoading = this.submitBtn.querySelector('.button-loading');
        
        if (loading) {
            this.submitBtn.disabled = true;
            buttonText.style.display = 'none';
            buttonLoading.style.display = 'inline';
        } else {
            this.submitBtn.disabled = false;
            buttonText.style.display = 'inline';
            buttonLoading.style.display = 'none';
        }
    }
    
    showMessage(message, type) {
        this.messageDiv.innerHTML = `
            <div class="message ${type}">
                ${message}
            </div>
        `;
        
        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                this.messageDiv.innerHTML = '';
            }, 5000);
        }
    }
    
    clearAllValidation() {
        const fields = this.form.querySelectorAll('input');
        const errorElements = this.form.querySelectorAll('.error-message');
        
        fields.forEach(field => {
            field.classList.remove('error', 'success');
        });
        
        errorElements.forEach(element => {
            element.textContent = '';
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new RegisterForm();
});