function checkAndInitSchedule() {
  if (document.getElementById("scheduleContent")) {
    initSchedulePage();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", checkAndInitSchedule);
} else {
  checkAndInitSchedule();
}

function openScannerModalDirect() {
  openModal("scannerModal");
  initScannerModalSelects();
  runScanner();
}

function switchScheduleView(viewType) {
  const tableViewBtn = document.getElementById("viewTable");
  const gridViewBtn = document.getElementById("viewGrid");
  const tableViewCard = document.getElementById("tableView");
  const gridViewCard = document.getElementById("gridView");

  if (viewType === "grid") {
    if (tableViewBtn) {
      tableViewBtn.classList.remove("active", "btn-primary");
      tableViewBtn.classList.add("btn-ghost");
    }
    if (gridViewBtn) {
      gridViewBtn.classList.remove("btn-ghost");
      gridViewBtn.classList.add("active", "btn-primary");
    }
    if (tableViewCard) tableViewCard.style.display = "none";
    if (gridViewCard) gridViewCard.style.display = "block";
    renderTimetableGrid();
  } else {
    if (gridViewBtn) {
      gridViewBtn.classList.remove("active", "btn-primary");
      gridViewBtn.classList.add("btn-ghost");
    }
    if (tableViewBtn) {
      tableViewBtn.classList.remove("btn-ghost");
      tableViewBtn.classList.add("active", "btn-primary");
    }
    if (gridViewCard) gridViewCard.style.display = "none";
    if (tableViewCard) tableViewCard.style.display = "block";
    renderSchedules();
  }
}

function initSchedulePage() {
  populateFilterSelects();
  populateFormSelects();
  bindEvents();
  initScannerModalSelects();
  renderSchedules();
  updateStats();
}

function populateFilterSelects() {
  const deptFilter = document.getElementById("filterDept");
  const facultyFilter = document.getElementById("filterFaculty");
  const roomFilter = document.getElementById("filterRoom");

  const allSchedules = StorageService.getSchedules() || [];

  if (deptFilter) {
    deptFilter.innerHTML = '<option value="">All Departments</option>';
    DEPARTMENTS.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      deptFilter.appendChild(opt);
    });
  }

  if (facultyFilter) {
    const selectedVal = facultyFilter.value;
    facultyFilter.innerHTML = '<option value="">All Faculty</option>';
    const display = facultyDisplayNames(FACULTY);
    FACULTY.forEach((f, i) => {
      const opt = document.createElement("option");
      opt.value = f;
      opt.textContent = display[i];
      facultyFilter.appendChild(opt);
    });
    if (selectedVal) facultyFilter.value = selectedVal;
  }

  if (roomFilter) {
    roomFilter.innerHTML = '<option value="">All Rooms</option>';
    ROOMS.forEach((r) => {
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r;
      roomFilter.appendChild(opt);
    });
  }
}

function updateCourseOptions(deptValue) {
  const courseSelect = document.getElementById("schedCourse");
  if (!courseSelect) return;
  const courses = COURSES[deptValue] || [];
  courseSelect.innerHTML = '<option value="">Select Course</option>';
  courses.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    courseSelect.appendChild(opt);
  });
}

function populateFormSelects() {
  const dept = document.getElementById("schedDept");
  const faculty = document.getElementById("schedFaculty");
  const room = document.getElementById("schedRoom");
  const day = document.getElementById("schedDay");
  const time = document.getElementById("schedTime");

  const allSchedules = StorageService.getSchedules() || [];

  if (dept) {
    dept.innerHTML = '<option value="">Select Department</option>';
    DEPARTMENTS.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      dept.appendChild(opt);
    });
  }

  if (faculty) {
    const selectedVal = faculty.value;
    faculty.innerHTML = '<option value="">Select Faculty</option>';
    const display = facultyDisplayNames(FACULTY);
    FACULTY.forEach((f, i) => {
      const opt = document.createElement("option");
      opt.value = f;
      opt.textContent = display[i];
      faculty.appendChild(opt);
    });
    if (selectedVal) faculty.value = selectedVal;
  }

  if (room) {
    room.innerHTML = '<option value="">Select Room</option>';
    ROOMS.forEach((r) => {
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r;
      room.appendChild(opt);
    });
  }

  if (day) {
    day.innerHTML = '<option value="">Select Day</option>';
    DAYS.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      day.appendChild(opt);
    });
  }

  if (time) {
    time.innerHTML = '<option value="">Select Time</option>';
    CLASS_TIMES.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      time.appendChild(opt);
    });
  }
}

