-- ==========================================
-- HOSPITAL & CLINIC MANAGEMENT SYSTEM
-- COMPLETE DATABASE SCHEMA v2
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- USERS
-- ==========================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (
        role IN (
            'Admin',
            'Doctor',
            'Patient',
            'Receptionist',
            'Pharmacist',
            'Laboratory Staff'
        )
    ),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- PATIENTS
-- ==========================================

CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    gender VARCHAR(20) DEFAULT 'Unspecified' CHECK (
        gender IN ('Male', 'Female', 'Other', 'Unspecified')
    ),
    date_of_birth DATE,
    blood_type VARCHAR(10),
    address TEXT,
    emergency_contact VARCHAR(100),
    allergies TEXT,
    medical_conditions TEXT,
    insurance_provider VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- DOCTORS
-- ==========================================

CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    specialization VARCHAR(255) NOT NULL,
    license_number VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    consultation_fee NUMERIC(10,2) DEFAULT 0 CHECK (consultation_fee >= 0),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- DOCTOR SCHEDULES
-- ==========================================

CREATE TABLE doctor_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- APPOINTMENTS
-- ==========================================

CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (
        status IN (
            'Pending',
            'Confirmed',
            'Checked In',
            'In Consultation',
            'Completed',
            'Cancelled',
            'No Show'
        )
    ),
    notes TEXT,
    doctor_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Prevent double booking: only one non-cancelled appointment per doctor per timeslot
CREATE UNIQUE INDEX unique_doctor_timeslot
ON appointments (doctor_id, appointment_date, start_time)
WHERE status <> 'Cancelled' AND start_time IS NOT NULL;

-- ==========================================
-- INVOICES
-- ==========================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    status VARCHAR(50) DEFAULT 'Unpaid' CHECK (
        status IN ('Unpaid', 'Paid', 'Partially Paid', 'Refunded')
    ),
    due_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- INVOICE ITEMS
-- ==========================================

CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    total_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_price >= 0)
);

-- ==========================================
-- PAYMENTS
-- ==========================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) CHECK (
        payment_method IN ('Cash', 'Card', 'Insurance', 'Bank Transfer')
    ),
    payment_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- PHARMACY / MEDICINES
-- ==========================================

CREATE TABLE medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 0,
    price NUMERIC(10,2),
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- PRESCRIPTIONS
-- ==========================================

CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Finalized')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medicine_id UUID REFERENCES medicines(id) ON DELETE SET NULL,
    medicine_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration VARCHAR(100) NOT NULL,
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- LABORATORY TESTS (legacy individual test records)
-- ==========================================

CREATE TABLE lab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    test_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (
        status IN ('Pending', 'Processing', 'Completed', 'Cancelled')
    ),
    result TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- LAB REQUESTS (grouped test requests from doctors)
-- ==========================================

CREATE TABLE lab_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'Draft' CHECK (
        status IN ('Draft', 'Submitted', 'Processing', 'Completed', 'Cancelled')
    ),
    notes TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lab_request_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_request_id UUID NOT NULL REFERENCES lab_requests(id) ON DELETE CASCADE,
    test_name VARCHAR(255) NOT NULL,
    priority VARCHAR(20) DEFAULT 'Routine' CHECK (
        priority IN ('Routine', 'Urgent', 'Stat')
    ),
    clinical_notes TEXT,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (
        status IN ('Pending', 'Collected', 'Processing', 'Completed', 'Cancelled')
    ),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- LAB RESULTS (test result values with verification workflow)
-- ==========================================

CREATE TABLE lab_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_request_test_id UUID NOT NULL REFERENCES lab_request_tests(id) ON DELETE CASCADE,
    result_value TEXT,
    unit VARCHAR(50),
    reference_range VARCHAR(100),
    abnormal_flag BOOLEAN DEFAULT FALSE,
    comments TEXT,
    status VARCHAR(20) DEFAULT 'Draft' CHECK (
        status IN ('Draft', 'Completed', 'Verified', 'Released')
    ),
    entered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    entered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    released_by UUID REFERENCES users(id) ON DELETE SET NULL,
    released_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- AUDIT LOGS
-- ==========================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    table_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- INDEXES
-- ==========================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Patients
CREATE INDEX idx_patients_user_id ON patients(user_id);
CREATE INDEX idx_patients_name ON patients(name);
CREATE INDEX idx_patients_email ON patients(email);

-- Doctors
CREATE INDEX idx_doctors_user_id ON doctors(user_id);
CREATE INDEX idx_doctors_specialization ON doctors(specialization);
CREATE INDEX idx_doctors_availability ON doctors(is_available) WHERE is_available = TRUE;

-- Doctor schedules
CREATE INDEX idx_doctor_schedules_doctor_day ON doctor_schedules(doctor_id, day_of_week);

-- Appointments
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX idx_appointments_status_date ON appointments(status, appointment_date);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);

-- Invoices
CREATE INDEX idx_invoices_patient_id ON invoices(patient_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_appointment_id ON invoices(appointment_id);

-- Invoice items
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- Payments
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);

-- Medicines
CREATE INDEX idx_medicines_name ON medicines(name);
CREATE INDEX idx_medicines_expiry ON medicines(expiry_date);

-- Prescriptions
CREATE INDEX idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX idx_prescriptions_appointment_id ON prescriptions(appointment_id);

-- Prescription items
CREATE INDEX idx_prescription_items_prescription_id ON prescription_items(prescription_id);

-- Lab tests
CREATE INDEX idx_lab_tests_patient_created_at ON lab_tests(patient_id, created_at DESC);
CREATE INDEX idx_lab_tests_doctor_created_at ON lab_tests(doctor_id, created_at DESC);
CREATE INDEX idx_lab_tests_status ON lab_tests(status);

-- Lab requests
CREATE INDEX idx_lab_requests_patient_id ON lab_requests(patient_id);
CREATE INDEX idx_lab_requests_doctor_id ON lab_requests(doctor_id);
CREATE INDEX idx_lab_requests_appointment_id ON lab_requests(appointment_id);
CREATE INDEX idx_lab_requests_status ON lab_requests(status);
CREATE INDEX idx_lab_requests_updated_at ON lab_requests(updated_at DESC);

-- Lab request tests
CREATE INDEX idx_lab_request_tests_request_id ON lab_request_tests(lab_request_id);
CREATE INDEX idx_lab_request_tests_status ON lab_request_tests(status);
CREATE INDEX idx_lab_request_tests_priority ON lab_request_tests(priority);

-- Lab results
CREATE INDEX idx_lab_results_test_id ON lab_results(lab_request_test_id);
CREATE INDEX idx_lab_results_status ON lab_results(status);
CREATE INDEX idx_lab_results_entered_by ON lab_results(entered_by);
CREATE INDEX idx_lab_results_verified_by ON lab_results(verified_by);

-- Audit logs
CREATE INDEX idx_audit_logs_user_created_at ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);

-- ==========================================
-- ADDITIONAL CONSTRAINTS
-- ==========================================

ALTER TABLE doctors ADD CONSTRAINT doctors_email_unique UNIQUE (email);
ALTER TABLE patients ADD CONSTRAINT patients_email_unique UNIQUE (email);
