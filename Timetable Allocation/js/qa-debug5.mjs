export default async function run(page) {
  const out = {};
  await page.goto("http://localhost:8791/index.html");
  await page.evaluate(() => localStorage.clear());
  await page.fill("#loginEmail", "admin@college.edu");
  await page.fill("#loginPassword", "admin123");
  await page.click("#loginForm button[type=submit]");
  await page.waitForTimeout(2500);
  out.urlAfterLogin = page.url();
  out.session = await page.evaluate(() => localStorage.getItem("tt_session"));
  await page.goto("http://localhost:8791/it-support.html");
  await page.waitForTimeout(2500);
  out.urlAfterIt = page.url();
  out.sessionAfterIt = await page.evaluate(() =>
    localStorage.getItem("tt_session"),
  );
  return out;
}
