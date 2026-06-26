-- ==========================================
-- MEDICORE PRO — DEMO SEED DATA
-- Schema V2 Compatible
-- Run AFTER schema.sql
-- ==========================================

BEGIN;

-- ==========================================
-- USERS (all passwords = 'password123')
-- ==========================================

INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin@medicore.com', '$2a$12$iLEato6HwiqvFHO.YdkeGeUirwApeK2e0691SFdWoJYdLOVkvnz8u', 'System Admin', 'Admin', TRUE),
    ('22222222-2222-2222-2222-222222222222', 'sarah.chen@medicore.com', '$2a$12$iLEato6HwiqvFHO.YdkeGeUirwApeK2e0691SFdWoJYdLOVkvnz8u', 'Dr. Sarah Chen', 'Doctor', TRUE),
    ('33333333-3333-3333-3333-333333333333', 'james.wilson@medicore.com', '$2a$12$iLEato6HwiqvFHO.YdkeGeUirwApeK2e0691SFdWoJYdLOVkvnz8u', 'Dr. James Wilson', 'Doctor', TRUE),
    ('44444444-4444-4444-4444-444444444444', 'reception@medicore.com', '$2a$12$iLEato6HwiqvFHO.YdkeGeUirwApeK2e0691SFdWoJYdLOVkvnz8u', 'Maria Garcia', 'Receptionist', TRUE),
    ('55555555-5555-5555-5555-555555555555', 'pharmacist@medicore.com', '$2a$12$iLEato6HwiqvFHO.YdkeGeUirwApeK2e0691SFdWoJYdLOVkvnz8u', 'David Kim', 'Pharmacist', TRUE),
    ('66666666-6666-6666-6666-666666666666', 'lab@medicore.com', '$2a$12$iLEato6HwiqvFHO.YdkeGeUirwApeK2e0691SFdWoJYdLOVkvnz8u', 'Lisa Patel', 'Laboratory Staff', TRUE),
    ('77777777-7777-7777-7777-777777777777', 'john.doe@email.com', '$2a$12$iLEato6HwiqvFHO.YdkeGeUirwApeK2e0691SFdWoJYdLOVkvnz8u', 'John Doe', 'Patient', TRUE),
    ('88888888-8888-8888-8888-888888888888', 'jane.smith@email.com', '$2a$12$iLEato6HwiqvFHO.YdkeGeUirwApeK2e0691SFdWoJYdLOVkvnz8u', 'Jane Smith', 'Patient', TRUE),
    ('99999999-9999-9999-9999-999999999999', 'bob.johnson@email.com', '$2a$12$iLEato6HwiqvFHO.YdkeGeUirwApeK2e0691SFdWoJYdLOVkvnz8u', 'Bob Johnson', 'Patient', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- PATIENTS
-- ==========================================

INSERT INTO patients (id, user_id, name, email, phone, gender, date_of_birth, blood_type, address, emergency_contact, allergies, medical_conditions, insurance_provider) VALUES
    ('77777777-7777-7777-7777-777777777777', '77777777-7777-7777-7777-777777777777',
     'John Doe', 'john.doe@email.com', '+1-555-0101',
     'Male', '1985-03-15', 'A+',
     '123 Main St, New York, NY 10001',
     'Jane Doe (Wife) — +1-555-0104',
     'Penicillin', 'Hypertension', 'BlueCross PPO'),
    ('88888888-8888-8888-8888-888888888888', '88888888-8888-8888-8888-888888888888',
     'Jane Smith', 'jane.smith@email.com', '+1-555-0102',
     'Female', '1990-07-22', 'O-',
     '456 Oak Ave, Los Angeles, CA 90001',
     'Mike Smith (Husband) — +1-555-0105',
     'Sulfa drugs', 'Type 2 Diabetes', 'Aetna HMO'),
    ('99999999-9999-9999-9999-999999999999', '99999999-9999-9999-9999-999999999999',
     'Bob Johnson', 'bob.johnson@email.com', '+1-555-0103',
     'Male', '1978-11-08', 'B+',
     '789 Pine Rd, Chicago, IL 60601',
     'Alice Johnson (Sister) — +1-555-0106',
     'None', 'None', 'Cigna PPO')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- DOCTORS
-- ==========================================

INSERT INTO doctors (id, user_id, name, specialization, license_number, email, phone, consultation_fee, is_available) VALUES
    ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
     'Dr. Sarah Chen', 'Cardiology', 'MD-12345',
     'sarah.chen@medicore.com', '+1-555-1001', 250.00, TRUE),
    ('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
     'Dr. James Wilson', 'General Medicine', 'MD-12346',
     'james.wilson@medicore.com', '+1-555-1002', 150.00, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- DOCTOR SCHEDULES
-- ==========================================

INSERT INTO doctor_schedules (id, doctor_id, day_of_week, start_time, end_time) VALUES
    -- Dr. Sarah Chen: Mon–Fri 09:00–17:00
    ('a1000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 1, '09:00', '17:00'),
    ('a1000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 2, '09:00', '17:00'),
    ('a1000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 3, '09:00', '17:00'),
    ('a1000000-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 4, '09:00', '17:00'),
    ('a1000000-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 5, '09:00', '17:00'),
    -- Dr. James Wilson: Mon–Fri 08:00–16:00
    ('a1000000-0000-0000-0000-000000000006', '33333333-3333-3333-3333-333333333333', 1, '08:00', '16:00'),
    ('a1000000-0000-0000-0000-000000000007', '33333333-3333-3333-3333-333333333333', 2, '08:00', '16:00'),
    ('a1000000-0000-0000-0000-000000000008', '33333333-3333-3333-3333-333333333333', 3, '08:00', '16:00'),
    ('a1000000-0000-0000-0000-000000000009', '33333333-3333-3333-3333-333333333333', 4, '08:00', '16:00'),
    ('a1000000-0000-0000-0000-000000000010', '33333333-3333-3333-3333-333333333333', 5, '08:00', '16:00')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- MEDICINES
-- ==========================================

INSERT INTO medicines (id, name, quantity, price, expiry_date) VALUES
    ('e1000000-0000-0000-0000-000000000001', 'Amoxicillin 500mg',   200, 12.50, '2027-06-01'),
    ('e1000000-0000-0000-0000-000000000002', 'Ibuprofen 400mg',     300,  8.00, '2027-05-15'),
    ('e1000000-0000-0000-0000-000000000003', 'Atorvastatin 20mg',   150, 35.00, '2027-08-01'),
    ('e1000000-0000-0000-0000-000000000004', 'Metformin 500mg',     250, 15.00, '2027-07-01'),
    ('e1000000-0000-0000-0000-000000000005', 'Lisinopril 10mg',     180, 22.00, '2027-09-01'),
    ('e1000000-0000-0000-0000-000000000006', 'Omeprazole 20mg',     220, 18.00, '2027-06-15'),
    ('e1000000-0000-0000-0000-000000000007', 'Azithromycin 250mg',  100, 28.00, '2027-04-01'),
    ('e1000000-0000-0000-0000-000000000008', 'Paracetamol 500mg',   500,  5.00, '2028-01-01')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- LEGACY LAB TESTS (individual test records)
-- ==========================================

INSERT INTO lab_tests (id, patient_id, doctor_id, test_name, status, result) VALUES
    ('f1000000-0000-0000-0000-000000000001', '77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222',
     'Complete Blood Count', 'Completed', 'All parameters within normal limits.'),
    ('f1000000-0000-0000-0000-000000000002', '88888888-8888-8888-8888-888888888888', '33333333-3333-3333-3333-333333333333',
     'Fasting Blood Glucose', 'Completed', '142 mg/dL — Elevated'),
    ('f1000000-0000-0000-0000-000000000003', '99999999-9999-9999-9999-999999999999', '22222222-2222-2222-2222-222222222222',
     'Lipid Panel', 'Pending', NULL),
    ('f1000000-0000-0000-0000-000000000004', '99999999-9999-9999-9999-999999999999', '22222222-2222-2222-2222-222222222222',
     'Vitamin D 25-Hydroxy', 'Pending', NULL)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- APPOINTMENTS
-- ==========================================

INSERT INTO appointments (id, patient_id, doctor_id, appointment_date, start_time, end_time, status, notes, doctor_notes) VALUES
    ('b1000000-0000-0000-0000-000000000001', '77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222',
     CURRENT_DATE - 3, '10:00', '10:30', 'Completed',
     'Follow-up on hypertension medication',
     'BP 138/88. Continue Lisinopril. Ordered lab work.'),
    ('b1000000-0000-0000-0000-000000000002', '88888888-8888-8888-8888-888888888888', '33333333-3333-3333-3333-333333333333',
     CURRENT_DATE - 2, '14:00', '14:30', 'Completed',
     'Diabetes management review',
     'HbA1c 7.2%. Adjusted metformin dose. Ordered lab work.'),
    ('b1000000-0000-0000-0000-000000000003', '99999999-9999-9999-9999-999999999999', '22222222-2222-2222-2222-222222222222',
     CURRENT_DATE, '11:00', '11:30', 'Confirmed',
     'Annual physical examination', NULL),
    ('b1000000-0000-0000-0000-000000000004', '77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333',
     CURRENT_DATE + 1, '09:00', '09:30', 'Pending',
     'Headache and dizziness evaluation', NULL),
    ('b1000000-0000-0000-0000-000000000005', '88888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222',
     CURRENT_DATE - 5, '15:00', '15:30', 'Cancelled',
     'Patient requested cancellation due to scheduling conflict', NULL)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- PRESCRIPTIONS (for completed appointments)
-- ==========================================

INSERT INTO prescriptions (id, appointment_id, patient_id, doctor_id, status, notes) VALUES
    ('c1000000-0000-0000-0000-000000000001',
     'b1000000-0000-0000-0000-000000000001',
     '77777777-7777-7777-7777-777777777777',
     '22222222-2222-2222-2222-222222222222',
     'Finalized',
     'Lisinopril 10mg daily for hypertension. Monitor BP weekly.'),
    ('c1000000-0000-0000-0000-000000000002',
     'b1000000-0000-0000-0000-000000000002',
     '88888888-8888-8888-8888-888888888888',
     '33333333-3333-3333-3333-333333333333',
     'Finalized',
     'Metformin 500mg BID for Type 2 Diabetes. Follow up in 3 months.')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- PRESCRIPTION ITEMS
-- ==========================================

INSERT INTO prescription_items (id, prescription_id, medicine_id, medicine_name, dosage, frequency, duration, instructions) VALUES
    ('d1000000-0000-0000-0000-000000000001',
     'c1000000-0000-0000-0000-000000000001',
     'e1000000-0000-0000-0000-000000000005', 'Lisinopril 10mg',
     '10mg', 'Once daily', '30 days',
     'Take in the morning with or without food.'),
    ('d1000000-0000-0000-0000-000000000002',
     'c1000000-0000-0000-0000-000000000001',
     'e1000000-0000-0000-0000-000000000002', 'Ibuprofen 400mg',
     '400mg', 'As needed', '5 days',
     'Take for joint pain. Do not exceed 3 tablets per day.'),
    ('d1000000-0000-0000-0000-000000000003',
     'c1000000-0000-0000-0000-000000000002',
     'e1000000-0000-0000-0000-000000000004', 'Metformin 500mg',
     '500mg', 'Twice daily', '90 days',
     'Take with breakfast and dinner to minimise GI side effects.')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- LAB REQUESTS
-- ==========================================

INSERT INTO lab_requests (id, appointment_id, patient_id, doctor_id, status, notes) VALUES
    ('g1000000-0000-0000-0000-000000000001',
     'b1000000-0000-0000-0000-000000000001',
     '77777777-7777-7777-7777-777777777777',
     '22222222-2222-2222-2222-222222222222',
     'Completed',
     'Routine blood work for hypertension follow-up.'),
    ('g1000000-0000-0000-0000-000000000002',
     'b1000000-0000-0000-0000-000000000002',
     '88888888-8888-8888-8888-888888888888',
     '33333333-3333-3333-3333-333333333333',
     'Processing',
     'Diabetes monitoring — fasting glucose and HbA1c.'),
    ('g1000000-0000-0000-0000-000000000003',
     'b1000000-0000-0000-0000-000000000003',
     '99999999-9999-9999-9999-999999999999',
     '22222222-2222-2222-2222-222222222222',
     'Draft',
     'Preventive health screening.')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- LAB REQUEST TESTS
-- ==========================================

INSERT INTO lab_request_tests (id, lab_request_id, test_name, priority, clinical_notes, status) VALUES
    ('h1000000-0000-0000-0000-000000000001',
     'g1000000-0000-0000-0000-000000000001', 'Complete Blood Count',
     'Routine', 'Baseline CBC for hypertension patient', 'Completed'),
    ('h1000000-0000-0000-0000-000000000002',
     'g1000000-0000-0000-0000-000000000001', 'Lipid Panel',
     'Routine', 'Fasting lipid profile required', 'Completed'),
    ('h1000000-0000-0000-0000-000000000003',
     'g1000000-0000-0000-0000-000000000002', 'Fasting Blood Glucose',
     'Urgent', 'Fasting glucose for diabetes monitoring', 'Completed'),
    ('h1000000-0000-0000-0000-000000000004',
     'g1000000-0000-0000-0000-000000000002', 'HbA1c',
     'Routine', 'Glycated haemoglobin for 3-month monitoring', 'Processing'),
    ('h1000000-0000-0000-0000-000000000005',
     'g1000000-0000-0000-0000-000000000003', 'Thyroid Panel (TSH, T3, T4)',
     'Routine', 'Annual thyroid screening', 'Pending'),
    ('h1000000-0000-0000-0000-000000000006',
     'g1000000-0000-0000-0000-000000000003', 'Vitamin D 25-Hydroxy',
     'Routine', 'Vitamin D deficiency screening', 'Pending')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- LAB RESULTS
-- ==========================================

INSERT INTO lab_results (id, lab_request_id, lab_request_test_id, result_value, unit, reference_range, abnormal_flag, comments, status, entered_by, entered_at) VALUES
    ('i1000000-0000-0000-0000-000000000001',
     'g1000000-0000-0000-0000-000000000001',
     'h1000000-0000-0000-0000-000000000001',
     'WBC: 5.2 | Hb: 14.8', NULL, 'WBC 4.0–11.0 | Hb 13.5–17.5', 'Normal',
     'CBC within normal limits', 'Completed',
     '66666666-6666-6666-6666-666666666666', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    ('i1000000-0000-0000-0000-000000000002',
     'g1000000-0000-0000-0000-000000000001',
     'h1000000-0000-0000-0000-000000000002',
     '195', 'mg/dL', '<200', 'Normal',
     'Total cholesterol borderline-normal', 'Completed',
     '66666666-6666-6666-6666-666666666666', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    ('i1000000-0000-0000-0000-000000000003',
     'g1000000-0000-0000-0000-000000000002',
     'h1000000-0000-0000-0000-000000000003',
     '142', 'mg/dL', '70–100', 'High',
     'Fasting glucose elevated — diabetic range', 'Completed',
     '66666666-6666-6666-6666-666666666666', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    ('i1000000-0000-0000-0000-000000000004',
     'g1000000-0000-0000-0000-000000000002',
     'h1000000-0000-0000-0000-000000000004',
     '7.2', '%', '<5.7', 'High',
     'HbA1c elevated — consistent with diabetes', 'Completed',
     '66666666-6666-6666-6666-666666666666', CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- INVOICES
-- ==========================================

INSERT INTO invoices (id, invoice_number, patient_id, appointment_id, total_amount, status, due_date) VALUES
    ('j1000000-0000-0000-0000-000000000001', 'SEED-INV-001',
     '77777777-7777-7777-7777-777777777777',
     'b1000000-0000-0000-0000-000000000001',
     350.00, 'Paid', CURRENT_DATE + 27),
    ('j1000000-0000-0000-0000-000000000002', 'SEED-INV-002',
     '88888888-8888-8888-8888-888888888888',
     'b1000000-0000-0000-0000-000000000002',
     250.00, 'Partially Paid', CURRENT_DATE + 28),
    ('j1000000-0000-0000-0000-000000000003', 'SEED-INV-003',
     '99999999-9999-9999-9999-999999999999',
     'b1000000-0000-0000-0000-000000000003',
     550.00, 'Unpaid', CURRENT_DATE + 30)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- INVOICE ITEMS
-- ==========================================

INSERT INTO invoice_items (id, invoice_id, item_name, quantity, unit_price, total_price) VALUES
    -- Invoice 1 (Paid — $350): Cardiology consult + CBC + Lipid Panel
    ('k1000000-0000-0000-0000-000000000001', 'j1000000-0000-0000-0000-000000000001', 'Consultation Fee — Cardiology', 1, 250.00, 250.00),
    ('k1000000-0000-0000-0000-000000000002', 'j1000000-0000-0000-0000-000000000001', 'Complete Blood Count',          1,  50.00,  50.00),
    ('k1000000-0000-0000-0000-000000000003', 'j1000000-0000-0000-0000-000000000001', 'Lipid Panel',                  1,  50.00,  50.00),
    -- Invoice 2 (Partially Paid — $250): General Medicine consult + Glucose + HbA1c
    ('k1000000-0000-0000-0000-000000000004', 'j1000000-0000-0000-0000-000000000002', 'Consultation Fee — General Medicine', 1, 150.00, 150.00),
    ('k1000000-0000-0000-0000-000000000005', 'j1000000-0000-0000-0000-000000000002', 'Fasting Blood Glucose',               1,  40.00,  40.00),
    ('k1000000-0000-0000-0000-000000000006', 'j1000000-0000-0000-0000-000000000002', 'HbA1c',                               1,  60.00,  60.00),
    -- Invoice 3 (Unpaid — $550): Cardiology consult + Thyroid Panel + Vitamin D
    ('k1000000-0000-0000-0000-000000000007', 'j1000000-0000-0000-0000-000000000003', 'Consultation Fee — Cardiology', 1, 250.00, 250.00),
    ('k1000000-0000-0000-0000-000000000008', 'j1000000-0000-0000-0000-000000000003', 'Thyroid Panel (TSH, T3, T4)', 1, 150.00, 150.00),
    ('k1000000-0000-0000-0000-000000000009', 'j1000000-0000-0000-0000-000000000003', 'Vitamin D 25-Hydroxy',         1, 150.00, 150.00)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- PAYMENTS
-- ==========================================

INSERT INTO payments (id, invoice_id, amount, payment_method, payment_date) VALUES
    ('l1000000-0000-0000-0000-000000000001',
     'j1000000-0000-0000-0000-000000000001',
     350.00, 'Card', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    ('l1000000-0000-0000-0000-000000000002',
     'j1000000-0000-0000-0000-000000000002',
     150.00, 'Cash', CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- AUDIT LOGS
-- ==========================================

INSERT INTO audit_logs (id, user_id, action, table_name, created_at) VALUES
    ('m1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'LOGIN', 'users', CURRENT_TIMESTAMP - INTERVAL '7 days'),
    ('m1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'CREATE_USER', 'users', CURRENT_TIMESTAMP - INTERVAL '7 days'),
    ('m1000000-0000-0000-0000-000000000003', '44444444-4444-4444-4444-444444444444', 'CREATE_APPOINTMENT', 'appointments', CURRENT_TIMESTAMP - INTERVAL '3 days'),
    ('m1000000-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'COMPLETE_CONSULTATION', 'appointments', CURRENT_TIMESTAMP - INTERVAL '3 days'),
    ('m1000000-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 'ISSUE_PRESCRIPTION', 'prescriptions', CURRENT_TIMESTAMP - INTERVAL '3 days'),
    ('m1000000-0000-0000-0000-000000000006', '22222222-2222-2222-2222-222222222222', 'SUBMIT_LAB_REQUEST', 'lab_requests', CURRENT_TIMESTAMP - INTERVAL '3 days'),
    ('m1000000-0000-0000-0000-000000000007', '66666666-6666-6666-6666-666666666666', 'PROCESS_LAB_RESULT', 'lab_results', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    ('m1000000-0000-0000-0000-000000000008', '44444444-4444-4444-4444-444444444444', 'RECORD_PAYMENT', 'payments', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    ('m1000000-0000-0000-0000-000000000009', '44444444-4444-4444-4444-444444444444', 'CREATE_INVOICE', 'invoices', CURRENT_TIMESTAMP - INTERVAL '3 days'),
    ('m1000000-0000-0000-0000-000000000010', '44444444-4444-4444-4444-444444444444', 'UPDATE_INVOICE', 'invoices', CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- COMMIT
-- ==========================================

COMMIT;
