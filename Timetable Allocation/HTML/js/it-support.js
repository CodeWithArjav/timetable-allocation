function checkAndInitITSupport() {
  if (document.getElementById('itSupportContent')) {
    const refreshBtn = document.getElementById('refreshPending');
    if (refreshBtn) refreshBtn.addEventListener('click', loadPendingRequests);
    loadPendingRequests();
    loadAllUsers();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkAndInitITSupport);
} else {
  checkAndInitITSupport();
}

// Delegated click handling for Approve / Reject / Revoke buttons.
// Inline onclick="..." attributes are blocked by the page's CSP
// (script-src 'self'), so handlers must be attached from JS.
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  switch (btn.dataset.action) {
    case 'approve': approveUser(id); break;
    case 'reject': rejectUser(id); break;
    case 'revoke': revokeApproval(id); break;
  }
});

function loadPendingRequests() {
  const tbody = document.getElementById('pendingBody');
  if (!tbody) return;
  const pending = StorageService.getPendingRequests().filter(r => r.status === 'pending');
  const pendingCount = document.getElementById('pendingCount');
  if (pendingCount) pendingCount.textContent = pending.length;

  if (pending.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">
      <div class="empty-state">
        <div class="empty-icon">🎉</div>
        <p>No pending requests. All caught up!</p>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = pending.map(r => `
    <tr>
      <td><strong>${escapeHtml(r.name)}</strong></td>
      <td>${escapeHtml(r.email)}</td>
      <td><span class="badge badge-lecture">${escapeHtml(r.department)}</span></td>
      <td><span class="badge badge-ok">${escapeHtml(r.role)}</span></td>
      <td>${new Date(r.requestedAt).toLocaleDateString()}</td>
      <td class="actions-cell">
        <button class="btn btn-sm btn-success" data-action="approve" data-id="${r.userId}">✅ Approve</button>
        <button class="btn btn-sm btn-danger" data-action="reject" data-id="${r.userId}">❌ Reject</button>
      </td>
    </tr>
  `).join('');
}

function loadAllUsers() {
  const tbody = document.getElementById('allUsersBody');
  if (!tbody) return;
  const users = StorageService.getUsers();
  const userCount = document.getElementById('userCount');
  if (userCount) userCount.textContent = users.length;
  const approvedCount = document.getElementById('approvedCount');
  if (approvedCount) approvedCount.textContent = users.filter(u => u.approved).length;

  tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong>${escapeHtml(u.name)}</strong></td>
      <td>${escapeHtml(u.email)}</td>
      <td><span class="badge badge-lecture">${escapeHtml(u.department || '-')}</span></td>
      <td><span class="badge badge-ok">${escapeHtml(u.role)}</span></td>
      <td>
        <span class="badge ${u.approved ? 'badge-ok' : 'badge-warning'}">
          ${u.approved ? '✓ Approved' : '⏳ Pending'}
        </span>
      </td>
      <td class="actions-cell">
        ${!u.approved
          ? `<button class="btn btn-sm btn-success" data-action="approve" data-id="${u.id}">✅ Approve</button>`
          : `<button class="btn btn-sm btn-ghost" data-action="revoke" data-id="${u.id}" style="color:var(--warning)">⛔ Revoke</button>`}
      </td>
    </tr>
  `).join('');
}

function approveUser(userId) {
  const users = StorageService.getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return;

  user.approved = true;
  StorageService.saveUsers(users);
  const pending = StorageService.getPendingRequests();
  const req = pending.find(r => r.userId === userId);

  if (req) {
    req.status = 'approved';
    StorageService.savePendingRequests(pending);
  }

  showToast(`${user.name}'s account approved! 🎉`, 'success');
  loadPendingRequests();
  loadAllUsers();
}

function rejectUser(userId) {
  const users = StorageService.getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return;
  if (!confirm(`Reject account for ${user.name} (${user.email})?`)) return;
  const updated = users.filter(u => u.id !== userId);
  StorageService.saveUsers(updated);
  const pending = StorageService.getPendingRequests();
  const req = pending.find(r => r.userId === userId);

  if (req) {
    req.status = 'rejected';
    StorageService.savePendingRequests(pending);
  }

  showToast(`Account for ${user.name} rejected.`, 'warning');
  loadPendingRequests();
  loadAllUsers();
}

function revokeApproval(userId) {
  const users = StorageService.getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return;
  if (!confirm(`Revoke approval for ${user.name}? They will lose access.`)) return;
  user.approved = false;
  StorageService.saveUsers(users);
  const pending = StorageService.getPendingRequests();

  pending.push({
    userId: user.id, name: user.name, email: user.email,
    department: user.department, role: user.role,
    requestedAt: new Date().toISOString(), status: 'pending'
  });

  StorageService.savePendingRequests(pending);

  showToast(`Approval revoked for ${user.name}.`, 'warning');
  loadPendingRequests();
  loadAllUsers();
}


function registerFacultyByIT() {
  const nameInput = document.getElementById('itFacultyName');
  const emailInput = document.getElementById('itFacultyEmail');
  const deptInput = document.getElementById('itFacultyDept');
  const courseInput = document.getElementById('itFacultyCourse');
  const roomInput = document.getElementById('itFacultyRoom');
  const dayInput = document.getElementById('itFacultyDay');
  const timeInput = document.getElementById('itFacultyTime');
  const divInput = document.getElementById('itFacultyDivision');

  const name = nameInput?.value.trim();
  const email = emailInput?.value.trim().toLowerCase();
  const department = deptInput?.value;
  const course = courseInput?.value.trim();
  const room = roomInput?.value;
  const day = dayInput?.value;
  const time = timeInput?.value;
  const division = divInput?.value || 'Division A';

  if (!name || !email || !department || !course || !room || !day || !time) {
    showToast('Please fill in all required faculty and schedule details.', 'error');
    return;
  }

  if (typeof FACULTY !== 'undefined' && !FACULTY.includes(name)) {
    FACULTY.unshift(name);
  }

  const users = StorageService.getUsers();
  let user = users.find(u => u.email.toLowerCase() === email);
  if (!user) {
    const { salt, hash } = Security.hashPassword('faculty123');
    user = {
      id: users.length ? Math.max(...users.map(u => u.id)) + 1 : 1,
      name,
      email,
      salt,
      password: hash, // salted + stretched hash, never plaintext
      role: 'faculty',
      department,
      approved: true,
      createdAt: new Date().toISOString()
    };
    users.push(user);
    StorageService.saveUsers(users);
  } else {
    user.approved = true;
    user.department = department;
    StorageService.saveUsers(users);
  }

  const schedules = StorageService.getSchedules();
  const newSchedule = {
    id: getNextId(schedules),
    department,
    course,
    faculty: name,
    room,
    day,
    time,
    type: 'Lecture',
    division,
    semester: 1
  };

  schedules.push(newSchedule);
  StorageService.saveSchedules(schedules);

  if (nameInput) nameInput.value = '';
  if (emailInput) emailInput.value = '';
  if (courseInput) courseInput.value = '';

  showToast(`Registered ${name} and auto-allocated ${course} (${room} - ${day} ${time})! 🎉`, 'success');

  loadAllUsers();
  loadPendingRequests();
}