function bindEvents() {
  // Filters
  ["filterDept", "filterFaculty", "filterRoom"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", renderSchedules);
  });

  const searchInput = document.getElementById("scheduleSearch");
  if (searchInput) searchInput.addEventListener("input", renderSchedules);

  const deptSelect = document.getElementById("schedDept");
  if (deptSelect) {
    deptSelect.addEventListener("change", () => {
      updateCourseOptions(deptSelect.value);
    });
  }

  // When a calendar date is picked, auto-select the matching weekday
  const dateInput = document.getElementById("schedDate");
  if (dateInput) {
    dateInput.addEventListener("change", () => {
      if (!dateInput.value) return;
      const d = new Date(dateInput.value + "T00:00:00");
      const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
      const daySelect = document.getElementById("schedDay");
      if (daySelect && DAYS.includes(dayName)) daySelect.value = dayName;
    });
  }

  const addBtn = document.getElementById("btnAddSchedule");
  if (addBtn) addBtn.addEventListener("click", () => openAddModal());

  const saveBtn = document.getElementById("saveSchedule");
  if (saveBtn) saveBtn.addEventListener("click", saveSchedule);

  const scanBtn = document.getElementById("btnScanRooms");
  if (scanBtn) scanBtn.addEventListener("click", openScannerModalDirect);

  // Delegated clicks for dynamically rendered buttons (edit/delete, grid pills, reserve)
  const scheduleBody = document.getElementById("scheduleBody");
  if (scheduleBody) {
    scheduleBody.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const id = parseInt(btn.dataset.id);
      if (btn.dataset.action === "edit") openEditModal(id);
      if (btn.dataset.action === "delete") deleteSchedule(id);
    });
  }

  bindGridDelegation();
  bindScannerDelegation();

  const tableView = document.getElementById("viewTable");
  const gridView = document.getElementById("viewGrid");

  if (tableView) {
    tableView.addEventListener("click", () => switchScheduleView("table"));
  }

  if (gridView) {
    gridView.addEventListener("click", () => switchScheduleView("grid"));
  }
}

function bindGridDelegation() {
  const gridBody = document.getElementById("timetableBody");
  if (gridBody && !gridBody.dataset.bound) {
    gridBody.dataset.bound = "1";
    gridBody.addEventListener("click", (e) => {
      const pill = e.target.closest(".slot-pill[data-id]");
      if (pill) openEditModal(parseInt(pill.dataset.id));
    });
  }
}

function bindScannerDelegation() {
  const scannerResults = document.getElementById("scannerResults");
  if (scannerResults && !scannerResults.dataset.bound) {
    scannerResults.dataset.bound = "1";
    scannerResults.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-room]");
      if (btn)
        quickReserveRoom(
          btn.dataset.room,
          btn.dataset.day,
          btn.dataset.time,
          btn.dataset.date,
        );
    });
  }
}

function getFilters() {
  return {
    dept: document.getElementById("filterDept")?.value || "",
    faculty: document.getElementById("filterFaculty")?.value || "",
    room: document.getElementById("filterRoom")?.value || "",
    search: (
      document.getElementById("scheduleSearch")?.value || ""
    ).toLowerCase(),
  };
}

function filterSchedules() {
  const f = getFilters();
  const all = StorageService.getSchedules();
  return all.filter((s) => {
    const matchDept = !f.dept || s.department === f.dept;
    const matchFaculty = !f.faculty || s.faculty === f.faculty;
    const matchRoom = !f.room || s.room === f.room;
    const matchSearch =
      !f.search ||
      (
        (s.course || "") +
        " " +
        (s.faculty || "") +
        " " +
        (s.department || "") +
        " " +
        (s.room || "") +
        " " +
        (s.division || s.section || "")
      )
        .toLowerCase()
        .includes(f.search);
    return matchDept && matchFaculty && matchRoom && matchSearch;
  });
}

