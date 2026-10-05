export default async function run(page) {
  const out = {};
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + String(e)));
  page.on("console", (m) => errors.push(m.type() + ": " + m.text()));
  // seed a distinct theme so initTheme's effect is observable
  await page.addInitScript(() => {
    try {
      localStorage.setItem("tt_theme", "light");
    } catch (e) {}
    document.addEventListener("DOMContentLoaded", () => {
      window.__dclProbe = (window.__dclProbe || 0) + 1;
    });
  });
  await page.goto("http://localhost:8791/dashboard.html", {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(1500);
  out.theme = await page.evaluate(() =>
    document.documentElement.getAttribute("data-theme"),
  );
  out.dcl = await page.evaluate(() => window.__dclProbe);
  out.container = await page.evaluate(
    () => !!document.querySelector(".toast-container"),
  );
  out.errors = errors;
  return out;
}
