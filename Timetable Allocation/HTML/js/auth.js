// ============ SECURITY-HARDENED AUTH ============
// Salted + iterated password hashing (security.js), persistent
// brute-force lockout, strong password policy, signed sessions.

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  if (signupForm) {
    signupForm.addEventListener('submit', handleSignup);
  }

  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('input');
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      btn.textContent = isHidden ? '🙈' : '👁️';
    });
  });

  const setupDemoButton = (btnId, demoEmail, demoPassword, toastMsg) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', () => {
      const email = document.getElementById('loginEmail');
      const password = document.getElementById('loginPassword');
      if (email && password) {
        email.value = demoEmail;
        password.value = demoPassword;
      }

      // Automatically authenticate demo user without requiring approval
      let users = StorageService.getUsers();
      let demoUser = users.find(u => u.email.toLowerCase() === demoEmail);

      if (!demoUser) {
        const { salt, hash } = Security.hashPassword(demoPassword);
        demoUser = {
          id: demoEmail === 'admin@college.edu' ? 1 : 3,
          name: demoEmail === 'admin@college.edu' ? 'Dr. Rajesh Kumar' : 'IT Support',
          email: demoEmail,
          salt: salt,
          password: hash,
          role: demoEmail === 'admin@college.edu' ? 'admin' : 'it',
          department: demoEmail === 'admin@college.edu' ? 'BCA' : 'MCA',
          approved: true
        };
        users.push(demoUser);
      } else if (!demoUser.salt) {
        // Migrate legacy plaintext demo password to hashed form
        const { salt, hash } = Security.hashPassword(demoPassword);
        demoUser.salt = salt;
        demoUser.password = hash;
      }
      StorageService.saveUsers(users);

      StorageService.setSession(demoUser);
      showToast(toastMsg, 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
    });
  };

  setupDemoButton('demoLogin', 'admin@college.edu', 'admin123',
    '⚡ Logging in as Demo Admin (Auto-Approved)...');
  setupDemoButton('demoITLogin', 'support@college.edu', 'support123',
    '🛠️ Logging in as IT Support Demo (Full Control)...');
});

// --- Persistent brute-force lockout (survives page reload) ---
const LOCKOUT_STORAGE_KEY = 'tt_lockout_state_v1';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000; // 1 minute escalating lock

function getLockState() {
  try {
    const raw = localStorage.getItem(LOCKOUT_STORAGE_KEY);
    if (!raw) return { attempts: 0, until: 0 };
    const state = JSON.parse(raw);
    if (Date.now() > state.until) return { attempts: state.attempts || 0, until: 0 };
    return state;
  } catch (e) {
    return { attempts: 0, until: 0 };
  }
}

function saveLockState(state) {
  try {
    localStorage.setItem(LOCKOUT_STORAGE_KEY, JSON.stringify(state));
  } catch (e) { /* ignore */ }
}

function registerFailedAttempt() {
  const state = getLockState();
  state.attempts = (state.attempts || 0) + 1;
  if (state.attempts >= MAX_ATTEMPTS) {
    // escalating: each lockout doubles the wait
    const locks = Math.floor(state.attempts / MAX_ATTEMPTS) + 1;
    state.until = Date.now() + LOCKOUT_MS * Math.pow(2, locks - 1);
    state.attempts = 0;
  }
  saveLockState(state);
  return state;
}

function clearLockState() {
  localStorage.removeItem(LOCKOUT_STORAGE_KEY);
}

function validateSession() {
  const session = StorageService.getSession();
  if (!session) return null;
  const fp = Security.deviceFingerprint();
  if (session.fp !== fp) {
    StorageService.clearSession();
    showToast('Session security check failed. Please log in again.', 'error');
    return null;
  }
  return session;
}

