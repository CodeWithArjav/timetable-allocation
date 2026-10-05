const STORAGE_KEYS = {
  schedules: 'tt_schedules',
  users: 'tt_users',
  session: 'tt_session',
  theme: 'tt_theme',
  approved: 'tt_approved_requests',
  lockout: 'tt_lockout_state',
  integrity: 'tt_data_integrity'
};

const DEPARTMENTS = ['BCA', 'BCA HONS', 'BSC-IT', 'BSC-IT HONS', 'IMCA', 'MCA', 'MSC-IT'];
const DIVISIONS = ['Division A', 'Division B', 'Division C', 'Division D', 'Division E', 'Division F', 'Division G', 'Division H', 'Division I', 'Division J'];
const RAW_FACULTY = [
  'Prof. Rinku Patil',
  'Prof. Poonam Patil',
  'Prof. Udith manoj',
  'Prof. Faisal shah',
  'Prof. Shivani Bhadoriya',
  'Prof. Pratik Parmar',
  'Prof. MD Faruk Abdulla',
  'Prof. Rinkal',
  'Prof. Aesh Dinky Gada',
  'Prof. Ashutosh Kumar Gautam',
  'Prof. Ashutosh Singh',
  'Prof. Chandan Kumar Singh',
  'Prof. Ramachandran',
  'Prof. Arun Udayasuriyan',
  'Prof. Nirmit Shah',
  'Prof. Vijya',
  'Prof. Hardik Parmar',
  'Prof. Jiger',
  'Prof. Ratinesh Kumar Namdeo',
  'Prof. Sumit Kumar Soni',
  'Prof. Aniket Paul',
  'Prof. Kapadia Madhav Kumar Jagdishbhai',
  'Prof. Kashetti Harshith',
  'Prof. Yadagiri Rama Deepak',
  'Prof. Khyati Ketanbhai Kariya',
  'Prof. Komal Bharti',
  'Prof. Niharika Agarwal',
  'Prof. Parmar Honey',
  'Prof. Rinkal Dharmesh Sarvaiya',
  'Prof. Vaishali Pramodchandra Shah',
  'Prof. Vishakha Narendrabhai Bathwar',
  'Prof. Mehul Kumar Dalwadi',
  'Prof. Jatin Morwal',
  'Prof. Hitesh Siju',
  'Prof. Mirnal',
  'Prof. Vipul',
  'Prof. Shika',
  'Prof. Sonali Karade',
  'Prof. Arpita',
  'Prof. Raj Sinha',
  'Prof. Anmol Singh',
  'Prof. Chebrolu Gangeya Naga Venkata Sathwik',
  'Prof. Djidji Ethienne Ahikpa',
  'Prof. Lakshya Namdeo',
  'Prof. Pratik Raj',
  'Prof. Praveen Singh Tomar',
  'Prof. Pritam Samanta',
  'Prof. Sahil Kumar',
  'Prof. Smarika Sachchu Rai'
];

// Guard: de-duplicate FACULTY by normalized name (trims, collapses whitespace,
// case-insensitive). If two entries are identical apart from spacing/case, the
// first occurrence wins — prevents the dropdown (and conflict checks) from
// treating two copies of the same name as two different professors.
const FACULTY = [
  ...new Map(
    RAW_FACULTY.map((f) => [
      f.trim().replace(/\s+/g, " ").toLowerCase(),
      f.trim().replace(/\s+/g, " "),
    ])
  ).values(),
];

