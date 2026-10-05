function checkAndInitChat() {
  if (document.getElementById('chatContent')) {
    initChat();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkAndInitChat);
} else {
  checkAndInitChat();
}

function initChat() {
  bindChatEvents();
  showQuickInfo();
  addBotMessage('👋 Hello! I am your <b>Timetable AI Assistant</b>. I can scan for empty classrooms, check schedules, and detect conflicts. Try asking me:');
  addBotMessage('💡 <span class="chat-quick-hint">"📡 Scan empty classrooms for Monday"<br>"Which rooms are free on Tuesday?"<br>"Show me Prof. Rinku Patil schedule"<br>"Any conflicts on Wednesday?"</span>');
}

function bindChatEvents() {
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendChat');

  if (form) form.addEventListener('submit', (e) => { e.preventDefault(); sendMessage(); });
  if (sendBtn) sendBtn.addEventListener('click', sendMessage);

  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (input) input.value = chip.textContent.trim();
      sendMessage();
    });
  });
}

function sendMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message) return;

  addUserMessage(message);
  input.value = '';


  const typingEl = document.createElement('div');
  typingEl.className = 'msg bot';
  typingEl.id = 'typingIndicator';
  typingEl.innerHTML = `<div class="msg-avatar">🤖</div><div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
  document.getElementById('chatMessages').appendChild(typingEl);
  document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;

  setTimeout(() => {
    typingEl.remove();
    const reply = processQuery(message);
    addBotMessage(reply);
  }, 900);
}

function addUserMessage(text) {
  const msgs = document.getElementById('chatMessages');
  const user = StorageService.getSession();
  const initials = user ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'U';
  msgs.insertAdjacentHTML('beforeend', `
    <div class="msg user">
      <div class="msg-avatar">${escapeHtml(initials)}</div>
      <div class="msg-bubble">${escapeHtml(text)}</div>
    </div>`);
  msgs.scrollTop = msgs.scrollHeight;
}

function addBotMessage(html) {
  const msgs = document.getElementById('chatMessages');
  msgs.insertAdjacentHTML('beforeend', `
    <div class="msg bot">
      <div class="msg-avatar">🤖</div>
      <div class="msg-bubble">${html}</div>
    </div>`);
  msgs.scrollTop = msgs.scrollHeight;
}


function processQuery(text) {
  const q = text.toLowerCase();
  const day = extractDay(q);
  const time = extractTime(q);

  if (/(scan|locate|find empty|free room|empty class|no room|classroom scanner|find room|vacant room)/i.test(q)) {
    return handleClassroomScannerQuery(day, time);
  }

  const facultyName = extractFaculty(q);
  if (facultyName) {
    return handleFacultySchedule(facultyName, day);
  }

  const roomName = extractRoom(q);
  if (roomName && /schedule|class|busy|occupied|what|whats|when|teaching|lecture|have/.test(q)) {
    return handleRoomSchedule(roomName, day);
  }

  const deptName = extractDepartment(q);
  if (deptName && /schedule|class|busy|what|whats|when/.test(q)) {
    return handleDepartmentSchedule(deptName, day);
  }

  if (/(conflict|clash|overlap|double.?book|collision)/i.test(q)) {
    return handleConflicts(day);
  }

  if (/(today|daily|schedule for today|day schedule)/i.test(q)) {
    return handleDaySchedule(day || getToday());
  }

  if (/(total|how many).*(class|schedule|lecture)/i.test(q)) {
    const all = StorageService.getSchedules();
    return `📊 The system currently has <b>${all.length} schedules</b> across <b>${new Set(all.map(s => s.department)).size} departments</b> and <b>${new Set(all.map(s => s.room)).size} classrooms</b>.`;
  }

  if (/help|what can you|how do i|support/i.test(q)) {
    return `🤖 <b>I can help you with:</b><br><br>
      1️⃣ Finding <b>available classrooms</b> (e.g. "Which rooms are free on Monday at 10:00?")<br>
      2️⃣ <b>Faculty schedules</b> (e.g. "Show me Prof. Rinku Patil schedule")<br>
      3️⃣ <b>Room schedules</b> (e.g. "What is in A-101 on Wednesday?")<br>
      4️⃣ <b>Department schedules</b> (e.g. "Show CSE schedule for Friday")<br>
      5️⃣ <b>Conflict detection</b> (e.g. "Any conflicts on Tuesday?")<br>
      6️⃣ <b>Daily schedule</b> (e.g. "What is today's schedule?")<br><br>
      Just type your question naturally! 😊`;
  }


  if (/^(hi|hello|hey|good morning|good afternoon|good evening|namaste)\b/.test(q)) {
    const user = StorageService.getSession();
    return `Hello${user ? ', ' + user.name.split(' ')[0] : ''}! 👋 How can I help you with the timetable today? You can ask me about available classrooms, schedules, or conflicts.`;
  }

  return `🤔 I'm not sure I understood that. Try one of these:<br><br>
    • "Which rooms are free on Friday at 02:00-03:00?"<br>
    • "Show me Prof. Priya Sharma schedule"<br>
    • "Any conflicts this week?"<br>
    • "What is today's schedule?"<br><br>
    Or type <b>help</b> to see all my capabilities.`;
}

function handleAvailableRooms(day, time) {
  const all = StorageService.getSchedules();
  const today = day || getToday();
  const slot = time || null;

  const busyRooms = new Set();
  all.forEach(s => {
    if (s.day === today && (!slot || s.time === slot)) {
      busyRooms.add(s.room);
    }
  });

  const available = ROOMS.filter(r => !busyRooms.has(r));

  if (available.length === 0) {
    return `😕 All classrooms are occupied on <b>${today}</b>${slot ? ` at <b>${slot}</b>` : ''}. Try another day or time.`;
  }

  const listHtml = available.map(r => `• ${r}`).join('<br>');
  return `✅ <b>Available classrooms on ${today}${slot ? ` at ${slot}` : ''}:</b><br><br>${listHtml}<br><br>📌 <b>${available.length}</b> of ${ROOMS.length} classrooms are free.`;
}

function handleFacultySchedule(name, day) {
  const all = StorageService.getSchedules();
  const facultySched = all.filter(s => s.faculty.toLowerCase().includes(name.toLowerCase()));

  if (facultySched.length === 0) {
    return `😕 No schedule found for <b>${name}</b>. Check the faculty name spelling.`;
  }

  const filtered = day ? facultySched.filter(s => s.day === day) : facultySched;
  if (day && filtered.length === 0) {
    return `📭 ${name} has <b>no classes on ${day}</b>.`;
  }

  const listHtml = filtered.map(s =>
    `• <b>${s.day}</b> ${s.time} — ${s.course} (${s.type}) at ${s.room}, ${s.division || s.section || 'Division A'}`
  ).join('<br>');

  return `🗓️ <b>${name}'s Schedule${day ? ` for ${day}` : ''}:</b><br><br>${listHtml}<br><br>📚 Total: <b>${filtered.length}</b> session(s).`;
}


