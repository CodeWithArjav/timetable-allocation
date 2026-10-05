export default async function (page, ui) {
  // login first
  const snap0 = await ui.snapshot();
  if (snap0.includes("textbox") || snap0.includes("Sign")) {
    const email = snap0.match(/@e\d+(?= textbox)/);
    // fill login form generically
    await page.evaluate(() => {
      const ins = document.querySelectorAll("input");
      ins.forEach((i) => {
        i.value =
          i.type === "password"
            ? "Test@1234"
            : i.type === "email"
              ? "admin@college.edu"
              : "admin@college.edu";
      });
    });
    const btn = document.querySelector('button[type="submit"]');
    await page.click('#loginBtn, button[type="submit"]');
    await page.waitForTimeout(1200);
  }
  // go to schedule page
  await page.goto("http://localhost:8123/schedule.html");
  await page.waitForTimeout(800);
  // click scan button
  await page.click("#btnScanRooms");
  await page.waitForTimeout(2500);
  const results = await page.evaluate(
    () =>
      document.querySelector("#scannerResults")?.innerHTML.slice(0, 500) ||
      "EMPTY",
  );
  return { results };
}
