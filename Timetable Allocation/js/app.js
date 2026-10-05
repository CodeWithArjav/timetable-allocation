document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSidebar();
  initTopbar();
  initAuthGuard();
  initToasts();
  updateUserBadges();
  initBrandHeaderLink();
  initUserProfileModal();
});

function initTheme() {
  const saved = StorageService.getTheme();
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  StorageService.setTheme(next);
  const btn = document.querySelector('.theme-toggle');
  if (btn) btn.textContent = next === 'dark' ? '🌙' : '☀️';
}

function initSidebar() {
  const toggle = document.querySelector('.menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (toggle && sidebar) {
    toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  }

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item').forEach(item => {
    const href = item.getAttribute('href');
    if (href === currentPage) {
      item.classList.add('active');
    }
  });
}

function initTopbar() {
  const themeBtn = document.querySelector('.theme-toggle');
  if (themeBtn) {
    const current = document.documentElement.getAttribute('data-theme');
    themeBtn.textContent = current === 'dark' ? '🌙' : '☀️';
    themeBtn.addEventListener('click', toggleTheme);
  }
  const logoutBtn = document.querySelector('.logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logoutUser();
    });
  }
}

function initAuthGuard() {
  // Session validator: must live here (not auth.js) because auth.js is only
  // loaded on login/signup pages, while this guard runs on every page.
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

  // Pages that require login
  const protectedPages = ['dashboard.html', 'schedule.html', 'chat.html'];
  // Pages only IT Support / Admin may open
  const adminOnlyPages = ['it-support.html'];
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  if (protectedPages.includes(currentPage)) {
    const user = validateSession(); // checks expiry, signature and device binding
    if (!user) {
      showToast('Please login to access this page.', 'warning');
      setTimeout(() => { window.location.href = 'index.html'; }, 800);
    } else if (!user.approved) {
      showToast('Your account is still pending approval.', 'warning');
      StorageService.clearSession();
      setTimeout(() => { window.location.href = 'index.html'; }, 800);
    }
  }

  if (adminOnlyPages.includes(currentPage)) {
    const user = validateSession();
    const allowed = user && (user.role === 'admin' || user.role === 'it');
    if (!allowed) {
      showToast('Access denied: this area requires IT Support or Admin privileges.', 'error');
      setTimeout(() => { window.location.href = user ? 'dashboard.html' : 'index.html'; }, 900);
    }
  }

  if (currentPage === 'index.html' || currentPage === 'signup.html') {
    const user = StorageService.getSession();
    if (user && user.approved) {
      // setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
    }
  }
}

function initBrandHeaderLink() {
  const brandEl = document.querySelector('.sidebar .brand');
  if (brandEl) {
    brandEl.style.cursor = 'pointer';
    brandEl.title = 'Click to return to Dashboard';
    brandEl.addEventListener('click', () => {
      window.location.href = 'dashboard.html';
    });
  }
}