function handleRoomSchedule(room, day) {
  const all = StorageService.getSchedules();
  const roomSched = all.filter(s => s.room.toLowerCase() === room.toLowerCase());

  if (roomSched.length === 0) {
    return `🏫 Room <b>${room.toUpperCase()}</b> has no scheduled classes. It is fully available!`;
  }

  const filtered = day ? roomSched.filter(s => s.day === day) : roomSched;
  if (day && filtered.length === 0) {
    return `🏫 Room <b>${room.toUpperCase()}</b> is <b>free all day on ${day}</b>.`;
  }

  const listHtml = filtered.map(s =>
    `• <b>${s.day}</b> ${s.time} — ${s.course} (${s.type}) — ${s.faculty}, ${s.division || s.section || 'Division A'}`
  ).join('<br>');

  return `🏫 <b>Room ${room.toUpperCase()} Schedule${day ? ` for ${day}` : ''}:</b><br><br>${listHtml}`;
}


function handleDepartmentSchedule(dept, day) {
  const all = StorageService.getSchedules();
  const deptSched = all.filter(s => s.department.toLowerCase() === dept.toLowerCase());

  if (deptSched.length === 0) {
    return `😕 No schedule found for department <b>${dept.toUpperCase()}</b>.`;
  }

  const filtered = day ? deptSched.filter(s => s.day === day) : deptSched;
  if (day && filtered.length === 0) {
    return `📭 <b>${dept.toUpperCase()}</b> has no classes on ${day}.`;
  }

  const listHtml = filtered.map(s =>
    `• <b>${s.day}</b> ${s.time} — ${s.course} (${s.type}) — ${s.faculty} @ ${s.room}, ${s.division || s.section || 'Division A'}`
  ).join('<br>');

  return `🏛️ <b>${dept.toUpperCase()} Department Schedule${day ? ` for ${day}` : ''}:</b><br><br>${listHtml}<br><br>📚 Total: <b>${filtered.length}</b> session(s).`;
}


