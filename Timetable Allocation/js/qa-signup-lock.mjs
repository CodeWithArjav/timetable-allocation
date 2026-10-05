export default async function run(page) {
  const out = {};
  // A) Signup rejects weak password, accepts strong one
  await page.goto("http://localhost:8791/signup.html");
  await page.evaluate(() => localStorage.clear());
  await page.fill("#signupName", "Dr. Test User");
  await page.fill("#signupEmail", "test.user@college.edu");
  await page.selectOption("#signupDepartment", "MCA");
  await page.selectOption("#signupRole", "faculty");
  await page.fill("#signupPassword", "weak");
  await page.fill("#signupConfirm", "weak");
  await page.click("#signupForm button[type=submit]");
  await page.waitForTimeout(500);
  out.weakRejected = page.url().endsWith("signup.html");
  out.weakError = await page.evaluate(
    () =>
      document
        .querySelector("#signupPassword")
        .closest(".form-group")
        .querySelector(".field-error").textContent,
  );

  await page.fill("#signupPassword", "Str0ng!Pass");
  await page.fill("#signupConfirm", "Str0ng!Pass");
  await page.click("#signupForm button[type=submit]");
  await page.waitForTimeout(500);
  out.strongAcceptedRedirect = page.url().endsWith("index.html");
  const users = JSON.parse(
    await page.evaluate(() => localStorage.getItem("tt_users") || "[]"),
  );
  const nu = users.find((u) => u.email.includes("test.user"));
  out.newUserHashed = !!(
    nu &&
    nu.salt &&
    /^[0-9a-f]{64}$/.test(nu.password) &&
    nu.approved === false
  );

  // B) Lockout: 5 wrong attempts -> locked, then even correct password blocked briefly
  await page.goto("http://localhost:8791/index.html");
  await page.evaluate(() => localStorage.clear());
  for (let i = 0; i < 5; i++) {
    await page.fill("#loginEmail", "admin@college.edu");
    await page.fill("#loginPassword", "bad" + i + "-pass");
    await page.click("#loginForm button[type=submit]");
    await page.waitForTimeout(150);
  }
  out.lockState = JSON.parse(
    await page.evaluate(
      () => localStorage.getItem("tt_lockout_state_v1") || "{}",
    ),
  );
  out.lockActive = out.lockState.until > Date.now();
  await page.fill("#loginPassword", "admin123");
  await page.click("#loginForm button[type=submit]");
  await page.waitForTimeout(700);
  out.correctBlockedWhileLocked = !page.url().includes("dashboard");
  return out;
}
