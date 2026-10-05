export default async function (page, ui) {
  const errs = [];
  page.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("frame-ancestors"))
      errs.push("CONSOLE: " + m.text());
  });

  // Login
  await page.goto("http://localhost:8791/index.html");
  await page.waitForTimeout(500);
  await page.fill("#loginEmail", "admin@college.edu");
  await page.fill("#loginPassword", "admin123");
  await page.click("#loginForm button[type=submit]");
  await page.waitForTimeout(1500);

  await page.goto("http://localhost:8791/schedule.html");
  await page.waitForTimeout(800);
  if (!(await page.$("#btnScanRooms")))
    return { error: "no scan btn", url: page.url() };

  await page.click("#btnScanRooms");
  await page.waitForTimeout(1400);

  const state = await page.evaluate(() => ({
    dateValue: document.getElementById("scanDate")?.value,
    dayValue: document.getElementById("scanDay")?.value,
    resultText: (
      document.getElementById("scannerResults")?.innerText || "EMPTY"
    ).slice(0, 180),
    cardCount: document.querySelectorAll("#scannerResults .card").length,
  }));

  // Change date to a future Monday-ish date and check day auto-updates
  await page.evaluate(() => {
    const el = document.getElementById("scanDate");
    el.value = "2026-10-05"; // a Monday
    el.dispatchEvent(new Event("change"));
  });
  const afterChange = await page.evaluate(() => ({
    dateValue: document.getElementById("scanDate")?.value,
    dayValue: document.getElementById("scanDay")?.value,
  }));

  // Re-run scan with that date, then reserve and check prefill includes date
  await page.click("#runScanBtn");
  await page.waitForTimeout(1400);
  await page.click("#scannerResults .card button[data-room]");
  await page.waitForTimeout(600);
  const reserve = await page.evaluate(() => ({
    room: document.getElementById("schedRoom")?.value,
    day: document.getElementById("schedDay")?.value,
    date: document.getElementById("schedDate")?.value,
  }));

  return { errs, state, afterChange, reserve };
}
