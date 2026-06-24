# MediCore Pro - Clinic Management System

A production-ready, mobile-only Hospital & Clinic Management System powered by an **Expo React Native App** (fully Expo Go compatible) and a **Node.js Express Backend** connected to **Supabase PostgreSQL**.

---

## 🏗️ Architecture

```text
Clinic-management-system/
├── backend/                  # Node.js Express MVC API Server
│   ├── config/               # Database and Supabase Client Configurations
│   ├── controllers/          # Request controller logic (auth, patient, appointments, billing)
│   ├── middleware/           # Express security, auth, validation, and role middlewares
│   ├── routes/               # API route definitions
│   ├── services/             # Operations services layers (placeholders)
│   ├── utils/                # JWT helpers and JSON API response structures
│   ├── server.js             # Main server boot configuration
│   └── package.json
│
└── frontend/                 # Expo React Native TypeScript Mobile App
    ├── src/
    │   ├── navigation/       # React Navigation setup and Custom Floating Bottom Tab Bar
    │   ├── screens/          # Screen components (auth, admin, doctor, patient, pharmacist, lab)
    │   ├── services/         # Axios API client and local session storage
    │   └── assets/           # Images, logos, and fonts
    ├── App.tsx               # Main entry point mounting AppNavigator
    └── package.json
```

---

## ⚡ Setup & Launch Instructions

Ensure you have [Node.js (v18+)](https://nodejs.org/) installed on your machine.

### 1. Backend Server Setup

Navigate to the `backend` folder, install packages, and boot the server:

```bash
cd backend
npm install
npm run dev
```

* **Environment Configuration**: A `.env` file has been prepared in the `backend` folder. Adjust keys as needed:
  ```env
  PORT=5000
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_ANON_KEY=your-anon-key
  JWT_SECRET=super_secret_jwt_key_clinic_management_123456
  ```
* **Database Migrations**: The PostgreSQL DDL schema script is ready at `backend/config/schema.sql`. You can execute it directly inside the Supabase SQL Editor.

---

### 2. Frontend Mobile App Setup

Open a new terminal window, navigate to the `frontend` folder, install packages, and boot the Expo development server:

```bash
cd frontend
npm install
npx expo start
```

* **Environment Configuration**: A `.env` file has been prepared in the `frontend` folder:
  ```env
  EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:5000/api
  EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  ```
  > [!IMPORTANT]
  > Update `YOUR_LOCAL_IP` with your developer workstation's local IP address (e.g., `192.168.1.15`) to allow mobile devices running Expo Go to connect to the backend server.
* **Launch in Expo Go**: Scan the QR code printed in the terminal using the Expo Go application on iOS or Android.

---

## 🔑 Demo Account Credentials (One-Tap Fill)

The login screen features interactive badges to pre-populate these credentials. If Supabase is unconfigured, the system automatically authenticates local sessions to facilitate instant demo reviews.

| Role | Email | Password | Logged-in Name | Dashboard Flow |
|---|---|---|---|---|
| **Admin** | `admin@medicore.com` | `Pass123` | Chief Administrator | Admin Control Panel |
| **Doctor** | `doctor@medicore.com` | `Pass123` | Dr. Sarah Jenkins | Doctor Dashboard |
| **Patient** | `patient@medicore.com` | `Pass123` | Jane Mary Doe | Patient Portal |
| **Receptionist** | `receptionist@medicore.com` | `Pass123` | Alice Smith | Reception Panel |
| **Pharmacist** | `pharmacist@medicore.com` | `Pass123` | John Doe | Pharmacy Panel |
| **Laboratory Staff** | `labstaff@medicore.com` | `Pass123` | Robert Johnson | Laboratory Panel |

---

## 🗄️ Database Tables Schema (`schema.sql`)

The system comprises the following tables:
1. `users`: Credentials, password bcrypt hashes, and system roles.
2. `patients`: Records relating to patient details, gender, DOB, blood type, and address.
3. `doctors`: Specializations and clinician records.
4. `appointments`: Consultations, statuses, notes, and booking dates.
5. `invoices`: Patient billings and invoicing states.
6. `payments`: Payment transaction amounts, timestamps, and settlement types (Cash, Card, Insurance, Bank Transfer).