function renderSchedules() {
  const filtered = filterSchedules();
  const tbody = document.getElementById("scheduleBody");
  const countEl = document.getElementById("scheduleCount");
  if (countEl) countEl.textContent = filtered.length;
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="10">
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <p>No schedules found. Try adjusting filters or add a new schedule.</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map((s) => {
      const reasons = getConflictReasons(s);
      const hasConflict = reasons.room.length > 0 || reasons.faculty.length > 0;
      // Show the ACTUAL problem, not a generic "Conflict" badge
      let conflictBadge;
      if (reasons.room.length > 0 && reasons.faculty.length > 0) {
        conflictBadge = `<span class="badge badge-conflict" title="${escapeHtml(getConflictMessages(s).join(" "))}">⚠️ Room + Faculty double-booked</span>`;
      } else if (reasons.room.length > 0) {
        conflictBadge = `<span class="badge badge-conflict" title="${escapeHtml(getConflictMessages(s).join(" "))}">⚠️ ${escapeHtml(s.room)} occupied (${reasons.room[0].course} — ${reasons.room[0].faculty})</span>`;
      } else if (reasons.faculty.length > 0) {
        conflictBadge = `<span class="badge badge-conflict" title="${escapeHtml(getConflictMessages(s).join(" "))}">⚠️ ${escapeHtml(s.faculty)} already has a class (${reasons.faculty[0].course} in ${reasons.faculty[0].room})</span>`;
      } else {
        conflictBadge = `<span class="badge badge-ok">✓ OK</span>`;
      }
      const dateText = s.date
        ? new Date(s.date + "T00:00:00").toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : s.createdAt
          ? new Date(s.createdAt).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—";
      const divText = escapeHtml(s.division || s.section || "Division A");
      return `
      <tr class="${hasConflict ? "row-conflict" : ""}">
        <td><strong>${escapeHtml(s.course)}</strong><br><small style="color:var(--text-muted)">${divText} • Sem ${s.semester || 1}</small></td>
        <td><span class="badge badge-lecture">${escapeHtml(s.department)}</span></td>
        <td>${escapeHtml(s.faculty)}</td>
        <td>${escapeHtml(s.room)}</td>
        <td>${escapeHtml(s.day)}</td>
        <td>${escapeHtml(s.time)}</td>
        <td>${dateText}</td>
        <td><span class="badge ${s.type === "Lab" ? "badge-lab" : "badge-lecture"}">${escapeHtml(s.type || "Lecture")}</span></td>
        <td>${conflictBadge}</td>
        <td class="actions-cell">
          <button class="btn btn-sm btn-ghost" data-action="edit" data-id="${s.id}" title="Edit">✏️</button>
          <button class="btn btn-sm btn-ghost" data-action="delete" data-id="${s.id}" title="Delete" style="color:var(--danger)">🗑️</button>
        </td>
      </tr>`;
    })
    .join("");
}

// Normalizes a name for comparison: trims, collapses spaces, case-insensitive.
// This catches "Prof. Rinkal" vs "prof.   rinkal " — trivial variants of the same name.
function normalizeName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// For dropdowns: if FACULTY somehow still contains two names that normalize to
// the same string (e.g. from old saved data or a hand-edit), label them so users
// can tell them apart instead of seeing two identical options.
function facultyDisplayNames(list) {
  const counts = {};
  list.forEach((f) => {
    const key = normalizeName(f);
    counts[key] = (counts[key] || 0) + 1;
  });
  const seen = {};
  return list.map((f) => {
    const key = normalizeName(f);
    if (counts[key] > 1) {
      seen[key] = (seen[key] || 0) + 1;
      return `${f} (#${seen[key]})`;
    }
    return f;
  });
}

function findConflicts(schedule) {
  if (!schedule) return [];
  const all = StorageService.getSchedules() || [];
  return all.filter((other) => {
    if (!other || other.id === schedule.id) return false;
    const sameDay = (other.day || "") === (schedule.day || "");
    const sameTime = (other.time || "") === (schedule.time || "");
    const sameRoom = (other.room || "") === (schedule.room || "");
    const sameFaculty =
      normalizeName(other.faculty) === normalizeName(schedule.faculty);
    return sameDay && sameTime && (sameRoom || sameFaculty);
  });
}

// Finds the first free room for the same day/time slot (suggestion helper)
function findFreeRoom(day, time, excludeId) {
  const all = StorageService.getSchedules() || [];
  const busy = new Set(
    all
      .filter((s) => s.day === day && s.time === time && s.id !== excludeId)
      .map((s) => s.room),
  );
  return ROOMS.find((r) => !busy.has(r)) || null;
}