const ROOMS = [
  'Room 301', 'Room 302', 'Room 303', 'Room 304', 'Room 305', 'Room 306', 'Room 307', 'Room 308', 'Room 309',
  'Room 503', 'Room 510', 'Room 511',
  'Room 601', 'Room 602', 'Room 603', 'Room 604', 'Room 605', 'Room 606', 'Room 607', 'Room 608', 'Room 609', 'Room 610', 'Room 611',
  'Lab 601', 'Lab 602', 'Lab 603', 'Lab 605', 'Lab 606', 'Lab 607', 'Lab 608', 'Lab 609', 'Lab 610', 'Lab 611', 'Lab 612', 'Lab 613',
  'Lab 702', 'Lab 703', 'Lab 705', 'Lab 709', 'Lab 710'
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const CLASS_TIMES = [
  '07:30 AM - 02:10 PM',
  '09:30 AM - 04:30 PM'
];

const COURSES = {
  'BCA': ['Programming in C++', 'Data Structures & Algorithms', 'Web Application Dev', 'Software Engineering', 'Database Management', 'Java Programming'],
  'BCA HONS': ['Advanced Data Structures', 'Python for Data Science', 'Full Stack Web Dev', 'Mobile App Development', 'Artificial Intelligence', 'Cloud Architecture'],
  'BSC-IT': ['Information Technology', 'Computer Networks', 'Operating Systems Concepts', 'Web Technologies', 'Cyber Security Basics', 'Cloud Fundamentals'],
  'BSC-IT HONS': ['Network Security', 'Information Systems', 'Data Mining & Analytics', 'IoT Systems & Protocols', 'Big Data Engineering', 'Wireless Networks'],
  'IMCA': ['Integrated Computer Applications', 'Object Oriented Programming', 'Database Systems', 'Web Frameworks', 'Software Testing', 'E-Commerce Tech'],
  'MCA': ['Enterprise Software Dev', 'Advanced Operating Systems', 'Software Architecture', 'Machine Learning', 'Cloud Infrastructure', 'Distributed Systems'],
  'MSC-IT': ['Advanced IT Infrastructure', 'Information Security & Cryptography', 'Data Analytics', 'Cloud Computing Architecture', 'AI & Deep Learning', 'Enterprise IT Systems']
};

const seedSchedules = () => {
  const scheds = [
    { id: 1, department: 'BCA', faculty: 'Prof. Rinku Patil', course: 'Data Structures & Algorithms', room: 'Room 301', day: 'Monday', time: '07:30 AM - 02:10 PM', type: 'Lecture', division: 'Division A', semester: 1 },
    { id: 2, department: 'BSC-IT', faculty: 'Prof. Poonam Patil', course: 'Computer Networks', room: 'Room 302', day: 'Monday', time: '09:30 AM - 04:30 PM', type: 'Lecture', division: 'Division B', semester: 3 },
    { id: 3, department: 'BCA HONS', faculty: 'Prof. Udith manoj', course: 'Python for Data Science', room: 'Lab 601', day: 'Monday', time: '07:30 AM - 02:10 PM', type: 'Lab', division: 'Division A', semester: 2 },
    { id: 4, department: 'BSC-IT HONS', faculty: 'Prof. Faisal shah', course: 'Network Security', room: 'Room 303', day: 'Monday', time: '09:30 AM - 04:30 PM', type: 'Lecture', division: 'Division C', semester: 4 },
    { id: 5, department: 'IMCA', faculty: 'Prof. Shivani Bhadoriya', course: 'Integrated Computer Applications', room: 'Room 503', day: 'Tuesday', time: '07:30 AM - 02:10 PM', type: 'Lecture', division: 'Division A', semester: 1 },
    { id: 6, department: 'MCA', faculty: 'Prof. Pratik Parmar', course: 'Enterprise Software Dev', room: 'Room 601', day: 'Wednesday', time: '09:30 AM - 04:30 PM', type: 'Lecture', division: 'Division A', semester: 1 },
    { id: 7, department: 'MSC-IT', faculty: 'Prof. MD Faruk Abdulla', course: 'Advanced IT Infrastructure', room: 'Room 602', day: 'Thursday', time: '07:30 AM - 02:10 PM', type: 'Lecture', division: 'Division D', semester: 3 },
    { id: 8, department: 'BCA', faculty: 'Prof. Rinkal', course: 'Web Application Dev', room: 'Lab 602', day: 'Friday', time: '09:30 AM - 04:30 PM', type: 'Lecture', division: 'Division B', semester: 2 },
    { id: 9, department: 'IMCA', faculty: 'Prof. Aesh Dinky Gada', course: 'Database Systems', room: 'Room 510', day: 'Saturday', time: '07:30 AM - 02:10 PM', type: 'Lecture', division: 'Division A', semester: 1 },
    { id: 10, department: 'BSC-IT', faculty: 'Prof. Ashutosh Kumar Gautam', course: 'Web Technologies', room: 'Lab 605', day: 'Saturday', time: '09:30 AM - 04:30 PM', type: 'Lab', division: 'Division A', semester: 3 },
    { id: 11, department: 'MSC-IT', faculty: 'Prof. Ashutosh Singh', course: 'AI & Deep Learning', room: 'Room 611', day: 'Saturday', time: '07:30 AM - 02:10 PM', type: 'Lecture', division: 'Division F', semester: 2 },
    { id: 12, department: 'MCA', faculty: 'Prof. Chandan Kumar Singh', course: 'Machine Learning', room: 'Lab 702', day: 'Friday', time: '09:30 AM - 04:30 PM', type: 'Lecture', division: 'Division B', semester: 2 },
    { id: 13, department: 'BCA HONS', faculty: 'Prof. Ramachandran', course: 'Full Stack Web Dev', room: 'Room 511', day: 'Tuesday', time: '09:30 AM - 04:30 PM', type: 'Lecture', division: 'Division C', semester: 3 },
    { id: 14, department: 'BSC-IT HONS', faculty: 'Prof. Arun Udayasuriyan', course: 'Data Mining & Analytics', room: 'Lab 710', day: 'Thursday', time: '07:30 AM - 02:10 PM', type: 'Lab', division: 'Division D', semester: 5 }
  ];
  localStorage.setItem(STORAGE_KEYS.schedules, JSON.stringify(scheds));
  markIntegrity(STORAGE_KEYS.schedules);
};

// Seed accounts: passwords are hashed with salted, stretched PBKDF (never stored plaintext)
const seedUsers = () => {
  const seed = (pw) => Security.hashPassword(pw);
  const admin = seed('admin123');
  const faculty = seed('faculty123');
  const support = seed('support123');
  const users = [
    { id: 1, name: 'Prof. Rinku Patil', email: 'admin@college.edu', salt: admin.salt, password: admin.hash, role: 'admin', department: 'BCA', approved: true },
    { id: 2, name: 'Prof. Poonam Patil', email: 'priya@college.edu', salt: faculty.salt, password: faculty.hash, role: 'faculty', department: 'BSC-IT', approved: true },
    { id: 3, name: 'IT Support', email: 'support@college.edu', salt: support.salt, password: support.hash, role: 'it', department: 'MCA', approved: true }
  ];
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
  markIntegrity(STORAGE_KEYS.users);
};

const StorageService = {
  getSchedules() {
    const data = localStorage.getItem(STORAGE_KEYS.schedules);
    if (!data) { seedSchedules(); return this.getSchedules(); }
    try {
      const scheds = JSON.parse(data);
      // Auto-reseed if old faculty names, old rooms, or old time formats exist
      if (scheds.some(s => !FACULTY.includes(s.faculty) || s.day === 'Sunday' || !CLASS_TIMES.includes(s.time) || (s.room || '').startsWith('A-') || (s.room || '').startsWith('B-') || (s.room || '').startsWith('LAB-'))) {
        seedSchedules();
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.schedules));
      }
      return scheds;
    } catch (e) { return []; }
  },

  saveSchedules(schedules) {
    localStorage.setItem(STORAGE_KEYS.schedules, JSON.stringify(schedules));
    markIntegrity(STORAGE_KEYS.schedules);
  },

  getUsers() {
    const data = localStorage.getItem(STORAGE_KEYS.users);
    if (!data) { seedUsers(); return this.getUsers(); }
    let users;
    try {
      users = JSON.parse(data);
    } catch (e) { seedUsers(); return this.getUsers(); }

    let migrated = false;
    users.forEach(u => {
      // One-time migration: legacy plaintext passwords -> salted stretched hash
      if (u.password && !u.salt) {
        const { salt, hash } = Security.hashPassword(u.password);
        u.salt = salt;
        u.password = hash;
        migrated = true;
      }
      // Fail-closed: invalid stored records can never authenticate
      if (typeof u.salt !== 'string' || typeof u.password !== 'string') {
        u.salt = '';
        u.password = '';
        migrated = true;
      }
      if (['admin@college.edu', 'priya@college.edu', 'support@college.edu'].includes(String(u.email || '').toLowerCase())) {
        if (!u.approved) { u.approved = true; migrated = true; }
      }
    });
    if (migrated) {
      localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
      markIntegrity(STORAGE_KEYS.users);
    }
    return users;
  },

  saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
    markIntegrity(STORAGE_KEYS.users);
  },

  /* Sessions: signed token + expiry + device binding. A stolen or
     hand-crafted session blob in localStorage is rejected on load. */
  setSession(user) {
    const token = Security.createSessionToken(user);
    const session = {
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      id: user.id,
      approved: !!user.approved,
      token,
      fp: Security.deviceFingerprint(),
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
  },

  getSession() {
    const s = localStorage.getItem(STORAGE_KEYS.session);
    if (!s) return null;
    let session;
    try { session = JSON.parse(s); } catch (e) { this.clearSession(); return null; }

    const claims = Security.verifySessionToken(session.token);
    if (!claims) { this.clearSession(); return null; }

    if (session.fp !== Security.deviceFingerprint()) { // session moved to another device/profile
      this.clearSession();
      return null;
    }

    // Cross-check role against the user record — privilege escalation in the
    // stored session is ignored.
    const users = this.getUsers();
    const real = users.find(u => u.id === claims.uid);
    if (!real || !real.approved || real.role !== claims.role) { this.clearSession(); return null; }

    // keep approval state in sync with the live user record
    session.approved = real.approved;

    // Sliding renewal
    const renewed = Security.refreshSessionToken(session.token);
    if (renewed) {
      session.token = renewed;
      localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
    }
    return session;
  },

  clearSession() {
    localStorage.removeItem(STORAGE_KEYS.session);
  },

  getTheme() {
    return localStorage.getItem(STORAGE_KEYS.theme) || 'dark';
  },

  setTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  },

  getPendingRequests() {
    const data = localStorage.getItem(STORAGE_KEYS.approved);
    if (!data) { localStorage.setItem(STORAGE_KEYS.approved, '[]'); return []; }
    try { return JSON.parse(data); } catch (e) { return []; }
  },

  savePendingRequests(requests) {
    localStorage.setItem(STORAGE_KEYS.approved, JSON.stringify(requests));
    markIntegrity(STORAGE_KEYS.approved);
  }
};

/* ---------- Data-tamper detection (HMAC-ish integrity marks) ---------- */
function markIntegrity(key) {
  try {
    const marks = JSON.parse(localStorage.getItem(STORAGE_KEYS.integrity) || '{}');
    marks[key] = Security._sha256(localStorage.getItem(key) + '|tt-integrity');
    localStorage.setItem(STORAGE_KEYS.integrity, JSON.stringify(marks));
  } catch (e) { /* integrity marking must never break the app */ }
}

function checkIntegrity(key) {
  try {
    const marks = JSON.parse(localStorage.getItem(STORAGE_KEYS.integrity) || '{}');
    if (!marks[key]) return true; // unknown yet — first read
    return marks[key] === Security._sha256(localStorage.getItem(key) + '|tt-integrity');
  } catch (e) { return false; }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}

function getCurrentUser() {
  return StorageService.getSession();
}

function logoutUser() {
  StorageService.clearSession();
  window.location.href = 'index.html';
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function getNextId(items) {
  return items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;
}