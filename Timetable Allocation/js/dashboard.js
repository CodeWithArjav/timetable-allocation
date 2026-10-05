function checkAndInitDashboard() {
  if (document.getElementById('dashboardContent')) {
    initDashboard();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkAndInitDashboard);
} else {
  checkAndInitDashboard();
}

function initDashboard() {
  populateDashboard();
  renderWeeklySnapshot();
  renderRecentlyViewed();
  populateQuickActions();
}

function populateDashboard() {
  const all = StorageService.getSchedules();
  const user = StorageService.getSession();
  const nameEl = document.getElementById('dashboardUserName');

  if (nameEl && user) {
    nameEl.textContent = user.name;
  }

  const dateEl = document.getElementById('todayDate');
  if (dateEl) dateEl.textContent = formatDate();
  const totalEl = document.getElementById('statTotal');
  if (totalEl) totalEl.textContent = all.length;
  const facultyEl = document.getElementById('statFaculty');
  if (facultyEl) facultyEl.textContent = new Set(all.map(s => s.faculty)).size;
  const roomsEl = document.getElementById('statRooms');
  if (roomsEl) roomsEl.textContent = new Set(all.map(s => s.room)).size;
  const deptsEl = document.getElementById('statDepts');
  if (deptsEl) deptsEl.textContent = new Set(all.map(s => s.department)).size;
  const today = getTodayName();
  const todayEl = document.getElementById('statToday');
  if (todayEl) todayEl.textContent = `Today: ${all.filter(s => s.day === today).length}`;
}

function getTodayName() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

function renderWeeklySnapshot() {
  const container = document.getElementById('weeklySnapshot');
  if (!container) return;
  const all = StorageService.getSchedules();
  const dayCounts = DAYS.map(day => ({
    day,
    count: all.filter(s => s.day === day).length
  }));

  const max = Math.max(...dayCounts.map(d => d.count), 1);
  const today = getTodayName();
  container.innerHTML = dayCounts.map(d => `
    <div style="text-align:center;flex:1">
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;font-weight:600">
        ${d.day.substring(0, 3)}${d.day === today ? ' 🎯' : ''}
      </div>
      <div style="height:130px;background:var(--bg-card);border-radius:10px;display:flex;align-items:flex-end;justify-content:center;overflow:hidden;border:1px solid var(--border)">
        <div style="width:70%;background:${d.day === today ? 'var(--gradient-warning)' : 'var(--gradient-primary)'};height:${(d.count / max) * 100}%;min-height:${d.count > 0 ? '12px' : '2px'};border-radius:8px 8px 0 0;transition:height 1s ease" title="${d.day}: ${d.count} classes"></div>
      </div>
      <div style="font-size:14px;font-weight:700;margin-top:6px">${d.count}</div>
    </div>
  `).join('');
}

function renderConflictAlerts() {
  const container = document.getElementById('conflictAlerts');
  if (!container) return;
  const all = StorageService.getSchedules();
  const conflicts = [];
  const roomMap = {};
  const facultyMap = {};
  all.forEach(s => {
    const rk = `${s.day}|${s.time}|${s.room}`;
    const fk = `${s.day}|${s.time}|${s.faculty}`;
    if (!roomMap[rk]) roomMap[rk] = [];
    if (!facultyMap[fk]) facultyMap[fk] = [];
    roomMap[rk].push(s);
    facultyMap[fk].push(s);
  });

  Object.values(roomMap).forEach(g => { if (g.length > 1) conflicts.push({ type: 'Room', items: g }); });
  Object.values(facultyMap).forEach(g => { if (g.length > 1) conflicts.push({ type: 'Faculty', items: g }); });

  if (conflicts.length === 0) {
    container.innerHTML = `<div style="display:flex;align-items:center;gap:12px;padding:14px;border-radius:12px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);color:var(--success)">
      <span style="font-size:22px">🎉</span>
      <div>
        <b>All Clear!</b>
        <div style="font-size:12px;opacity:0.9">No scheduling conflicts detected in the current timetable.</div>
      </div>
    </div>`;
    return;
  }

  container.innerHTML = conflicts.slice(0, 4).map((c, i) => `
    <div style="display:flex;align-items:center;gap:12px;padding:13px 15px;border-radius:12px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);margin-bottom:10px">
      <span style="font-size:20px">${c.type === 'Room' ? '🏫' : '👤'}</span>
      <div style="flex:1">
        <b style="font-size:13px">${c.type} Conflict — ${c.items[0].day} ${c.items[0].time}</b>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">
          ${c.items.map(s => `${s.course} (${s.faculty})`).join(' <b style="color:var(--danger)">vs</b> ')}
        </div>
      </div>
      <span class="badge badge-conflict">⚠️</span>
    </div>
  `).join('');

  if (conflicts.length > 4) {
    container.insertAdjacentHTML('beforeend', `<div style="text-align:center;font-size:12.5px;color:var(--text-muted)">+${conflicts.length - 4} more conflicts. <a href="schedule.html" style="color:var(--accent-light)">View schedule →</a></div>`);
  }
}

function populateQuickActions() {
  const container = document.getElementById('quickActions');
  if (!container) return;

  const actions = [
    { icon: '📡', label: 'Scan Empty Rooms', href: 'schedule.html', color: 'var(--gradient-primary)' },
    { icon: '➕', label: 'Add Schedule', href: 'schedule.html', color: 'var(--gradient-success)' },
    { icon: '🤖', label: 'AI Assistant', href: 'chat.html', color: 'var(--gradient-info)' }
  ];

  container.innerHTML = actions.map(a => `
    <a href="${a.href}" style="text-decoration:none;color:inherit">
      <div class="card" style="text-align:center;padding:20px;cursor:pointer">
        <div style="font-size:30px;margin-bottom:10px">${a.icon}</div>
        <div style="font-weight:600;font-size:13.5px">${a.label}</div>
      </div>
    </a>
  `).join('');
}



function renderRecentlyViewed() {
  const container = document.getElementById('recentlyViewedList');
  if (!container) return;
  const all = StorageService.getSchedules();

  if (all.length === 0) {
    container.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted)">No schedules found. <a href="schedule.html" style="color:var(--accent-light)">Add a schedule →</a></div>`;
    return;
  }

  // Show the 5 most recently added or updated schedules
  const recent = all.slice().reverse().slice(0, 5);

  container.innerHTML = recent.map(s => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:10px;background:var(--bg-hover);border:1px solid var(--border);margin-bottom:10px;gap:10px">
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px">
          <b style="font-size:13.5px;color:var(--text-primary)">${escapeHtml(s.course)}</b>
          <span class="badge ${s.type === 'Lab' ? 'badge-lab' : 'badge-lecture'}" style="font-size:10px">${escapeHtml(s.type)}</span>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:3px">
          ${escapeHtml(s.faculty)} • <b>${escapeHtml(s.room)}</b> • ${escapeHtml(s.division || s.section || 'Division A')}
        </div>
      </div>
      <div style="text-align:right">
        <span class="badge ${s.day === 'Saturday' ? 'badge-warning' : 'badge-ok'}" style="font-size:11px">${escapeHtml(s.day)}</span>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${escapeHtml(s.time)}</div>
      </div>
    </div>
  `).join('');
}
