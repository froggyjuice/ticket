// DOM Elements
const panelLogin = document.getElementById('panel-login');
const panelRegister = document.getElementById('panel-register');
const panelMypage = document.getElementById('panel-mypage');

const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');

const loginNameInput = document.getElementById('login-name');
const loginPhoneInput = document.getElementById('login-phone');
const registerNameInput = document.getElementById('register-name');
const registerPhoneInput = document.getElementById('register-phone');

const goToRegisterLink = document.getElementById('go-to-register');
const goToLoginLink = document.getElementById('go-to-login');

// My Page Elements
const cardUniqueCode = document.getElementById('card-unique-code');
const cardHolderName = document.getElementById('card-holder-name');
const infoName = document.getElementById('info-name');
const infoPhone = document.getElementById('info-phone');
const infoCode = document.getElementById('info-code');
const infoDate = document.getElementById('info-date');

const btnLogout = document.getElementById('btn-logout');
const btnCopyCode = document.getElementById('btn-copy-code');
const toastContainer = document.getElementById('toast-container');

// View Swapper function
function switchView(targetPanel) {
    // Hide all panels
    [panelLogin, panelRegister, panelMypage].forEach(panel => {
        panel.classList.remove('active');
    });
    // Show target panel
    targetPanel.classList.add('active');
}

// Custom Toast Notification System
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-triangle-exclamation';
    
    toast.innerHTML = `
        <i class="fa-solid ${iconClass} toast-icon"></i>
        <span class="toast-message">${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 50);
    
    // Auto-remove
    setTimeout(() => {
        toast.classList.remove('show');
        // Wait for slide-out transition to complete
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    }, 3000);
}

// Auto-format Phone Number (010-XXXX-XXXX)
function formatPhoneNumber(value) {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 8) {
        return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`;
    }
    return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 7)}-${phoneNumber.slice(7, 11)}`;
}

// Bind format handler to input elements
[loginPhoneInput, registerPhoneInput].forEach(input => {
    input.addEventListener('input', (e) => {
        const target = e.target;
        const formattedVal = formatPhoneNumber(target.value);
        target.value = formattedVal;
    });
});

// Database helpers (using LocalStorage)
function getUsers() {
    const users = localStorage.getItem('users');
    return users ? JSON.parse(users) : [];
}

function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}

// 5-Digit Unique Random Code Generator (10000 - 99999)
function generateUniqueCode(existingUsers) {
    const existingCodes = new Set(existingUsers.map(user => user.code));
    let code;
    let attempts = 0;
    
    do {
        // Generate random number between 10000 and 99999
        code = Math.floor(10000 + Math.random() * 90000).toString();
        attempts++;
        // Safety valve to prevent infinite loop in extreme scenario
        if (attempts > 10000) {
            throw new Error("고유번호 생성 용량이 한계에 도달했습니다.");
        }
    } while (existingCodes.has(code));
    
    return code;
}

// Registration Form Submission Handler
formRegister.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = registerNameInput.value.trim();
    const phone = registerPhoneInput.value.trim();
    
    // Validate phone pattern
    const phoneRegex = /^010-\d{3,4}-\d{4}$/;
    if (!phoneRegex.test(phone)) {
        showToast('올바른 전화번호 형식(010-0000-0000)을 입력하세요.', 'error');
        return;
    }
    
    const users = getUsers();
    
    // Check if phone number already exists
    const duplicateUser = users.find(u => u.phone === phone);
    if (duplicateUser) {
        showToast('이미 등록된 전화번호입니다.', 'error');
        return;
    }
    
    try {
        // Generate unique 5 digit code
        const code = generateUniqueCode(users);
        
        // Create new user object
        const newUser = {
            name,
            phone,
            code,
            date: new Date().toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        };
        
        // Push and Save
        users.push(newUser);
        saveUsers(users);
        
        showToast('회원가입이 완료되었습니다!', 'success');
        
        // Auto-login registered user for seamless UX
        loginUser(newUser);
        
        // Clear inputs
        formRegister.reset();
        
    } catch (err) {
        showToast(err.message, 'error');
    }
});

// Login Form Submission Handler
formLogin.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = loginNameInput.value.trim();
    const phone = loginPhoneInput.value.trim();
    
    const users = getUsers();
    
    // Find matching user
    const user = users.find(u => u.name === name && u.phone === phone);
    
    if (user) {
        loginUser(user);
        formLogin.reset();
    } else {
        showToast('일치하는 회원 정보가 존재하지 않습니다.', 'error');
    }
});

// Login process implementation
function loginUser(user) {
    // Save state in SessionStorage
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    
    // Render Dashboard
    renderMyPage(user);
    
    // Switch to Dashboard View
    switchView(panelMypage);
    showToast(`${user.name}님, 환영합니다!`, 'success');
}

// Render Dashboard Data
function renderMyPage(user) {
    cardUniqueCode.textContent = user.code;
    cardHolderName.textContent = user.name.toUpperCase();
    
    infoName.textContent = user.name;
    infoPhone.textContent = user.phone;
    infoCode.textContent = user.code;
    infoDate.textContent = user.date;
}

// Logout Action Handler
btnLogout.addEventListener('click', () => {
    sessionStorage.removeItem('currentUser');
    switchView(panelLogin);
    showToast('로그아웃되었습니다.', 'info');
});

// Switch panels listeners
goToRegisterLink.addEventListener('click', () => {
    formLogin.reset();
    switchView(panelRegister);
});

goToLoginLink.addEventListener('click', () => {
    formRegister.reset();
    switchView(panelLogin);
});

// Copy unique code functionality
btnCopyCode.addEventListener('click', () => {
    const code = cardUniqueCode.textContent;
    navigator.clipboard.writeText(code)
        .then(() => {
            showToast('고유번호가 클립보드에 복사되었습니다!', 'success');
        })
        .catch(() => {
            showToast('복사에 실패했습니다.', 'error');
        });
});

// 3D Card Hover Tilt Interaction
const vipCard = document.querySelector('.vip-card');
if (vipCard) {
    const container = document.querySelector('.vip-card-container');
    
    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        // Mouse coordinates relative to card element
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Calculate tilt percentages (-1 to 1)
        const tiltX = ((y / rect.height) - 0.5) * -15; // Max 15deg tilt
        const tiltY = ((x / rect.width) - 0.5) * 15;
        
        vipCard.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.03)`;
        
        // Custom variables for card sheen overlay positioning
        const pctX = (x / rect.width) * 100;
        const pctY = (y / rect.height) * 100;
        vipCard.style.setProperty('--sheen-x', `${pctX}%`);
        vipCard.style.setProperty('--sheen-y', `${pctY}%`);
    });
    
    container.addEventListener('mouseleave', () => {
        // Reset tilt style smoothly
        vipCard.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
    });
}

// Initial Session check on Page Load
window.addEventListener('DOMContentLoaded', () => {
    const activeSession = sessionStorage.getItem('currentUser');
    if (activeSession) {
        const user = JSON.parse(activeSession);
        renderMyPage(user);
        switchView(panelMypage);
    } else {
        switchView(panelLogin);
    }
});