function handleConflicts(day) {
  const all = StorageService.getSchedules();
  const filtered = day ? all.filter(s => s.day === day) : all;
  const conflicts = [];
  const roomMap = {};

  filtered.forEach(s => {
    const key = `${s.day}|${s.time}|${s.room}`;
    if (!roomMap[key]) roomMap[key] = [];
    roomMap[key].push(s);
  });

  Object.values(roomMap).forEach(group => {
    if (group.length > 1) {
      conflicts.push({ type: 'room', items: group });
    }
  });

  const facultyMap = {};
  filtered.forEach(s => {
    const key = `${s.day}|${s.time}|${s.faculty}`;
    if (!facultyMap[key]) facultyMap[key] = [];
    facultyMap[key].push(s);
  });

  Object.values(facultyMap).forEach(group => {
    if (group.length > 1) {
      conflicts.push({ type: 'faculty', items: group });
    }
  });

  if (conflicts.length === 0) {
    return `✅ <b>No conflicts found${day ? ` on ${day}` : ' in the current schedule'}!</b> All rooms and faculty are properly allocated. 🎉`;
  }

  let html = `⚠️ <b>Found ${conflicts.length} potential conflict(s)${day ? ` on ${day}` : ''}:</b><br><br>`;
  conflicts.forEach((c, i) => {
    const items = c.items.map(s => `${s.course} (${s.faculty}) @ ${s.room} ${s.time}`).join(' <b>VS</b> ');
    html += `${i + 1}. ${c.type === 'room' ? '🏫 Room' : '👤 Faculty'} double-booking: <br>&nbsp;&nbsp;${items}<br><br>`;
  });
  html += `📌 Tip: Use the Schedule page to resolve these conflicts.`;
  return html;
}

function handleDaySchedule(day) {
  const all = StorageService.getSchedules();
  const daySched = all.filter(s => s.day === day);

  if (daySched.length === 0) {
    return `📭 No classes scheduled for <b>${day}</b>. It's a free day!`;
  }

  const listHtml = daySched.map(s =>
    `• ${s.time} — ${s.course} (${s.type}) — ${s.faculty} @ ${s.room}, ${s.division || s.section || 'Division A'}`
  ).join('<br>');

  return `📅 <b>Schedule for ${day}:</b><br><br>${listHtml}<br><br>📚 Total: <b>${daySched.length}</b> session(s).`;
}

function extractDay(q) {
  const days = {
    monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
    thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday'
  };
  for (const [key, val] of Object.entries(days)) {
    if (q.includes(key)) return val;
  }
  if (/(mon|tue|wed|thu|fri|sat)\b/.test(q)) {
    const short = q.match(/(mon|tue|wed|thu|fri|sat)\b/)[1];
    return { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday' }[short];
  }
  return null;
}

function extractTime(q) {
  const timeMatch = q.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–to]?\s*(\d{1,2})?(?::(\d{2}))?\s*(am|pm)?/);
  if (!timeMatch) return null;
  const hour1 = timeMatch[1];
  const start = timeMatch[3] ? `${hour1}:00-${timeMatch[4] || hour1}:00` : null;
  return start || `${hour1}:00-${parseInt(hour1) + 1}:00`;
}

