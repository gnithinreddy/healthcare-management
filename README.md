# HealthCare Suite

A full-stack healthcare management platform for clinics and pharmacies. Role-based portals for **patients**, **doctors**, **receptionists**, **pharmacists**, and **admins**—with appointments, prescriptions, billing, and inventory management.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Demo Credentials](#demo-credentials)
- [API Overview](#api-overview)
- [Scripts](#scripts)
- [Deployment](#deployment)

---

## Features

### Patient Portal

- **Dashboard** – Overview of upcoming and past appointments, prescriptions, quick actions
- **Appointments** – Book, view, cancel appointments; check-in on appointment day
- **Prescriptions** – View prescription history and status
- **Billing** – View invoices and outstanding balance
- **Profile** – Update personal details and change password

### Doctor Portal

- **Dashboard** – Today’s, upcoming, and past appointments
- **Appointments** – Confirm, complete, no-show, cancel; call next patient
- **Prescriptions** – Add prescriptions when completing visits; drug autocomplete; auto-send to pharmacy
- **Profile** – Update details, consultation fee, specialization

### Receptionist Portal

- **Dashboard** – Today’s appointments, upcoming, past; call-next requests
- **Appointments** – Create, update, check-in; manage status
- **Patients** – Search by name/MRN/phone/email; patient profile; book appointments
- **Billing** – Search patients, view completed visits and totals; link from patient profile
- **Profile** – Update details and password

### Pharmacist Portal

- **Dashboard** – Stats (inventory, pending dispenses, low stock, expired); attention banner
- **Dispenses** – Review and process prescriptions (dispense / out of stock)
- **Inventory** – View and update drug quantities
- **Profile** – Update details and password

### Admin Portal

- **Overview** – Clinic stats, recent feedback
- **Users** – Manage patients, doctors, pharmacists, receptionists, admins
- **Appointments** – View and manage all appointments
- **Pharmacy & Inventory** – Manage pharmacies and inventory items

---

## Tech Stack

| Layer       | Technology                          |
|------------|--------------------------------------|
| Framework  | Next.js 16 (App Router)              |
| Language   | TypeScript                          |
| Database   | SQLite via Prisma ORM               |
| Auth       | bcryptjs + cookie-based sessions     |
| Styling    | Tailwind CSS v4                     |
| UI         | React 19                             |

---

## Project Structure

The codebase uses an **MVC-style architecture**:

```
src/
├── models/          # Data layer (Prisma client)
├── views/           # UI components (Sidebars by role)
├── controllers/     # API routes (app/api/)
├── services/        # Business logic
├── lib/             # Utilities (Prisma, formatStatus, etc.)
└── app/             # Next.js pages, layouts, API routes
```

See [MVC_ARCHITECTURE.md](./MVC_ARCHITECTURE.md) for details.

---

## Getting Started

### Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**

### 1. Clone the repository

```bash
git clone https://github.com/gnithinreddy/healthcare-management.git
cd healthcare-management
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL="file:./dev.db"
```

### 4. Set up the database

```bash
npx prisma generate
npx prisma db push
```

### 5. Seed sample data (optional but recommended)

```bash
npm run db:seed
```

This creates:

- 1 admin  
- 10 patients  
- 10 doctors (with availability)  
- 10 receptionists  
- 10 pharmacists  
- 135 drugs in pharmacy inventory  
- Sample appointments  

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Demo Credentials

Use these to log in after running the seed:

| Role         | Email                              | Password     |
|--------------|------------------------------------|--------------|
| Admin        | admin@gmail.com                    | admin123     |
| Patient      | john.doe@example.com               | Patient123!  |
| Doctor       | dr.william.harris@example.com      | Doctor123!   |
| Receptionist | reception.mia.hall@example.com     | Reception123!|
| Pharmacist   | pharmacy.evan.scott@example.com     | Pharma123!   |

All seeded users of the same role share the same password (e.g. any patient uses `Patient123!`).

---

## API Overview

API routes live under `/api` and are grouped by role:

| Prefix              | Purpose                                  |
|---------------------|------------------------------------------|
| `/api/auth`         | Login, signup, logout                    |
| `/api/patient`      | Dashboard, appointments, billing, profile |
| `/api/doctor`       | Dashboard, appointments, prescriptions, drugs search |
| `/api/receptionist` | Dashboard, appointments, patients, billing |
| `/api/pharmacist`   | Dashboard, inventory, dispenses          |
| `/api/admin`        | Overview, users, appointments, pharmacy  |

Authentication is cookie-based (e.g. `patient_id`, `doctor_id`). Unauthenticated requests return `401`.

---

## Scripts

| Command       | Description                    |
|---------------|--------------------------------|
| `npm run dev` | Start dev server (port 3000)   |
| `npm run build` | Production build             |
| `npm run start` | Start production server      |
| `npm run lint` | Run ESLint                    |
| `npm run db:seed` | Seed database with sample data |
| `npx prisma studio` | Open Prisma Studio for DB inspection |

---

## Deployment

### Build

```bash
npm run build
npm run start
```

### Environment

- Set `DATABASE_URL` to your production database (e.g. PostgreSQL).
- For SQLite in production, ensure the database file path is writable and persistent.

### Vercel / Node hosting

- Use the **Node.js** runtime.
- Configure `DATABASE_URL` in environment variables.
- SQLite works on Vercel with serverless storage; for larger scale, prefer PostgreSQL.

---

## Troubleshooting

**Build fails with bcryptjs type error**

```bash
npm i --save-dev @types/bcryptjs
```

**"Unable to load billing" in patient portal** – Ensure you're logged in as a patient and the database is seeded. The billing API returns invoices for the authenticated patient.

---

## License

Private project.

---

## Repository

**GitHub:** [gnithinreddy/healthcare-management](https://github.com/gnithinreddy/healthcare-management)