function handleLogin(e) {
  e.preventDefault();

  const lock = getLockState();
  if (Date.now() < lock.until) {
    const remainingSecs = Math.ceil((lock.until - Date.now()) / 1000);
    showToast(`Too many failed attempts. Security lock active. Try again in ${remainingSecs}s.`, 'error');
    return;
  }

  const rawEmail = document.getElementById('loginEmail').value;
  const rawPassword = document.getElementById('loginPassword').value;

  // normalize only — never mutate credentials through escapeHtml
  const email = rawEmail.trim().toLowerCase();
  const password = rawPassword;

  const emailInput = document.getElementById('loginEmail');
  const passInput = document.getElementById('loginPassword');

  let valid = true;
  clearErrors();

  if (!email || !isValidEmail(email)) {
    setError(emailInput, 'Please enter a valid college email address.');
    valid = false;
  }
  if (!password) {
    setError(passInput, 'Password is required.');
    valid = false;
  }
  if (!valid) return;

  const users = StorageService.getUsers();
  const user = users.find(u => String(u.email || '').toLowerCase() === email);

  // Verify against salted, iterated hash — never a plaintext comparison
  const passwordOk = user && user.salt
    ? Security.verifyPassword(rawPassword, user.salt, user.password)
    : false;

  if (!user || !passwordOk) {
    const state = registerFailedAttempt();
    if (Date.now() < state.until) {
      showToast('Too many invalid login attempts. Account locked temporarily for security.', 'error');
    } else {
      showToast(`Invalid email or password. Attempt ${state.attempts || 1} of ${MAX_ATTEMPTS}.`, 'error');
    }
    passInput.classList.add('error');
    passInput.value = '';
    passInput.focus();
    return;
  }

  clearLockState();

  if (!user.approved) {
    showToast('Account pending IT Support Team approval. Contact support@college.edu if urgent.', 'warning');
    return;
  }

  StorageService.setSession(user);
  showToast(`Authenticated safely. Welcome back, ${escapeHtml(user.name)}! 🔐`, 'success');
  setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
}

function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim().toLowerCase();
  const department = document.getElementById('signupDepartment').value;
  const role = document.getElementById('signupRole').value;
  const password = document.getElementById('signupPassword').value;
  const confirm = document.getElementById('signupConfirm').value;

  clearErrors();
  let valid = true;

  const nameInput = document.getElementById('signupName');
  const emailInput = document.getElementById('signupEmail');
  const passInput = document.getElementById('signupPassword');
  const confirmInput = document.getElementById('signupConfirm');

  if (name.length < 3) { setError(nameInput, 'Name must be at least 3 characters.'); valid = false; }
  if (!isValidEmail(email)) { setError(emailInput, 'Please enter a valid email address.'); valid = false; }
  if (password.length < 8) {
    setError(passInput, 'Password must be at least 8 characters long.');
    valid = false;
  } else {
    const checks = [
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password)
    ];
    if (checks.filter(Boolean).length < 3) {
      setError(passInput, 'Use at least 8 characters mixing 3 of: lowercase, uppercase, numbers, symbols.');
      valid = false;
    }
    // Reject the most common leaked passwords
    const weak = ['password', '12345678', 'qwerty123', 'letmein12', 'iloveyou1'];
    if (weak.some(w => password.toLowerCase().includes(w.replace(/[0-9]/g, '')) && password.length < 10)) {
      setError(passInput, 'This password is too common. Choose something unique.');
      valid = false;
    }
  }
  if (confirm !== password) { setError(confirmInput, 'Passwords do not match.'); valid = false; }
  if (!valid) return;

  const users = StorageService.getUsers();
  if (users.some(u => u.email.toLowerCase() === email)) {
    setError(emailInput, 'This college email is already registered.');
    return;
  }

  const { salt: pwSalt, hash: pwHash } = Security.hashPassword(password);
  const newUser = {
    id: users.length ? Math.max(...users.map(u => u.id)) + 1 : 1,
    name: escapeHtml(name),
    email: escapeHtml(email),
    salt: pwSalt,
    password: pwHash, // salted + stretched hash, never plaintext
    role: role || 'faculty',
    department: escapeHtml(department),
    approved: false,
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  StorageService.saveUsers(users);

  const pending = StorageService.getPendingRequests();
  pending.push({
    userId: newUser.id,
    name: newUser.name,
    email: newUser.email,
    department: newUser.department,
    role: newUser.role,
    requestedAt: new Date().toISOString(),
    status: 'pending'
  });
  StorageService.savePendingRequests(pending);

  showToast('Account requested securely! IT Support Team will approve your request. 📩', 'success');
  setTimeout(() => { window.location.href = 'index.html'; }, 1400);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setError(input, msg) {
  input.classList.add('error');
  input.classList.remove('success');
  const wrapper = input.closest('.form-group');
  if (wrapper) {
    const errEl = wrapper.querySelector('.field-error');
    if (errEl) {
      errEl.textContent = msg;
      errEl.style.display = 'block';
    }
  }
}

function clearErrors() {
  document.querySelectorAll('.field-error').forEach(el => { el.style.display = 'none'; });
  document.querySelectorAll('.form-control.error').forEach(el => el.classList.remove('error'));
}


document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.form-control').forEach(input => {
    input.addEventListener('blur', () => {
      if (input.value.trim() !== '') {
        input.classList.remove('error');
        input.classList.add('success');
      } else {
        input.classList.remove('success');
      }
    });
  });
});