function extractFaculty(q) {
  const prefixes = ['dr.', 'prof.', 'mr.', 'mrs.', 'ms.'];
  for (const p of prefixes) {
    const idx = q.indexOf(p);
    if (idx !== -1) {
      // Grab up to 2-3 words after prefix
      const after = q.slice(idx);
      const match = after.match(/^(dr|prof|mr|mrs|ms)[.]?\s+[a-z]+(?:\s+[a-z]+)?/i);
      if (match) return match[0];
    }
  }


  for (const f of FACULTY) {
    const last = f.split(' ').slice(-1)[0].toLowerCase();
    if (q.includes(last)) return f;
  }

  return null;
}

function extractRoom(q) {
  const match = q.match(/\b([a-d]\s*-?\s*\d{3}|lab-\d+|auditorium)\b/i);
  if (match) return match[1].replace(/\s+/g, '');
  for (const r of ROOMS) {
    if (q.includes(r.toLowerCase())) return r;
  }
  return null;
}

function extractDepartment(q) {
  const depts = ['cse', 'ece', 'eee', 'mech', 'civil', 'mba', 'it', 'ai&ds', 'ai', 'computer science', 'electronics', 'mechanical', 'civil', 'business'];
  for (const d of depts) {
    if (q.includes(d)) {
      if (d === 'computer science') return 'CSE';
      if (d === 'electronics') return 'ECE';
      if (d === 'mechanical') return 'MECH';
      if (d === 'business') return 'MBA';
      if (d === 'ai') return 'AI&DS';
      if (d === 'it') return 'IT';
      return d.toUpperCase();
    }
  }
  return null;
}

function getToday() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}


function showQuickInfo() {
  const all = StorageService.getSchedules();
  const today = getToday();
  const todayCount = all.filter(s => s.day === today).length;

  const stats = document.getElementById('quickStats');
  if (stats) {
    stats.innerHTML = `
      <div class="stat-card stat-purple" style="margin-bottom:12px">
        <div class="stat-icon">📚</div>
        <div class="stat-label">Total Sessions</div>
        <div class="stat-value">${all.length}</div>
      </div>

      <div class="stat-card stat-green" style="margin-bottom:12px">
        <div class="stat-icon">👩‍🏫</div>
        <div class="stat-label">Faculty</div>
        <div class="stat-value">${new Set(all.map(s => s.faculty)).size}</div>
      </div>

      <div class="stat-card stat-blue" style="margin-bottom:12px">
        <div class="stat-icon">🏫</div>
        <div class="stat-label">Rooms in Use</div>
        <div class="stat-value">${new Set(all.map(s => s.room)).size}</div>
      </div>

      <div class="stat-card stat-orange">
        <div class="stat-icon">📅</div>
        <div class="stat-label">Classes Today (${today})</div>
        <div class="stat-value">${todayCount}</div>
      </div>`;
  }

  const deptList = document.getElementById('deptList');
  if (deptList) {
    deptList.innerHTML = DEPARTMENTS.map(d => {
      const count = all.filter(s => s.department === d).length;
      return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
        <span>${d}</span><span class="badge badge-lecture">${count} classes</span>
      </div>`;
    }).join('');
  }
}


function handleClassroomScannerQuery(day, time) {
  const all = StorageService.getSchedules();
  const today = day || getToday();
  const slot = time || '08:00-09:00';

  const busyRooms = new Set();
  all.forEach(s => {
    if (s.day === today && s.time === slot) {
      busyRooms.add(s.room);
    }
  });

  const available = ROOMS.filter(r => !busyRooms.has(r));

  if (available.length === 0) {
    return `🚨 <b>Scanner Alert:</b> All ${ROOMS.length} classrooms are currently occupied on <b>${today}</b> at <b>${slot}</b>.<br><br>💡 <i>Recommendation:</i> Try scanning another time slot or check for upcoming openings.`;
  }

  const roomBadges = available.map(r => `• <b>${r}</b> (${r.startsWith('LAB') ? 'Lab Wing' : 'Academic Wing'}) — <span style="color:var(--success)">🟢 Available</span>`).join('<br>');

  return `📡 <b>Classroom Scanner Results for ${today} (${slot}):</b><br><br>
    Found <b>${available.length}</b> empty classrooms out of ${ROOMS.length} total:<br><br>
    ${roomBadges}<br><br>
    📌 You can allocate any of these rooms directly on the <a href="schedule.html" style="color:var(--accent-light)">Schedule Management Page</a> using the Empty Classroom Scanner!`;
}
