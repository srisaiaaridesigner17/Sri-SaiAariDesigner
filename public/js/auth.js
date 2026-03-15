// auth.js - Customer Authentication Logic

function getCustomers() {
    return JSON.parse(localStorage.getItem('customers')) || [];
}

function saveCustomers(customers) {
    localStorage.setItem('customers', JSON.stringify(customers));
}

function showMessage(elementId, msg, type) {
    const el = document.getElementById(elementId);
    el.textContent = msg;
    el.className = `message-box ${type}-msg`;
    el.style.display = 'block';
    setTimeout(() => {
        el.style.display = 'none';
    }, 5000);
}

function toggleSection(sectionId) {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('signup-section').style.display = 'none';
    document.getElementById('forgot-section').style.display = 'none';
    
    document.getElementById(`${sectionId}-section`).style.display = 'block';
}

function processLogin(user) {
    localStorage.setItem('userToken', 'user-token-' + Date.now());
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    // Check for redirect url
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect') || 'index.html';
    
    window.location.href = redirect;
}

// Simulated Google Sign In
function signInWithGoogle() {
    const mockGoogleUser = {
        name: 'Google User',
        email: 'user@google.com',
        phone: ''
    };
    
    let customers = getCustomers();
    const existing = customers.find(c => c.email === mockGoogleUser.email);
    
    if (!existing) {
        customers.push({ ...mockGoogleUser, password: 'google_oauth_mock' });
        saveCustomers(customers);
    }
    
    processLogin(mockGoogleUser);
}

// Setup Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    
    // Redirect if already logged in
    if (localStorage.getItem('userToken') && window.location.pathname.endsWith('login.html')) {
        window.location.href = 'index.html';
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;
            
            const customers = getCustomers();
            const user = customers.find(c => c.email === email && c.password === pass);
            
            if (user) {
                processLogin(user);
            } else {
                showMessage('login-msg', 'Invalid email or password.', 'error');
            }
        });
    }

    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const phone = document.getElementById('signup-phone').value;
            const pass = document.getElementById('signup-password').value;
            
            const customers = getCustomers();
            
            if (customers.some(c => c.email === email)) {
                showMessage('signup-msg', 'An account with this email already exists.', 'error');
                return;
            }
            
            const newUser = { name, email, phone, password: pass };
            customers.push(newUser);
            saveCustomers(customers);
            
            processLogin(newUser);
        });
    }

    const forgotForm = document.getElementById('forgot-form');
    if (forgotForm) {
        forgotForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('forgot-email').value;
            const customers = getCustomers();
            
            if (customers.some(c => c.email === email)) {
                showMessage('forgot-msg', 'A password reset link has been sent to your email.', 'success');
                setTimeout(() => toggleSection('login'), 3000);
            } else {
                showMessage('forgot-msg', 'Email not found in our records.', 'error');
            }
        });
    }
});
