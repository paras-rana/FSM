/* eslint-disable no-console */
const baseUrl = process.env.BACKEND_BASE_URL ?? "http://localhost:4000";
const adminEmail = process.env.SMOKE_ADMIN_EMAIL ?? "admin@fsm.local";
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD ?? "Admin123!";

const jsonHeaders = {
  "Content-Type": "application/json"
};

const assertOk = async (response: Response, label: string) => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${label} failed (${response.status}): ${text}`);
  }
};

const run = async () => {
  console.log(`Smoke test started against ${baseUrl}`);

  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ email: adminEmail, password: adminPassword })
  });
  await assertOk(loginResponse, "Login");
  const loginData = (await loginResponse.json()) as { token: string };
  const token = loginData.token;
  console.log("Login OK");

  const publicSrResponse = await fetch(`${baseUrl}/api/service-requests/public`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      requestorName: "Smoke Requestor",
      contactInfo: "smoke@test.local",
      building: "HQ",
      area: "Front Desk",
      urgency: "MEDIUM",
      description: "Smoke test request"
    })
  });
  await assertOk(publicSrResponse, "Public service request");
  const srData = (await publicSrResponse.json()) as { id: string; sr_number: number };
  console.log(`Public SR created: ${srData.sr_number}`);

  const convertResponse = await fetch(`${baseUrl}/api/service-requests/${srData.id}/convert-to-wo`, {
    method: "POST",
    headers: {
      ...jsonHeaders,
      Authorization: `Bearer ${token}`
    }
  });
  await assertOk(convertResponse, "Convert service request");
  const woData = (await convertResponse.json()) as { id: string; wo_number: number };
  console.log(`Converted to WO: ${woData.wo_number}`);

  const statusResponse = await fetch(`${baseUrl}/api/work-orders/${woData.id}/status`, {
    method: "POST",
    headers: {
      ...jsonHeaders,
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ status: "ASSIGNED" })
  });
  await assertOk(statusResponse, "Set WO status ASSIGNED");
  console.log("Status transition OK");

  const reportResponse = await fetch(
    `${baseUrl}/api/reports/timesheets?from=2026-01-01&to=2026-12-31`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
  await assertOk(reportResponse, "Timesheet report query");
  console.log("Report query OK");

  console.log("Smoke test passed");
};

run().catch((error) => {
  console.error("Smoke test failed");
  console.error(error);
  process.exit(1);
});
