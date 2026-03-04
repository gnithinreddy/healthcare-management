const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const ROLES = ["PATIENT", "DOCTOR", "ADMIN", "PHARMACIST", "RECEPTIONIST"];

async function ensureRoles() {
  for (const name of ROLES) {
    await prisma.role.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }
}

async function main() {
  await ensureRoles();

  const roleAdmin = await prisma.role.findUnique({ where: { name: "ADMIN" } });
  const rolePatient = await prisma.role.findUnique({ where: { name: "PATIENT" } });
  const roleDoctor = await prisma.role.findUnique({ where: { name: "DOCTOR" } });
  const rolePharmacist = await prisma.role.findUnique({ where: { name: "PHARMACIST" } });
  const roleReceptionist = await prisma.role.findUnique({ where: { name: "RECEPTIONIST" } });

  // 1 admin
  const adminEmail = "admin@gmail.com";
  const adminPassword = "admin123";
  const existingAdmin = await prisma.userAccount.findFirst({
    where: { email: adminEmail },
  });
  if (!existingAdmin) {
    const person = await prisma.person.create({
      data: {
        firstName: "Admin",
        lastName: "User",
        email: adminEmail,
        dob: new Date("1980-05-15"),
        sex: "Male",
        phone: "+1-555-0100",
        address1: "100 Hospital Drive",
        address2: "Suite 500",
        city: "Boston",
        state: "MA",
        zip: "02101",
      },
    });
    await prisma.userAccount.create({
      data: {
        personId: person.id,
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 12),
        roles: { create: { roleId: roleAdmin.id } },
      },
    });
    await prisma.admin.create({
      data: {
        personId: person.id,
        joinedDate: new Date("2019-01-15"),
      },
    });
    console.log("Admin created: admin@gmail.com / admin123");
  } else {
    console.log("Admin already exists.");
  }

  const clinic =
    (await prisma.clinic.findFirst()) ??
    (await prisma.clinic.create({
      data: {
        name: "Main Clinic",
        phone: "+1-555-0200",
        address1: "200 Medical Center Blvd",
        city: "New York",
        state: "NY",
        zip: "10001",
      },
    }));

  const pharmacy =
    (await prisma.pharmacy.findFirst()) ??
    (await prisma.pharmacy.create({
      data: { name: "Main Pharmacy", clinicId: clinic.id, phone: "+1-555-0300" },
    }));

  // Pharmacy inventory - 100 common drugs for prescription autocomplete
  const drugList = [
    "Tylenol", "Tylenol Extra Strength", "Tylenol Cold", "Tylenol PM", "Tylenol Arthritis",
    "Ibuprofen 200mg", "Ibuprofen 400mg", "Ibuprofen 600mg", "Motrin", "Advil",
    "Acetaminophen 500mg", "Acetaminophen 650mg", "Paracetamol 500mg", "Paracetamol 1000mg",
    "Amoxicillin 250mg", "Amoxicillin 500mg", "Amoxicillin 875mg", "Amoxicillin-clavulanate",
    "Azithromycin 250mg", "Azithromycin 500mg", "Zithromax", "Z-Pack",
    "Omeprazole 20mg", "Omeprazole 40mg", "Prilosec", "Omeprazole DR",
    "Lisinopril 5mg", "Lisinopril 10mg", "Lisinopril 20mg", "Zestril",
    "Amlodipine 5mg", "Amlodipine 10mg", "Norvasc",
    "Metformin 500mg", "Metformin 850mg", "Metformin 1000mg", "Glucophage",
    "Atorvastatin 10mg", "Atorvastatin 20mg", "Atorvastatin 40mg", "Lipitor",
    "Levothyroxine 25mcg", "Levothyroxine 50mcg", "Levothyroxine 75mcg", "Levothyroxine 100mcg", "Synthroid",
    "Metoprolol 25mg", "Metoprolol 50mg", "Metoprolol 100mg", "Lopressor", "Metoprolol Tartrate",
    "Losartan 25mg", "Losartan 50mg", "Losartan 100mg", "Cozaar",
    "Albuterol HFA", "Albuterol Inhaler", "ProAir", "Ventolin",
    "Gabapentin 100mg", "Gabapentin 300mg", "Gabapentin 600mg", "Neurontin",
    "Sertraline 25mg", "Sertraline 50mg", "Sertraline 100mg", "Zoloft",
    "Escitalopram 5mg", "Escitalopram 10mg", "Escitalopram 20mg", "Lexapro",
    "Prednisone 5mg", "Prednisone 10mg", "Prednisone 20mg", "Deltasone",
    "Tramadol 50mg", "Tramadol 100mg", "Ultram",
    "Hydrocodone-Acetaminophen 5/325", "Hydrocodone-Acetaminophen 7.5/325", "Norco",
    "Naproxen 250mg", "Naproxen 500mg", "Aleve", "Naprosyn",
    "Furosemide 20mg", "Furosemide 40mg", "Lasix",
    "Pantoprazole 20mg", "Pantoprazole 40mg", "Protonix",
    "Doxycycline 100mg", "Doxycycline Hyclate",
    "Ciprofloxacin 250mg", "Ciprofloxacin 500mg", "Cipro",
    "Cephalexin 250mg", "Cephalexin 500mg", "Keflex",
    "Clopidogrel 75mg", "Plavix",
    "Rosuvastatin 5mg", "Rosuvastatin 10mg", "Rosuvastatin 20mg", "Crestor",
    "Meloxicam 7.5mg", "Meloxicam 15mg", "Mobic",
    "Cyclobenzaprine 10mg", "Flexeril",
    "Duloxetine 20mg", "Duloxetine 30mg", "Duloxetine 60mg", "Cymbalta",
    "Amlodipine-benazepril", "Lotrel",
    "Alprazolam 0.25mg", "Alprazolam 0.5mg", "Alprazolam 1mg", "Xanax",
    "Clonazepam 0.5mg", "Clonazepam 1mg", "Clonazepam 2mg", "Klonopin",
    "Loratadine 10mg", "Claritin",
    "Cetirizine 10mg", "Zyrtec",
    "Fexofenadine 180mg", "Allegra",
    "Montelukast 10mg", "Singulair",
    "Fluticasone Nasal", "Flonase",
    "Diphenhydramine 25mg", "Benadryl",
    "Simvastatin 10mg", "Simvastatin 20mg", "Simvastatin 40mg", "Zocor",
  ];
  if (pharmacy) {
    const existingNames = new Set(
      (await prisma.pharmacyInventory.findMany({ where: { pharmacyId: pharmacy.id }, select: { drugName: true } }))
        .map((r) => r.drugName),
    );
    let added = 0;
    const baseExpiry = new Date();
    baseExpiry.setFullYear(baseExpiry.getFullYear() + 2);
    for (let i = 0; i < drugList.length; i++) {
      const name = drugList[i];
      if (existingNames.has(name)) continue;
      await prisma.pharmacyInventory.create({
        data: {
          pharmacyId: pharmacy.id,
          drugName: name,
          quantity: 50 + Math.floor(Math.random() * 450),
          expiryDate: new Date(baseExpiry.getTime() + i * 24 * 60 * 60 * 1000),
        },
      });
      existingNames.add(name);
      added++;
    }
    if (added > 0) console.log(`Seeded ${added} drugs to pharmacy inventory.`);
  }

  // 10 patients - English names, random details
  const patientPasswordHash = await bcrypt.hash("Patient123!", 12);
  const patients = [
    { firstName: "John", lastName: "Doe", email: "john.doe@example.com", dob: "1990-01-15", sex: "Male", phone: "+1-555-1001", address1: "12 Oak Street", address2: "Apt 2", city: "Manchester", state: "NH", zip: "03101" },
    { firstName: "Jane", lastName: "Smith", email: "jane.smith@example.com", dob: "1988-07-22", sex: "Female", phone: "+1-555-1002", address1: "45 Pine Avenue", city: "Portland", state: "ME", zip: "04101" },
    { firstName: "Michael", lastName: "Johnson", email: "michael.johnson@example.com", dob: "1985-03-10", sex: "Male", phone: "+1-555-1003", address1: "78 Elm Road", city: "Hartford", state: "CT", zip: "06101" },
    { firstName: "Emily", lastName: "Williams", email: "emily.williams@example.com", dob: "1992-11-05", sex: "Female", phone: "+1-555-1004", address1: "23 Maple Lane", city: "Providence", state: "RI", zip: "02901" },
    { firstName: "James", lastName: "Brown", email: "james.brown@example.com", dob: "1987-09-30", sex: "Male", phone: "+1-555-1005", address1: "56 Cedar Drive", address2: "Unit 3", city: "Boston", state: "MA", zip: "02101" },
    { firstName: "Sarah", lastName: "Davis", email: "sarah.davis@example.com", dob: "1995-02-18", sex: "Female", phone: "+1-555-1006", address1: "89 Birch Street", city: "New Haven", state: "CT", zip: "06501" },
    { firstName: "David", lastName: "Wilson", email: "david.wilson@example.com", dob: "1982-06-12", sex: "Male", phone: "+1-555-1007", address1: "34 Spruce Way", city: "Burlington", state: "VT", zip: "05401" },
    { firstName: "Jessica", lastName: "Taylor", email: "jessica.taylor@example.com", dob: "1998-04-08", sex: "Female", phone: "+1-555-1008", address1: "67 Walnut Ave", city: "Concord", state: "NH", zip: "03301" },
    { firstName: "Robert", lastName: "Anderson", email: "robert.anderson@example.com", dob: "1979-12-01", sex: "Male", phone: "+1-555-1009", address1: "90 Ash Lane", address2: "Floor 2", city: "Albany", state: "NY", zip: "12201" },
    { firstName: "Amanda", lastName: "Thomas", email: "amanda.thomas@example.com", dob: "1991-08-25", sex: "Female", phone: "+1-555-1010", address1: "11 Hickory Rd", city: "Springfield", state: "MA", zip: "01101" },
  ];

  let createdPatients = 0;
  for (const p of patients) {
    const exists = await prisma.userAccount.findFirst({ where: { email: p.email } });
    if (exists) continue;
    const person = await prisma.person.create({
      data: {
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        dob: new Date(p.dob),
        sex: p.sex,
        phone: p.phone,
        address1: p.address1,
        address2: p.address2 || undefined,
        city: p.city,
        state: p.state,
        zip: p.zip,
      },
    });
    const mrn = `MRN-${Date.now().toString(36).toUpperCase().slice(-8)}`;
    await prisma.patient.create({ data: { personId: person.id, mrn } });
    await prisma.userAccount.create({
      data: {
        personId: person.id,
        email: p.email,
        passwordHash: patientPasswordHash,
        roles: { create: { roleId: rolePatient.id } },
      },
    });
    createdPatients++;
  }
  console.log(`Seeded ${createdPatients} patients.`);

  // 10 doctors - English names, specialties, license, fee
  const doctorPasswordHash = await bcrypt.hash("Doctor123!", 12);
  const doctors = [
    { firstName: "William", lastName: "Harris", email: "dr.william.harris@example.com", specialization: "Cardiology", license: "MD-NY-001", fee: 150 },
    { firstName: "Olivia", lastName: "Clark", email: "dr.olivia.clark@example.com", specialization: "Pediatrics", license: "MD-NY-002", fee: 120 },
    { firstName: "James", lastName: "Martin", email: "dr.james.martin@example.com", specialization: "Internal Medicine", license: "MD-NY-003", fee: 130 },
    { firstName: "Chloe", lastName: "Walker", email: "dr.chloe.walker@example.com", specialization: "Dermatology", license: "MD-NY-004", fee: 140 },
    { firstName: "Benjamin", lastName: "Moore", email: "dr.benjamin.moore@example.com", specialization: "Orthopedics", license: "MD-NY-005", fee: 175 },
    { firstName: "Sophie", lastName: "Lewis", email: "dr.sophie.lewis@example.com", specialization: "Neurology", license: "MD-NY-006", fee: 185 },
    { firstName: "Henry", lastName: "Young", email: "dr.henry.young@example.com", specialization: "General Practice", license: "MD-NY-007", fee: 100 },
    { firstName: "Grace", lastName: "King", email: "dr.grace.king@example.com", specialization: "Obstetrics", license: "MD-NY-008", fee: 160 },
    { firstName: "Daniel", lastName: "Wright", email: "dr.daniel.wright@example.com", specialization: "Psychiatry", license: "MD-NY-009", fee: 165 },
    { firstName: "Emma", lastName: "Scott", email: "dr.emma.scott@example.com", specialization: "Emergency Medicine", license: "MD-NY-010", fee: 155 },
  ];

  let createdDoctors = 0;
  for (let i = 0; i < doctors.length; i++) {
    const d = doctors[i];
    const exists = await prisma.userAccount.findFirst({ where: { email: d.email } });
    if (exists) continue;
    const person = await prisma.person.create({
      data: {
        firstName: d.firstName,
        lastName: d.lastName,
        email: d.email,
        dob: new Date(1965 + (i % 15), (i % 12), 1),
        sex: i % 2 === 0 ? "Male" : "Female",
        phone: `+1-555-2${String(100 + i).padStart(3, "0")}`,
        address1: `${100 + i} Medical Plaza`,
        address2: i % 3 === 0 ? `Suite ${i + 1}` : undefined,
        city: "New York",
        state: "NY",
        zip: "10001",
      },
    });
    const doctorJoined = new Date(2018 + (i % 6), i % 12, 15);
    const doctorEnded = i === 2 ? new Date("2024-06-30") : null; // One former doctor
    await prisma.doctor.create({
      data: {
        personId: person.id,
        clinicId: clinic.id,
        specialization: d.specialization,
        licenseNumber: d.license,
        consultationFee: d.fee,
        joinedDate: doctorJoined,
        endDate: doctorEnded,
      },
    });
    await prisma.userAccount.create({
      data: {
        personId: person.id,
        email: d.email,
        passwordHash: doctorPasswordHash,
        roles: { create: { roleId: roleDoctor.id } },
      },
    });
    createdDoctors++;
  }
  console.log(`Seeded ${createdDoctors} doctors.`);

  // Doctor availability (Mon-Fri 9:00-17:00) - only if none exist
  const availCount = await prisma.doctorAvailability.count();
  if (availCount === 0) {
    const activeDoctors = await prisma.doctor.findMany({
      where: { endDate: null },
      select: { id: true },
    });
    for (const d of activeDoctors) {
      for (let day = 1; day <= 5; day++) {
        await prisma.doctorAvailability.create({
          data: {
            doctorId: d.id,
            dayOfWeek: day,
            startTime: "09:00",
            endTime: "17:00",
          },
        });
      }
    }
    console.log(`Seeded availability for ${activeDoctors.length} doctors (Mon-Fri 9-5).`);
  }

  // 10 pharmacists - English names
  const pharmacistPasswordHash = await bcrypt.hash("Pharma123!", 12);
  const pharmacists = [
    { firstName: "Evan", lastName: "Scott", email: "pharmacy.evan.scott@example.com" },
    { firstName: "Madison", lastName: "Green", email: "pharmacy.madison.green@example.com" },
    { firstName: "Noah", lastName: "King", email: "pharmacy.noah.king@example.com" },
    { firstName: "Abigail", lastName: "Wright", email: "pharmacy.abigail.wright@example.com" },
    { firstName: "Logan", lastName: "Baker", email: "pharmacy.logan.baker@example.com" },
    { firstName: "Charlotte", lastName: "Hill", email: "pharmacy.charlotte.hill@example.com" },
    { firstName: "Lucas", lastName: "Campbell", email: "pharmacy.lucas.campbell@example.com" },
    { firstName: "Victoria", lastName: "Mitchell", email: "pharmacy.victoria.mitchell@example.com" },
    { firstName: "Mason", lastName: "Roberts", email: "pharmacy.mason.roberts@example.com" },
    { firstName: "Elizabeth", lastName: "Turner", email: "pharmacy.elizabeth.turner@example.com" },
  ];

  let createdPharmacists = 0;
  for (let i = 0; i < pharmacists.length; i++) {
    const ph = pharmacists[i];
    const exists = await prisma.userAccount.findFirst({ where: { email: ph.email } });
    if (exists) continue;
    const person = await prisma.person.create({
      data: {
        firstName: ph.firstName,
        lastName: ph.lastName,
        email: ph.email,
        dob: new Date(1985 + (i % 10), (i % 12), 15),
        sex: i % 2 === 0 ? "Male" : "Female",
        phone: `+1-555-3${String(100 + i).padStart(3, "0")}`,
        address1: `${200 + i} Pharmacy Lane`,
        address2: i % 4 === 0 ? `Unit ${i + 1}` : undefined,
        city: "New York",
        state: "NY",
        zip: "10002",
      },
    });
    const pharmaJoined = new Date(2019 + (i % 5), (i % 12), 1);
    const pharmaEnded = i === 1 ? new Date("2023-12-15") : null; // One former pharmacist
    await prisma.pharmacist.create({
      data: {
        personId: person.id,
        pharmacyId: pharmacy.id,
        licenseNumber: `RPh-NY-${String(i + 1).padStart(3, "0")}`,
        joinedDate: pharmaJoined,
        endDate: pharmaEnded,
      },
    });
    await prisma.userAccount.create({
      data: {
        personId: person.id,
        email: ph.email,
        passwordHash: pharmacistPasswordHash,
        roles: { create: { roleId: rolePharmacist.id } },
      },
    });
    createdPharmacists++;
  }
  console.log(`Seeded ${createdPharmacists} pharmacists.`);

  // 10 receptionists - English names
  const receptionistPasswordHash = await bcrypt.hash("Reception123!", 12);
  const receptionists = [
    { firstName: "Mia", lastName: "Hall", email: "reception.mia.hall@example.com" },
    { firstName: "Liam", lastName: "Young", email: "reception.liam.young@example.com" },
    { firstName: "Ava", lastName: "Allen", email: "reception.ava.allen@example.com" },
    { firstName: "Ethan", lastName: "Nelson", email: "reception.ethan.nelson@example.com" },
    { firstName: "Isabella", lastName: "Carter", email: "reception.isabella.carter@example.com" },
    { firstName: "Alexander", lastName: "Mitchell", email: "reception.alexander.mitchell@example.com" },
    { firstName: "Sophia", lastName: "Perez", email: "reception.sophia.perez@example.com" },
    { firstName: "Oliver", lastName: "Roberts", email: "reception.oliver.roberts@example.com" },
    { firstName: "Charlotte", lastName: "Turner", email: "reception.charlotte.turner@example.com" },
    { firstName: "Lucas", lastName: "Phillips", email: "reception.lucas.phillips@example.com" },
  ];

  let createdReceptionists = 0;
  for (let i = 0; i < receptionists.length; i++) {
    const r = receptionists[i];
    const exists = await prisma.userAccount.findFirst({ where: { email: r.email } });
    if (exists) continue;
    const person = await prisma.person.create({
      data: {
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email,
        dob: new Date(1990 + (i % 8), (i % 12), 10),
        sex: i % 2 === 0 ? "Female" : "Male",
        phone: `+1-555-4${String(100 + i).padStart(3, "0")}`,
        address1: `${300 + i} Front Desk Ave`,
        address2: i % 2 === 0 ? `Apt ${100 + i}` : undefined,
        city: "New York",
        state: "NY",
        zip: "10003",
      },
    });
    const receptJoined = new Date(2020 + (i % 4), (i % 12), 10);
    const receptEnded = i === 0 ? new Date("2024-03-01") : null; // One former receptionist
    await prisma.receptionist.create({
      data: {
        personId: person.id,
        clinicId: clinic.id,
        joinedDate: receptJoined,
        endDate: receptEnded,
      },
    });
    await prisma.userAccount.create({
      data: {
        personId: person.id,
        email: r.email,
        passwordHash: receptionistPasswordHash,
        roles: { create: { roleId: roleReceptionist.id } },
      },
    });
    createdReceptionists++;
  }
  console.log(`Seeded ${createdReceptionists} receptionists.`);

  // Fix COMPLETED/NO_SHOW appointments with future dates (move to past)
  const now = new Date();
  const badCompleted = await prisma.appointment.findMany({
    where: {
      status: { in: ["COMPLETED", "NO_SHOW"] },
      startAt: { gt: now },
    },
  });
  for (const a of badCompleted) {
    const pastDate = new Date(now);
    pastDate.setDate(pastDate.getDate() - 7);
    pastDate.setHours(9, 0, 0, 0);
    await prisma.appointment.update({
      where: { id: a.id },
      data: {
        startAt: pastDate,
        endAt: new Date(pastDate.getTime() + 30 * 60 * 1000),
      },
    });
  }
  if (badCompleted.length > 0) {
    console.log(`Fixed ${badCompleted.length} completed appointment(s) with future dates.`);
  }

  // Sample appointments (only if none exist)
  const appointmentCount = await prisma.appointment.count();
  if (appointmentCount === 0) {
    const patients = await prisma.patient.findMany({
      take: 2,
      orderBy: { createdAt: "asc" },
    });
    const doctors = await prisma.doctor.findMany({
      where: { endDate: null },
      take: 2,
      orderBy: { createdAt: "asc" },
    });
    const firstPatient = patients[0];
    const secondPatient = patients[1] ?? patients[0];
    const firstDoctor = doctors[0];
    const secondDoctor = doctors[1] ?? doctors[0];
    if (firstPatient && firstDoctor && clinic) {
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const slots = [
        { patient: firstPatient, doctor: firstDoctor, offset: 1, status: "CONFIRMED" },
        { patient: firstPatient, doctor: firstDoctor, offset: 2, status: "REQUESTED" },
        { patient: secondPatient, doctor: firstDoctor, offset: 3, status: "CONFIRMED" },
        { patient: firstPatient, doctor: secondDoctor, offset: -2, status: "COMPLETED" },
      ];
      for (const s of slots) {
        const start = new Date(today);
        start.setDate(start.getDate() + s.offset);
        start.setHours(9, 0, 0, 0);
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + 30);
        await prisma.appointment.create({
          data: {
            patientId: s.patient.id,
            doctorId: s.doctor.id,
            clinicId: clinic.id,
            startAt: start,
            endAt: end,
            status: s.status,
            reason: s.status === "COMPLETED" ? "Annual checkup" : "General consultation",
          },
        });
      }
      console.log("Seeded 4 sample appointments.");
    }
  }

  // Backfill missing Person fields (dob, sex) and employee joinedDate
  const personsMissingDob = await prisma.person.findMany({ where: { dob: null } });
  const dobDefaults = [
    new Date("1985-06-15"),
    new Date("1990-03-22"),
    new Date("1978-11-08"),
    new Date("1992-01-30"),
    new Date("1980-09-12"),
  ];
  for (let i = 0; i < personsMissingDob.length; i++) {
    await prisma.person.update({
      where: { id: personsMissingDob[i].id },
      data: {
        dob: dobDefaults[i % dobDefaults.length],
        sex: i % 2 === 0 ? "Male" : "Female",
      },
    });
  }
  if (personsMissingDob.length > 0) {
    console.log(`Backfilled dob/sex for ${personsMissingDob.length} person(s).`);
  }

  const personsMissingSex = await prisma.person.findMany({ where: { sex: null } });
  for (let i = 0; i < personsMissingSex.length; i++) {
    await prisma.person.update({
      where: { id: personsMissingSex[i].id },
      data: { sex: i % 2 === 0 ? "Male" : "Female" },
    });
  }
  if (personsMissingSex.length > 0) {
    console.log(`Backfilled sex for ${personsMissingSex.length} person(s).`);
  }

  const doctorsMissingJoined = await prisma.doctor.findMany({ where: { joinedDate: null } });
  for (const d of doctorsMissingJoined) {
    await prisma.doctor.update({
      where: { id: d.id },
      data: { joinedDate: new Date("2020-01-15") },
    });
  }
  const pharmacistsMissingJoined = await prisma.pharmacist.findMany({ where: { joinedDate: null } });
  for (const p of pharmacistsMissingJoined) {
    await prisma.pharmacist.update({
      where: { id: p.id },
      data: { joinedDate: new Date("2020-06-01") },
    });
  }
  const receptionistsMissingJoined = await prisma.receptionist.findMany({ where: { joinedDate: null } });
  for (const r of receptionistsMissingJoined) {
    await prisma.receptionist.update({
      where: { id: r.id },
      data: { joinedDate: new Date("2021-03-01") },
    });
  }
  const adminsMissingJoined = await prisma.admin.findMany({ where: { joinedDate: null } });
  for (const a of adminsMissingJoined) {
    await prisma.admin.update({
      where: { id: a.id },
      data: { joinedDate: new Date("2019-01-15") },
    });
  }
  const empBackfill =
    doctorsMissingJoined.length +
    pharmacistsMissingJoined.length +
    receptionistsMissingJoined.length +
    adminsMissingJoined.length;
  if (empBackfill > 0) {
    console.log(`Backfilled joinedDate for ${empBackfill} employee(s).`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
