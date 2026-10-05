export default async function run(page) {
  const out = { timeline: [] };
  await page.goto("http://localhost:8791/index.html");
  await page.evaluate(() => localStorage.clear());
  await page.fill("#loginEmail", "admin@college.edu");
  await page.fill("#loginPassword", "WRONG-pass-1");
  await page.click("#loginForm button[type=submit]");
  await page.waitForTimeout(700);
  await page.fill("#loginPassword", "admin123");
  await page.click("#loginForm button[type=submit]");
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(250);
    out.timeline.push(i + ":" + page.url().split("/").pop());
  }
  out.session = await page.evaluate(() => localStorage.getItem("tt_session"));
  out.toasts = await page.evaluate(() =>
    [...document.querySelectorAll(".toast")].map((t) => t.textContent),
  );
  return out;
}
