from flask import Flask, request, jsonify, render_template, redirect, url_for
import mysql.connector
import bcrypt
import re
from datetime import datetime
import os

app = Flask(__name__)

# Konfigurasi database
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'user_auth_db'
}

class Database:
    @staticmethod
    def get_connection():
        """Membuat koneksi ke database"""
        try:
            conn = mysql.connector.connect(**DB_CONFIG)
            return conn
        except mysql.connector.Error as err:
            print(f"❌ Database connection error: {err}")
            return None

    @staticmethod
    def init_db():
        """Inisialisasi database dan tabel"""
        try:
            # Koneksi tanpa database terlebih dahulu
            conn = mysql.connector.connect(
                host=DB_CONFIG['host'],
                user=DB_CONFIG['user'],
                password=DB_CONFIG['password']
            )
            cursor = conn.cursor()
            
            # Buat database jika belum ada
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_CONFIG['database']}")
            cursor.execute(f"USE {DB_CONFIG['database']}")
            
            # Buat tabel users
            create_table_query = """
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama VARCHAR(255) NOT NULL,
                username VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
            cursor.execute(create_table_query)
            
            conn.commit()
            cursor.close()
            conn.close()
            print("✅ Database initialized successfully")
            
        except mysql.connector.Error as err:
            print(f"❌ Database initialization error: {err}")

class Validator:
    @staticmethod
    def validate_register_data(nama, username, password):
        """Validasi data registrasi"""
        errors = []
        
        if not nama or len(nama.strip()) < 2:
            errors.append("Nama harus minimal 2 karakter")
        
        if not username or len(username.strip()) < 3:
            errors.append("Username harus minimal 3 karakter")
        elif not re.match(r'^[a-zA-Z0-9_]+$', username):
            errors.append("Username hanya boleh mengandung huruf, angka, dan underscore")
        
        if not password or len(password) < 6:
            errors.append("Password harus minimal 6 karakter")
        
        return errors

class AuthService:
    @staticmethod
    def hash_password(password):
        """Hash password menggunakan bcrypt"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(12))
    
    @staticmethod
    def register_user(nama, username, password):
        """Registrasi user baru"""
        conn = Database.get_connection()
        if not conn:
            return False, "Koneksi database gagal"
        
        try:
            cursor = conn.cursor()
            
            # Cek apakah username sudah ada
            cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
            if cursor.fetchone():
                return False, "Username sudah digunakan"
            
            # Hash password
            password_hash = AuthService.hash_password(password)
            
            # Insert user baru
            insert_query = "INSERT INTO users (nama, username, password_hash) VALUES (%s, %s, %s)"
            cursor.execute(insert_query, (nama, username, password_hash))
            conn.commit()
            
            user_id = cursor.lastrowid
            return True, f"Registrasi berhasil! User ID: {user_id}"
            
        except mysql.connector.Error as err:
            conn.rollback()
            if err.errno == 1062:
                return False, "Username sudah digunakan"
            return False, f"Database error: {err}"
        finally:
            cursor.close()
            conn.close()

# Routes
@app.route('/')
def home():
    return redirect('/register')

@app.route('/register')
def register_page():
    return render_template('register.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/dashboard')
def dashboard_page():
    return render_template('dashboard.html')

@app.route('/api/register', methods=['POST'])
def api_register():
    """API endpoint untuk registrasi"""
    try:
        # Get data dari request
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Data tidak valid'
            }), 400
        
        nama = data.get('nama', '').strip()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        print(f"📝 Registration attempt: {username}")
        
        # Validasi data
        validation_errors = Validator.validate_register_data(nama, username, password)
        if validation_errors:
            return jsonify({
                'success': False,
                'message': ' | '.join(validation_errors)
            }), 400
        
        # Registrasi user
        success, message = AuthService.register_user(nama, username, password)
        
        if success:
            print(f"✅ Registration successful: {username}")
            return jsonify({
                'success': True,
                'message': 'Registrasi berhasil! Redirecting ke login...'
            })
        else:
            print(f"❌ Registration failed: {message}")
            return jsonify({
                'success': False,
                'message': message
            }), 400
            
    except Exception as e:
        print(f"💥 Server error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Terjadi kesalahan server: {str(e)}'
        }), 500

@app.route('/api/users', methods=['GET'])
def api_get_users():
    """API endpoint untuk mendapatkan daftar users"""
    try:
        conn = Database.get_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, nama, username, created_at FROM users")
        users = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'count': len(users),
            'users': users
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/check-username/<username>')
def api_check_username(username):
    """API endpoint untuk cek ketersediaan username"""
    try:
        conn = Database.get_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
        exists = cursor.fetchone() is not None
        cursor.close()
        conn.close()
        
        return jsonify({
            'available': not exists
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Inisialisasi database
    Database.init_db()
    
    # Jalankan server
    port = 5001
    print(f"🚀 Server running on http://localhost:{port}")
    app.run(debug=True, host='0.0.0.0', port=port)