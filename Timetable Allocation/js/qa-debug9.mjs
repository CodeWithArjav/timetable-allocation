export default async function run(page) {
  const out = {};
  await page.goto("http://localhost:8791/index.html");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.fill("#loginEmail", "admin@college.edu");
  await page.fill("#loginPassword", "WRONG-pass-1");
  await page.click("#loginForm button[type=submit]");
  await page.waitForTimeout(700);
  await page.fill("#loginPassword", "admin123");
  await page.click("#loginForm button[type=submit]");
  // wait until dashboard appears
  for (let i = 0; i < 20 && !page.url().includes("dashboard"); i++)
    await page.waitForTimeout(200);
  out.onDashboard = page.url();
  out.snapshot = await page.evaluate(() => ({
    reject: sessionStorage.getItem("dbg_reject"),
    session: localStorage.getItem("tt_session"),
    fpAttr: navigator.userAgent.length,
  }));
  out.sessionFpCheck = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tt_session") || "null");
    return s
      ? {
          fp: s.fp,
          exp: s.token && JSON.parse(s.token.payload).exp,
          now: Date.now(),
        }
      : null;
  });
  return out;
}
