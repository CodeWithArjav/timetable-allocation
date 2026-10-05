export default async function run(page) {
  const out = { samples: [] };
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
  for (let i = 0; i < 16; i++) {
    await page.waitForTimeout(150);
    const u = page.url();
    let state = null;
    try {
      state = await page.evaluate(() => ({
        reject: sessionStorage.getItem("dbg_reject"),
        hasSession: !!localStorage.getItem("tt_session"),
        init: document.documentElement.getAttribute("data-init"),
      }));
    } catch (e) {
      state = { err: String(e).slice(0, 60) };
    }
    out.samples.push({ t: i * 150, page: u.split("/").pop(), ...state });
  }
  return out;
}
