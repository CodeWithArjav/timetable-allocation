/**
 * Unit tests for HTML/js/chat.js — natural-language parsing (extractors)
 * and query routing.
 * Run with: node --test UnitTest/
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { bootstrap } = require("./helpers/load");

bootstrap(["security.js", "data.js", "chat.js"]);
StorageService.getSchedules(); // force seed so handlers have data

/* ---------------- extractDay ---------------- */

test("extractDay recognises full day names (positive)", () => {
  const cases = {
    "classes on monday": "Monday",
    "anything tuesday": "Tuesday",
    "wednesday in caps is lowercased by the pipeline": "Wednesday",
    "thursday plan": "Thursday",
    "friday free rooms": "Friday",
    "saturday load": "Saturday",
  };
  for (const [q, expected] of Object.entries(cases)) {
    assert.equal(extractDay(q), expected, q);
  }
});

test("extractDay recognises abbreviations (mon/tue/wed/thu/fri/sat)", () => {
  assert.equal(extractDay("free rooms mon"), "Monday");
  assert.equal(extractDay("busy tue"), "Tuesday");
  assert.equal(extractDay("wed schedule"), "Wednesday");
});

test("extractDay returns null when no day is mentioned (negative)", () => {
  assert.equal(extractDay("show me everything"), null);
  assert.equal(extractDay(""), null);
  assert.equal(extractDay("help"), null);
});

/* ---------------- extractTime ---------------- */

test("extractTime maps a mentioned hour onto the real full-day CLASS_TIMES block (positive)", () => {
  const morning = CLASS_TIMES.find((t) => t.includes("AM"));
  const afternoon = CLASS_TIMES.find((t) => t.includes("PM"));
  assert.equal(extractTime("free rooms at 10:00"), morning);
  assert.equal(extractTime("scan at 9am"), morning);
  assert.equal(extractTime("any rooms at 3 pm"), afternoon);
  assert.equal(extractTime("4pm free?"), afternoon);
});

test("extractTime NEVER fabricates a slot that does not exist in CLASS_TIMES (regression for bug #2)", () => {
  const result = extractTime("which rooms are free on friday at 02:00-03:00?");
  assert.ok(
    result === null || CLASS_TIMES.includes(result),
    "returned slot must be a real one",
  );
});

test("extractTime returns null when no time is mentioned (negative)", () => {
  assert.equal(extractTime("which rooms are free on tuesday"), null);
});

/* ---------------- extractFaculty ---------------- */

test("extractFaculty matches a full faculty name with proper casing (positive)", () => {
  assert.equal(
    extractFaculty("show me prof. rinku patil schedule"),
    "Prof. Rinku Patil",
  );
  assert.equal(
    extractFaculty("what does prof. poonam patil teach"),
    "Prof. Poonam Patil",
  );
});

test("extractFaculty returns the properly-cased roster name, not lowercase query text (regression for bug #4)", () => {
  const result = extractFaculty("prof. rinku patil schedule");
  assert.equal(
    result,
    FACULTY.find((f) => f === result),
    "must be an exact roster entry",
  );
  assert.notEqual(result, result.toLowerCase());
});

test("extractFaculty matches by surname alone", () => {
  assert.equal(
    extractFaculty("when does bhadoriya teach"),
    "Prof. Shivani Bhadoriya",
  );
});

test('extractFaculty returns the raw guess for unknown "prof." names, which the handler then reports as not found (negative)', () => {
  const result = extractFaculty("show me prof. nobody nowhere schedule");
  assert.ok(
    result === null || !FACULTY.includes(result),
    "unknown names must not resolve to a roster entry",
  );
  const reply = processQuery("show me prof. nobody nowhere schedule");
  assert.match(reply, /No schedule found/i);
});

processQuery("show me prof. nobody nowhere schedule"); // smoke: must not throw

/* ---------------- extractRoom ---------------- */

test("extractRoom recognises rooms from the roster (positive)", () => {
  assert.equal(extractRoom("what is in room 301 on monday"), "Room 301");
  assert.equal(extractRoom("is lab 602 busy"), "Lab 602");
});

test("extractRoom returns null for unknown rooms (negative)", () => {
  assert.equal(extractRoom("what is in room 999"), null);
  assert.equal(extractRoom("no room here"), null);
});

/* ---------------- extractDepartment ---------------- */

test("extractDepartment recognises every real department (positive)", () => {
  assert.equal(extractDepartment("show bca schedule for friday"), "BCA");
  assert.equal(extractDepartment("bsc-it schedule"), "BSC-IT");
  assert.equal(extractDepartment("msc-it classes"), "MSC-IT");
  assert.equal(extractDepartment("imca timetable"), "IMCA");
  assert.equal(extractDepartment("mca timetable"), "MCA");
  assert.equal(extractDepartment("bca hons schedule"), "BCA HONS");
});

test("extractDepartment is not confused by substring aliases (regression for bug #3)", () => {
  // "imca" contains "mca" — must still resolve to IMCA
  assert.equal(extractDepartment("show imca schedule"), "IMCA");
  assert.equal(extractDepartment("show mca schedule"), "MCA");
});

test("extractDepartment returns null for unknown departments (negative)", () => {
  assert.equal(extractDepartment("show cse schedule"), null);
  assert.equal(extractDepartment("any conflicts today"), null);
});

/* ---------------- processQuery routing ---------------- */

test("processQuery returns the scanner view for room-scan queries (positive)", () => {
  const reply = processQuery("scan empty classrooms for monday at 10:00");
  assert.match(reply, /Classroom Scanner Results|Available/i);
});

test("processQuery returns a faculty schedule for a faculty query", () => {
  const reply = processQuery("show me prof. rinku patil schedule");
  assert.match(reply, /Rinku Patil/i);
  assert.match(reply, /Total:/);
});

test("processQuery reports conflicts handler for conflict queries", () => {
  const reply = processQuery("any conflicts on wednesday?");
  assert.match(reply, /No conflicts found|conflict/i);
});

test("processQuery answers department queries (regression: BCA chip now works)", () => {
  const reply = processQuery("show bca schedule for friday");
  assert.match(reply, /BCA/i);
  assert.match(reply, /Schedule/i);
});

test("processQuery answers totals queries", () => {
  const reply = processQuery("total classes in the system?");
  assert.match(reply, /\d+ schedules/);
});

test('processQuery returns help text for "help"', () => {
  assert.match(processQuery("help"), /I can help you with/i);
});

test("processQuery greets politely", () => {
  assert.match(processQuery("hello"), /How can I help/i);
});

test("processQuery has a graceful fallback for unknown input (negative)", () => {
  const reply = processQuery("xyzzy blorp 12345 ???");
  assert.match(reply, /not sure I understood/i);
});

test("processQuery never leaks raw schedules for empty data (edge)", () => {
  localStorage.setItem("tt_schedules", "[]");
  const reply = processQuery("what is today's schedule?");
  assert.match(reply, /no classes scheduled|free day/i);
});
