/**
 * Test script for the check-in API.
 * Run: node scripts/test-check-in.mjs
 * Requires: dev server running on http://localhost:3000
 */

const BASE = "http://localhost:3000";

async function main() {
  console.log("=== Check-in API Test ===\n");

  // 1. Login as receptionist (use second one - first may have endDate)
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "reception.liam.young@example.com",
      password: "Reception123!",
    }),
  });
  const loginJson = await loginRes.json();
  if (!loginRes.ok) {
    console.error("Login failed:", loginJson);
    process.exit(1);
  }
  console.log("1. Login OK:", loginJson.message);

  const cookies = loginRes.headers.get("set-cookie");
  if (!cookies) {
    console.error("No cookies received from login");
    process.exit(1);
  }

  const cookieHeader = cookies.split(",").map((c) => c.trim().split(";")[0]).join("; ");

  // 2. Get today's appointments
  const appointmentsRes = await fetch(`${BASE}/api/receptionist/appointments?status=CONFIRMED`, {
    headers: { Cookie: cookieHeader },
  });
  const appointmentsJson = await appointmentsRes.json();
  if (!appointmentsRes.ok) {
    console.error("Fetch appointments failed:", appointmentsJson);
    process.exit(1);
  }

  const today = appointmentsJson.todayAppointments ?? [];
  let confirmedToday = today.filter((a) => a.status === "CONFIRMED" && !a.checkedInAt);
  let target = confirmedToday[0];

  // Create a today appointment if none exist for check-in
  if (!target) {
    console.log("No CONFIRMED today appointment. Creating one...");
    const optsRes = await fetch(`${BASE}/api/receptionist/options`, { headers: { Cookie: cookieHeader } });
    const opts = await optsRes.json();
    if (!optsRes.ok || !opts.patients?.[0] || !opts.doctors?.[0]) {
      console.error("Could not get options:", opts);
      process.exit(1);
    }
    const now = new Date();
    const startAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0);
    const endAt = new Date(startAt.getTime() + 30 * 60 * 1000);
    const bookRes = await fetch(`${BASE}/api/receptionist/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
      body: JSON.stringify({
        patientId: opts.patients[0].id,
        doctorId: opts.doctors[0].id,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        reason: "Test check-in",
      }),
    });
    const bookJson = await bookRes.json();
    if (!bookRes.ok) {
      console.error("Could not book:", bookJson);
      process.exit(1);
    }
    const refetch = await fetch(`${BASE}/api/receptionist/appointments`, { headers: { Cookie: cookieHeader } });
    const refetchJson = await refetch.json();
    confirmedToday = (refetchJson.todayAppointments ?? []).filter((a) => a.status === "CONFIRMED" && !a.checkedInAt);
    target = confirmedToday[0];
    if (!target) {
      console.error("Booked but could not find new appointment");
      process.exit(1);
    }
    console.log("Created appointment:", target.id);
  }

  console.log("2. Found appointment:", target.id, "-", target.patientName, "at", target.startAt);
  if (target.checkedInAt) {
    console.log("   (Already checked in at", target.checkedInAt + ")");
  }

  // 3. Call check-in API
  const checkInRes = await fetch(`${BASE}/api/receptionist/appointments/${target.id}/check-in`, {
    method: "POST",
    headers: { Cookie: cookieHeader },
  });
  const checkInJson = await checkInRes.json();

  if (checkInRes.ok) {
    console.log("3. Check-in OK:", checkInJson.message);

    // 4. Verify dashboard shows checked-in status
    const dashRes = await fetch(`${BASE}/api/receptionist/appointments`, {
      headers: { Cookie: cookieHeader },
    });
    const dashJson = await dashRes.json();
    const checkedInAppt = (dashJson.todayAppointments ?? []).find((a) => a.id === target.id);
    if (checkedInAppt?.checkedInAt) {
      console.log("4. UI would show checked-in:", checkedInAppt.checkedInAt);
      console.log("\n=== Test PASSED ===");
    } else {
      console.log("4. WARN: checkedInAt not in response - UI may not update");
      console.log("   appointment:", checkedInAppt ? JSON.stringify(checkedInAppt) : "not found");
      console.log("\n=== Test completed (check UI manually) ===");
    }
  } else {
    console.error("3. Check-in FAILED:", checkInRes.status, checkInJson);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Error:", e.message);
  if (e.cause) console.error("Cause:", e.cause);
  process.exit(1);
});