// Returns the ACTUAL reason(s) a schedule conflicts, e.g.
// { room: [sched...], faculty: [sched...] } — so the UI can name the real problem.
function getConflictReasons(schedule) {
  const reasons = { room: [], faculty: [] };
  if (!schedule) return reasons;
  const all = StorageService.getSchedules() || [];
  all.forEach((other) => {
    if (!other || other.id === schedule.id) return;
    const sameDay = (other.day || "") === (schedule.day || "");
    const sameTime = (other.time || "") === (schedule.time || "");
    if (!sameDay || !sameTime) return;
    if ((other.room || "") === (schedule.room || "")) reasons.room.push(other);
    if (normalizeName(other.faculty) === normalizeName(schedule.faculty))
      reasons.faculty.push(other);
  });
  return reasons;
}

// Human-readable messages describing the exact problem.
function getConflictMessages(schedule) {
  const reasons = getConflictReasons(schedule);
  const msgs = [];
  reasons.room.forEach((other) => {
    msgs.push(
      `🏫 Room "${other.room}" is already occupied on ${other.day} at ${other.time} by "${other.course}" (${other.faculty}, ${other.division || "Division A"}, Sem ${other.semester || 1}).`,
    );
  });
  reasons.faculty.forEach((other) => {
    msgs.push(
      `👤 Faculty "${other.faculty}" is already taking "${other.course}" in ${other.room} on ${other.day} at ${other.time}.`,
    );
  });
  return msgs;
}

function openAddModal() {
  document.getElementById("modalTitle").textContent = "Add New Schedule";
  document.getElementById("scheduleForm").reset();
  document.getElementById("scheduleId").value = "";
  const dateEl = document.getElementById("schedDate");
  if (dateEl) dateEl.value = new Date().toISOString().slice(0, 10);
  const dept = document.getElementById("schedDept");
  if (dept && DEPARTMENTS.length > 0) {
    dept.value = DEPARTMENTS[0];
    updateCourseOptions(DEPARTMENTS[0]);
  }
  clearFormErrors();
  openModal("scheduleModal");
}

function openEditModal(id) {
  const schedule = StorageService.getSchedules().find((s) => s.id === id);
  if (!schedule) return;
  document.getElementById("modalTitle").textContent = "Edit Schedule";
  document.getElementById("scheduleId").value = schedule.id;
  document.getElementById("schedDept").value = schedule.department;
  updateCourseOptions(schedule.department);
  document.getElementById("schedCourse").value = schedule.course;

  document.getElementById("schedFaculty").value = schedule.faculty;
  document.getElementById("schedRoom").value = schedule.room;
  document.getElementById("schedDay").value = schedule.day;
  document.getElementById("schedTime").value = schedule.time;
  const dateEl = document.getElementById("schedDate");
  if (dateEl)
    dateEl.value =
      schedule.date ||
      (schedule.createdAt
        ? new Date(schedule.createdAt).toISOString().slice(0, 10)
        : "");
  document.getElementById("schedType").value = schedule.type || "Lecture";
  if (document.getElementById("schedDivision")) {
    document.getElementById("schedDivision").value =
      schedule.division || schedule.section || "Division A";
  }
  document.getElementById("schedSemester").value = schedule.semester || 1;
  clearFormErrors();
  openModal("scheduleModal");
}

