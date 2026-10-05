export default async function run(page) {
  const out = {};
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + String(e)));
  page.on("console", (m) => errors.push(m.type() + ": " + m.text()));
  await page.goto("http://localhost:8791/dashboard.html", {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(1000);
  out.appJsHead = await page.evaluate(async () => {
    const r = await fetch("js/app.js?v=" + Math.random());
    return (await r.text()).slice(0, 300);
  });
  out.errors = errors;
  return out;
}
