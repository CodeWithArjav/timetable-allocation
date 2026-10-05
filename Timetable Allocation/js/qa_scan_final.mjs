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

  // Schedule page
  await page.goto("http://localhost:8791/schedule.html");
  await page.waitForTimeout(800);
  const scanBtn = await page.$("#btnScanRooms");
  if (!scanBtn)
    return { error: "no #btnScanRooms after login", url: page.url(), errs };

  await scanBtn.click();
  await page.waitForTimeout(1400); // radar animation

  const state = await page.evaluate(() => {
    const modal = document.getElementById("scannerModal");
    const results = document.getElementById("scannerResults");
    return {
      modalVisible: modal ? getComputedStyle(modal).display !== "none" : false,
      modalClass: modal?.className,
      resultCount: results ? results.querySelectorAll(".card").length : -1,
      resultText: (results?.innerText || "EMPTY").slice(0, 250),
      runBtnBound:
        typeof document.getElementById("runScanBtn")?.onclick === "function",
    };
  });

  // Test reserve button (delegation) if cards exist
  let reserveTest = null;
  if (state.resultCount > 0) {
    await page.click("#scannerResults .card button[data-room]");
    await page.waitForTimeout(600);
    reserveTest = await page.evaluate(() => ({
      addModalVisible:
        getComputedStyle(document.getElementById("scheduleModal")).display !==
        "none",
      roomPrefill: document.getElementById("schedRoom")?.value,
      dayPrefill: document.getElementById("schedDay")?.value,
    }));
  }

  return { errs, state, reserveTest };
}