function saveSchedule() {
  const id = document.getElementById("scheduleId").value;
  const dept = document.getElementById("schedDept").value;
  const course = document.getElementById("schedCourse").value;
  const faculty = document.getElementById("schedFaculty").value;
  const room = document.getElementById("schedRoom").value;
  const day = document.getElementById("schedDay").value;
  const time = document.getElementById("schedTime").value;
  const date = document.getElementById("schedDate")?.value || "";
  const type = document.getElementById("schedType").value;
  const division =
    document.getElementById("schedDivision")?.value || "Division A";
  const semester =
    parseInt(document.getElementById("schedSemester").value) || 1;
  const errors = [];

  if (!dept) errors.push(["schedDept", "Department is required."]);
  if (!course) errors.push(["schedCourse", "Course is required."]);
  if (!faculty) errors.push(["schedFaculty", "Faculty is required."]);
  if (!room) errors.push(["schedRoom", "Classroom is required."]);
  if (!day) errors.push(["schedDay", "Day is required."]);
  if (!time) errors.push(["schedTime", "Time slot is required."]);
  if (!date) errors.push(["schedDate", "Date is required."]);
  if (!division) errors.push(["schedDivision", "Division is required."]);
  if (semester < 1 || semester > 8)
    errors.push(["schedSemester", "Semester must be 1-8."]);

  if (errors.length > 0) {
    clearFormErrors();
    errors.forEach(([fieldId, msg]) => {
      const input = document.getElementById(fieldId);
      if (input) {
        input.classList.add("error");
        const wrapper = input.closest(".form-group");
        if (wrapper) {
          const errEl = wrapper.querySelector(".field-error");
          if (errEl) {
            errEl.textContent = msg;
            errEl.style.display = "block";
          }
        }
      }
    });
    showToast("Please select all required schedule options.", "error");
    return;
  }

  const schedules = StorageService.getSchedules();
  const newSchedule = {
    id: id ? parseInt(id) : getNextId(schedules),
    department: dept,
    course,
    faculty,
    room,
    day,
    time,
    type,
    division,
    semester,
    date,
    createdAt: Date.now(),
  };
  if (id) {
    const existing = schedules.find((s) => s.id === parseInt(id));
    if (existing && existing.createdAt)
      newSchedule.createdAt = existing.createdAt;
  }

  // HARD BLOCK on conflicts — the exact problem is shown in red on the form fields.
  const reasons = getConflictReasons(newSchedule);
  if (reasons.room.length > 0 || reasons.faculty.length > 0) {
    clearFormErrors();
    const fieldErrors = [];
    if (reasons.room.length > 0) {
      fieldErrors.push([
        "schedRoom",
        `Room "${room}" is already occupied on ${day} at ${time} by "${reasons.room[0].course}" (${reasons.room[0].faculty}).` +
          (findFreeRoom(day, time, newSchedule.id)
            ? ` Free alternative: ${findFreeRoom(day, time, newSchedule.id)}.`
            : ""),
      ]);
      fieldErrors.push([
        "schedTime",
        `Time slot ${time} is occupied in ${room} — pick a different slot or room.`,
      ]);
    }
    if (reasons.faculty.length > 0) {
      fieldErrors.push([
        "schedFaculty",
        `${faculty} is already taking "${reasons.faculty[0].course}" in ${reasons.faculty[0].room} on ${day} at ${time}.`,
      ]);
    }
    fieldErrors.forEach(([fieldId, msg]) => {
      const input = document.getElementById(fieldId);
      if (input) {
        input.classList.add("error");
        const wrapper = input.closest(".form-group");
        if (wrapper) {
          const errEl = wrapper.querySelector(".field-error");
          if (errEl) {
            errEl.textContent = msg;
            errEl.style.display = "block";
          }
        }
      }
    });
    getConflictMessages(newSchedule).forEach((m) => showToast(m, "error"));
    return; // Do NOT save — the room/faculty is already booked
  }

  if (id) {
    const idx = schedules.findIndex((s) => s.id === parseInt(id));
    if (idx !== -1) {
      schedules[idx] = { ...schedules[idx], ...newSchedule };
    }
    showToast("Schedule updated successfully! ✅", "success");
  } else {
    schedules.push(newSchedule);
    showToast("Schedule added successfully! 🎉", "success");
  }

  StorageService.saveSchedules(schedules);
  closeModal("scheduleModal");
  populateFilterSelects();
  populateFormSelects();
  renderSchedules();
  renderTimetableGrid();
  updateStats();
}

function deleteSchedule(id) {
  const schedules = StorageService.getSchedules();
  const sched = schedules.find((s) => s.id === id);
  if (!sched) return;
  if (
    !confirm(`Delete schedule: ${sched.course} (${sched.day} ${sched.time})?`)
  )
    return;
  const updated = schedules.filter((s) => s.id !== id);
  StorageService.saveSchedules(updated);
  showToast("Schedule deleted.", "success");
  populateFilterSelects();
  populateFormSelects();
  renderSchedules();
  renderTimetableGrid();
  updateStats();
}