function initUserProfileModal() {
  // Inject profile modal into body if not present
  if (!document.getElementById('profileModal')) {
    const modalHtml = `
      <div class="modal-overlay" id="profileModal">
        <div class="modal medium">
          <div class="modal-header">
            <h3>👤 User Profile & Account Details</h3>
            <button class="modal-close" onclick="closeModal('profileModal')">✕</button>
          </div>
          <div class="modal-body" style="padding:20px">
            <div class="profile-card-header">
              <div class="profile-avatar-lg" id="profileInitials">U</div>
              <h3 id="profileName" style="font-size:18px;margin-bottom:4px">User Name</h3>
              <span id="profileRoleBadge" class="badge badge-ok">Faculty</span>
            </div>

            <div class="profile-info-grid">
              <div class="profile-info-item">
                <label>College Email</label>
                <div id="profileEmail">user@college.edu</div>
              </div>
              <div class="profile-info-item">
                <label>Department</label>
                <div id="profileDept">BCA</div>
              </div>
              <div class="profile-info-item">
                <label>Account Status</label>
                <div id="profileStatus" style="color:var(--success)">🟢 Approved & Active</div>
              </div>
              <div class="profile-info-item">
                <label>Assigned Classes</label>
                <div id="profileClasses">0 Sessions</div>
              </div>
            </div>

            <div style="background:var(--bg-hover);padding:12px;border-radius:8px;border:1px solid var(--border);font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:8px">
              <span>🛡️</span> <b>Session Security:</b> Logged in via <b>IT-Approved Encrypted Session</b> (AES-256 local storage).
            </div>
          </div>
          <div class="modal-footer" style="justify-content:space-between">
            <button type="button" class="btn btn-danger" onclick="logoutUser()">🚪 Logout</button>
            <button type="button" class="btn btn-primary" onclick="closeModal('profileModal')">Close Profile</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  // Bind click listeners to user profile triggers
  document.querySelectorAll('.user-mini, .user-avatar').forEach(el => {
    el.style.cursor = 'pointer';
    el.title = 'Click to view profile details';
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openUserProfileModal();
    });
  });
}

function openUserProfileModal() {
  const user = StorageService.getSession();
  if (!user) return; // never render a profile without a real session
  const allSchedules = StorageService.getSchedules() || [];

  // Count schedules for this faculty / department
  const assignedCount = allSchedules.filter(s =>
    (s.faculty && user.name && (s.faculty.toLowerCase().includes(user.name.toLowerCase()) || user.name.toLowerCase().includes(s.faculty.toLowerCase()))) ||
    s.department === user.department
  ).length;

  const initials = (user.name || 'User').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const pInitials = document.getElementById('profileInitials');
  const pName = document.getElementById('profileName');
  const pRoleBadge = document.getElementById('profileRoleBadge');
  const pEmail = document.getElementById('profileEmail');
  const pDept = document.getElementById('profileDept');
  const pStatus = document.getElementById('profileStatus');
  const pClasses = document.getElementById('profileClasses');

  if (pInitials) pInitials.textContent = initials;
  if (pName) pName.textContent = user.name || 'User Name';
  if (pRoleBadge) pRoleBadge.textContent = `${(user.role || 'faculty').toUpperCase()}`;
  if (pEmail) pEmail.textContent = user.email || 'user@college.edu';
  if (pDept) pDept.textContent = user.department || 'BCA';
  if (pStatus) pStatus.innerHTML = user.approved ? `<span style="color:var(--success)">🟢 Approved & Active</span>` : `<span style="color:var(--warning)">⏳ Pending Approval</span>`;
  if (pClasses) pClasses.textContent = `${assignedCount} Active Classes`;

  openModal('profileModal');
}

function initToasts() {
  if (!document.querySelector('.toast-container')) {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
}

function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: '💡' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 350);
  }, 3200);
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      e.target.classList.remove('show');
      document.body.style.overflow = '';
    }
    if (e.target.classList.contains('modal-close')) {
      const modal = e.target.closest('.modal-overlay');
      if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
      }
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.show').forEach(m => {
        m.classList.remove('show');
        document.body.style.overflow = '';
      });
    }
  });
});



function updateUserBadges() {
  const user = StorageService.getSession();
  const nameEls = document.querySelectorAll('.user-name, .welcome-user, .u-name');
  const roleEls = document.querySelectorAll('.u-role');
  const avatarEls = document.querySelectorAll('.avatar, .user-avatar');
  const initialsEls = document.querySelectorAll('.avatar-initials');

  if (user) {
    nameEls.forEach(el => { el.textContent = user.name; });
    roleEls.forEach(el => { el.textContent = `${user.role.toUpperCase()} • ${user.department || ''}`; });
    const initials = user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    avatarEls.forEach(el => { el.textContent = initials; });
    initialsEls.forEach(el => { el.textContent = initials; });
  } else {
    nameEls.forEach(el => { el.textContent = 'Guest'; });
    roleEls.forEach(el => { el.textContent = 'NOT LOGGED IN'; });
  }
}
