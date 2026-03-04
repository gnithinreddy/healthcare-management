# MVC Architecture

This project follows an MVC (Model-View-Controller) structure adapted for Next.js App Router.

## Structure

```
src/
├── models/          # M - Data layer (Prisma, types)
├── views/           # V - UI components (Sidebars, shared components)
├── controllers/     # C - (app/api/ routes act as controllers)
├── services/       # Business logic (called by controllers)
├── lib/             # Utilities (Prisma client implementation)
└── app/             # Next.js pages, layouts, API routes
```

## Layers

### Model (`src/models/`)

- **Purpose**: Data access and schema
- **Contents**: Prisma client re-export, shared types
- **Usage**: `import { prisma } from "@/models"`

### View (`src/views/`)

- **Purpose**: Presentational components
- **Contents**: Sidebars, shared UI by role (doctor, patient, receptionist, pharmacist, admin)
- **Usage**: `import DoctorSidebar from "@/views/doctor/Sidebar"`

### Controller (`src/app/api/`)

- **Purpose**: Handle HTTP requests, validate auth, orchestrate
- **Contents**: API route handlers (`route.ts` files)
- **Flow**: Parse request → Validate cookies → Call service → Return `NextResponse.json()`

### Services (`src/services/`)

- **Purpose**: Business logic, use cases
- **Contents**: appointmentService, doctorService, patientService, etc.
- **Usage**: `import { getDoctorDashboard } from "@/services/doctorService"`

## Request Flow

```
Client → app/api/*/route.ts (Controller)
         → services/*.ts (Business logic)
         → models (Prisma/DB)
         → Response
```

## View Flow

```
app/*/page.tsx → views/*/Component
               → Renders UI
```