function renderTimetableGrid() {
  const gridBody = document.getElementById("timetableBody");
  if (!gridBody) return;
  const filtered = filterSchedules();
  const header = document.querySelector("#timetable thead tr");

  if (header) {
    header.innerHTML =
      `<th class="time-col">Time</th>` +
      DAYS.map((d) => `<th>${d}</th>`).join("");
  }

  gridBody.innerHTML = CLASS_TIMES.map((time) => {
    const tds = DAYS.map((day) => {
      const slots = filtered.filter((s) => s.day === day && s.time === time);
      const cells =
        slots.length > 0
          ? slots
              .map((s) => {
                const reasons = getConflictReasons(s);
                const conflict =
                  reasons.room.length > 0 || reasons.faculty.length > 0;
                return `<div class="slot-pill ${s.type === "Lab" ? "lab" : "lecture"} ${conflict ? "conflict" : ""}" data-id="${s.id}" title="${escapeHtml(conflict ? getConflictMessages(s).join(" ") : "Click to edit")}">
          <div class="s-course">${escapeHtml(s.course)}</div>
          <div class="s-faculty">${escapeHtml(s.faculty)} • ${escapeHtml(s.room)}</div>
          <div style="font-size:10px;color:var(--text-muted)">${escapeHtml(s.date || "")}</div>
          ${conflict ? `<div style="color:var(--danger);font-size:10px">⚠️ ${escapeHtml(getConflictMessages(s)[0].split(".")[0])}</div>` : ""}
        </div>`;
              })
              .join("")
          : '<div class="slot-cell" style="min-height:68px"></div>';
      return `<td>${slots.length > 0 ? `<div class="slot-cell">${cells}</div>` : '<div class="slot-cell"></div>'}</td>`;
    }).join("");
    return `<tr><td class="time-col">${time}</td>${tds}</tr>`;
  }).join("");
}

function updateStats() {
  try {
    const all = StorageService.getSchedules() || [];
    const totalEl = document.getElementById("statTotal");
    const deptEl = document.getElementById("statDept");
    const roomEl = document.getElementById("statRooms");
    const conflictEl = document.getElementById("statConflicts");

    if (totalEl) totalEl.textContent = all.length;
    if (deptEl)
      deptEl.textContent = new Set(
        all.map((s) => s.department).filter(Boolean),
      ).size;
    if (roomEl)
      roomEl.textContent = new Set(all.map((s) => s.room).filter(Boolean)).size;

    const conflictIds = new Set();
    all.forEach((s) => {
      if (findConflicts(s).length > 0) {
        conflictIds.add(s.id);
      }
    });
    if (conflictEl) conflictEl.textContent = conflictIds.size;
  } catch (e) {
    console.error("Error updating stats:", e);
  }
}

function clearFormErrors() {
  document.querySelectorAll("#scheduleForm .field-error").forEach((el) => {
    el.style.display = "none";
  });
  document
    .querySelectorAll("#scheduleForm .form-control.error")
    .forEach((el) => el.classList.remove("error"));
}

function showFieldError(input, msg) {
  if (!input) return;
  input.classList.add("error");
  const wrapper = input.closest(".form-group");
  if (wrapper) {
    const errEl = wrapper.querySelector(".field-error");
    if (errEl) {
      errEl.textContent = msg;
      errEl.style.display = "block";
    }
  }
}

function initScannerModalSelects() {
  const scanDay = document.getElementById("scanDay");
  const scanTime = document.getElementById("scanTime");
  const scanDate = document.getElementById("scanDate");
  if (scanDay) {
    scanDay.innerHTML = DAYS.map(
      (d) => `<option value="${d}">${d}</option>`,
    ).join("");
    const todayName = new Date().toLocaleDateString("en-US", {
      weekday: "long",
    });
    if (DAYS.includes(todayName)) scanDay.value = todayName;
  }
  if (scanTime) {
    scanTime.innerHTML = CLASS_TIMES.map(
      (t) => `<option value="${t}">${t}</option>`,
    ).join("");
  }
  if (scanDate && !scanDate.value) {
    scanDate.value = new Date().toISOString().slice(0, 10);
    // Picking a date auto-selects the matching weekday (same behaviour as the schedule form)
    scanDate.addEventListener("change", () => {
      if (!scanDate.value) return;
      const d = new Date(scanDate.value + "T00:00:00");
      const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
      if (scanDay && DAYS.includes(dayName)) scanDay.value = dayName;
    });
  }

  const runScanBtn = document.getElementById("runScanBtn");
  if (runScanBtn) {
    runScanBtn.onclick = runScanner;
  }
}

