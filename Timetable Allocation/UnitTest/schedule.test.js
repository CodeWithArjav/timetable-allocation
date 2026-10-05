/**
 * Unit tests for HTML/js/schedule.js — conflict detection & room search.
 * Run with: node --test UnitTest/
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { bootstrap } = require("./helpers/load");

bootstrap(["security.js", "data.js", "schedule.js"]);

const DAY = "Monday";
const SLOT = CLASS_TIMES[0]; // '07:30 AM - 02:10 PM'
const otherSlot = CLASS_TIMES[1];

const seed = () => {
  localStorage.clear();
  return StorageService.getSchedules();
};

test.afterEach(() => localStorage.clear());

/* ---------------- findConflicts ---------------- */

test("findConflicts returns [] on the clean seeded timetable (positive)", () => {
  const all = seed();
  all.forEach((s) =>
    assert.deepEqual(
      findConflicts(s),
      [],
      `seed id ${s.id} must be conflict-free`,
    ),
  );
});

test("findConflicts detects a room double-booking (positive)", () => {
  const all = seed();
  const intruder = {
    id: 900,
    department: "MCA",
    course: "Intruder Course",
    faculty: FACULTY.find((f) => f !== all[0].faculty), // roster name (reseed guard)
    room: all[0].room,
    day: all[0].day,
    time: all[0].time,
    type: "Lecture",
    division: "Division B",
    semester: 1,
  };
  all.push(intruder);
  StorageService.saveSchedules(all);
  const conflicts = findConflicts(intruder);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].id, all[0].id);
});

test("findConflicts detects a faculty double-booking across different rooms (positive)", () => {
  const all = seed();
  const intruder = {
    id: 901,
    department: "MCA",
    course: "Elsewhere Course",
    faculty: all[0].faculty,
    room: ROOMS.find((r) => r !== all[0].room),
    day: all[0].day,
    time: all[0].time,
    type: "Lecture",
    division: "Division C",
    semester: 1,
  };
  all.push(intruder);
  StorageService.saveSchedules(all);
  assert.equal(
    findConflicts(intruder).length,
    1,
    "same person cannot be in two rooms at once",
  );
});

test("findConflicts does NOT flag different time slots (positive: no false alarm)", () => {
  const all = seed();
  const other = {
    id: 902,
    department: "MCA",
    course: "Later Course",
    faculty: all[0].faculty,
    room: all[0].room,
    day: all[0].day,
    time: otherSlot,
    type: "Lecture",
    division: "Division A",
    semester: 1,
  };
  all.push(other);
  StorageService.saveSchedules(all);
  assert.deepEqual(findConflicts(other), []);
});

test("findConflicts does NOT flag same room/time on a different day", () => {
  const all = seed();
  const other = {
    id: 903,
    department: "MCA",
    course: "Tuesday Course",
    faculty: all[0].faculty,
    room: all[0].room,
    day: "Tuesday",
    time: all[0].time,
    type: "Lecture",
    division: "Division A",
    semester: 1,
  };
  all.push(other);
  StorageService.saveSchedules(all);
  assert.deepEqual(findConflicts(other), []);
});

test("findConflicts never flags a schedule against itself (edge: same id)", () => {
  const all = seed();
  assert.deepEqual(
    findConflicts(all[0]).filter((s) => s.id === all[0].id),
    [],
  );
});

test("findConflicts handles null input (edge)", () => {
  assert.deepEqual(findConflicts(null), []);
  assert.deepEqual(findConflicts(undefined), []);
});

/* ---------------- getConflictReasons ---------------- */

test("getConflictReasons separates room and faculty causes", () => {
  const all = seed();
  const both = {
    id: 904,
    course: "Clash",
    faculty: all[0].faculty,
    room: all[0].room,
    day: all[0].day,
    time: all[0].time,
  };
  all.push(both);
  StorageService.saveSchedules(all);
  const reasons = getConflictReasons(both);
  assert.equal(reasons.room.length, 1, "room cause identified");
  assert.equal(reasons.faculty.length, 1, "faculty cause identified");
  assert.equal(reasons.room[0].id, all[0].id);
});

test("getConflictReasons returns empty causes when there is no clash (negative)", () => {
  const all = seed();
  const lonely = {
    id: 905,
    course: "Solo",
    faculty: "Prof. Unique Person",
    room: ROOMS.find((r) => !all.some((s) => s.room === r)),
    day: "Friday",
    time: otherSlot,
  };
  const reasons = getConflictReasons(lonely);
  assert.deepEqual(reasons, { room: [], faculty: [] });
});

test("getConflictReasons is edge-safe for null input", () => {
  assert.deepEqual(getConflictReasons(null), { room: [], faculty: [] });
});

/* ---------------- getConflictMessages ---------------- */

test("getConflictMessages produces human-readable messages naming the real cause", () => {
  const all = seed();
  const intruder = {
    id: 906,
    course: "Intruder Course",
    faculty: FACULTY.find((f) => f !== all[0].faculty), // roster name (reseed guard)
    room: all[0].room,
    day: all[0].day,
    time: all[0].time,
  };
  all.push(intruder);
  StorageService.saveSchedules(all);
  const msgs = getConflictMessages(intruder);
  assert.equal(msgs.length, 1);
  assert.ok(msgs[0].includes(all[0].room), "message names the occupied room");
  assert.ok(
    msgs[0].includes(all[0].faculty),
    "message names the occupying faculty",
  );
  assert.ok(msgs[0].includes(all[0].day));
});

/* ---------------- findFreeRoom ---------------- */

test("findFreeRoom finds an unoccupied room for a busy slot (positive)", () => {
  const all = seed();
  const free = findFreeRoom(all[0].day, all[0].time, null);
  assert.ok(free, "a free room exists in the seed");
  assert.ok(ROOMS.includes(free));
  assert.ok(
    !all.some(
      (s) => s.day === all[0].day && s.time === all[0].time && s.room === free,
    ),
  );
});

test("findFreeRoom excludes a specific schedule id from consideration (edge: editing)", () => {
  const all = seed();
  const busyRoom = all[0].room;
  // Excluding the only occupier means the room is now "free" for that editor
  const free = findFreeRoom(all[0].day, all[0].time, all[0].id);
  assert.ok(free);
  assert.equal(
    free === busyRoom,
    !all.some(
      (s) =>
        s.id !== all[0].id &&
        s.day === all[0].day &&
        s.time === all[0].time &&
        s.room === busyRoom,
    ),
  );
});

test("findFreeRoom returns null when every room is booked (edge)", () => {
  const all = seed();
  const used = new Set();
  const fullyBooked = ROOMS.map((room, i) => {
    used.add(room);
    return {
      id: 1000 + i,
      department: "MCA",
      course: `Filler ${i}`,
      faculty: FACULTY[i % FACULTY.length], // roster names only (reseed guard)
      room,
      day: "Wednesday",
      time: otherSlot,
      type: "Lecture",
      division: "Division A",
      semester: 1,
    };
  });
  StorageService.saveSchedules([...all, ...fullyBooked]);
  assert.equal(
    findFreeRoom("Wednesday", otherSlot, null),
    null,
    "no free room remains",
  );
});

/* ---------------- module wiring / self-init guard (regression) ---------------- */

test("loading schedule.js in a bare DOM does not crash or mutate storage (self-init guard)", () => {
  // schedule.js was loaded with the stub document (no #scheduleContent node);
  // if its self-init had run against a real page without the node it would throw.
  assert.ok(Array.isArray(StorageService.getSchedules()));
  assert.equal(typeof findConflicts, "function");
});
