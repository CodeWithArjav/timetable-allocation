export default async function run(page) {
  const out = {};
  await page.goto("http://localhost:8791/index.html");
  await page.evaluate(() => localStorage.clear());
  // fail once, like QA step 2
  await page.fill("#loginEmail", "admin@college.edu");
  await page.fill("#loginPassword", "WRONG-pass-1");
  await page.click("#loginForm button[type=submit]");
  await page.waitForTimeout(700);
  out.lockStateAfterFail = await page.evaluate(() =>
    localStorage.getItem("tt_lockout_state_v1"),
  );
  // now correct login
  await page.fill("#loginPassword", "admin123");
  await page.click("#loginForm button[type=submit]");
  await page.waitForTimeout(2500);
  out.urlAfterCorrect = page.url();
  out.sessionAfterCorrect = await page.evaluate(() =>
    localStorage.getItem("tt_session"),
  );
  out.lockStateAfterCorrect = await page.evaluate(() =>
    localStorage.getItem("tt_lockout_state_v1"),
  );
  return out;
}