function runScanner() {
  const day = document.getElementById("scanDay")?.value || DAYS[0];
  const time = document.getElementById("scanTime")?.value || CLASS_TIMES[0];
  const scanDate = document.getElementById("scanDate")?.value || "";
  const radarBox = document.getElementById("scannerRadarBox");
  const resultsBox = document.getElementById("scannerResults");

  if (radarBox) radarBox.style.display = "block";
  if (resultsBox) resultsBox.innerHTML = "";

  setTimeout(() => {
    if (radarBox) radarBox.style.display = "none";

    const all = StorageService.getSchedules();
    // A room is busy if a schedule matches the day+time slot and (it has no specific
    // date set — i.e. recurring weekly — or its date equals the scanned date).
    const busyRooms = new Set(
      all
        .filter(
          (s) =>
            s.day === day &&
            s.time === time &&
            (!s.date || !scanDate || s.date === scanDate),
        )
        .map((s) => s.room),
    );

    const freeRooms = ROOMS.filter((r) => !busyRooms.has(r));
    const occupiedCount = ROOMS.length - freeRooms.length;

    if (!resultsBox) return;

    if (freeRooms.length === 0) {
      resultsBox.innerHTML = `
        <div style="padding:20px;text-align:center;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:12px;color:var(--danger)">
          <div style="font-size:32px;margin-bottom:8px">⚠️</div>
          <h4>All ${ROOMS.length} Classrooms Occupied</h4>
          <p style="font-size:13px;opacity:0.9">No empty classrooms found for <b>${day}${scanDate ? " (" + scanDate + ")" : ""}</b> at <b>${time}</b>. Try selecting a different time slot.</p>
        </div>`;
      return;
    }

    resultsBox.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding:12px 16px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:10px">
        <div>
          <span style="font-weight:700;color:var(--success);font-size:14px">✅ Scan Complete: ${freeRooms.length} Empty Classrooms Found</span>
          <div style="font-size:12px;color:var(--text-muted)">Slot: <b>${day}${scanDate ? " (" + scanDate + ")" : ""}, ${time}</b> (${occupiedCount} rooms currently in use)</div>
        </div>
        <span class="badge badge-ok">${freeRooms.length} Available</span>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));gap:14px">
        ${freeRooms
          .map(
            (room) => `
          <div class="card" style="padding:16px;border:1px solid var(--border);position:relative;display:flex;flex-direction:column;justify-content:space-between;gap:12px">
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <h4 style="font-size:16px;font-weight:800;color:var(--text-primary)">🏫 ${escapeHtml(room)}</h4>
                <span class="badge badge-ok" style="font-size:10px">🟢 FREE</span>
              </div>
              <div style="font-size:12px;color:var(--text-muted)">
                📍 ${room.startsWith("Lab") ? "Computer Lab Wing" : "Academic Wing"}
              </div>
              <div style="font-size:11.5px;color:var(--text-secondary);margin-top:4px">
                Cap: ${room.startsWith("Lab") ? "40 Systems" : "60 Seats"}
              </div>
            </div>
            <button type="button" class="btn btn-sm btn-primary btn-block" data-room="${escapeHtml(room)}" data-day="${escapeHtml(day)}" data-time="${escapeHtml(time)}" data-date="${escapeHtml(scanDate)}">
              ⚡ Reserve / Allocate
            </button>
          </div>
        `,
          )
          .join("")}
      </div>`;
  }, 600);
}

function quickReserveRoom(room, day, time, date) {
  closeModal("scannerModal");
  openAddModal();
  setTimeout(() => {
    const rEl = document.getElementById("schedRoom");
    const dEl = document.getElementById("schedDay");
    const tEl = document.getElementById("schedTime");
    const dateEl = document.getElementById("schedDate");
    if (rEl) rEl.value = room;
    if (dEl) dEl.value = day;
    if (tEl) tEl.value = time;
    if (dateEl && date) dateEl.value = date;
  }, 50);
  showToast(`Pre-filled allocation for ${room} on ${day} (${time})`, "info");
}
