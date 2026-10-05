/**
 * Test harness: installs browser stubs and loads the real, unmodified
 * production scripts into the global scope (like a <script> tag would).
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { installStubs } = require("./stubs");

const SCRIPT_DIR = path.join(__dirname, "..", "..", "HTML", "js");

/** Load a single production script by filename. */
function loadScript(name) {
  const file = path.join(SCRIPT_DIR, name);
  const code = fs.readFileSync(file, "utf8");
  vm.runInThisContext(code, { filename: file });
  return file;
}

/**
 * Install stubs and load the given scripts (default: security + data,
 * the two foundation modules every other module depends on).
 */
function bootstrap(files = ["security.js", "data.js"]) {
  const env = installStubs();
  files.forEach(loadScript);
  return env;
}

module.exports = { bootstrap, loadScript };
