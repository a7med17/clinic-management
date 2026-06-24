// Shared role vocabulary plus static presentation data for screens that do not yet have live API backing.
export type Role = 'Admin' | 'Doctor' | 'Patient' | 'Receptionist' | 'Pharmacist' | 'Laboratory Staff';

// Fallback profile display values used until the authenticated profile has loaded.
export const roleProfiles: Record<Role, { name: string; title: string; email: string; phone: string; department: string }> = {
  Admin: {
    name: 'Nadia Rahman',
    title: 'Clinic Administrator',
    email: 'admin@medicore.local',
    phone: '+973 1722 4100',
    department: 'Operations',
  },
  Doctor: {
    name: 'Dr. Sarah Smith',
    title: 'Consultant Cardiologist',
    email: 'sarah.smith@medicore.local',
    phone: '+973 1722 4124',
    department: 'Cardiology',
  },
  Patient: {
    name: 'Alex Johnson',
    title: 'Patient',
    email: 'alex.johnson@email.com',
    phone: '+973 3777 1842',
    department: 'Primary Care',
  },
  Receptionist: {
    name: 'Maya George',
    title: 'Front Desk Coordinator',
    email: 'frontdesk@medicore.local',
    phone: '+973 1722 4101',
    department: 'Reception',
  },
  Pharmacist: {
    name: 'Omar Khalid',
    title: 'Lead Pharmacist',
    email: 'pharmacy@medicore.local',
    phone: '+973 1722 4140',
    department: 'Pharmacy',
  },
  'Laboratory Staff': {
    name: 'Lina Haddad',
    title: 'Laboratory Technologist',
    email: 'lab@medicore.local',
    phone: '+973 1722 4150',
    department: 'Diagnostic Center',
  },
};

export const notifications = [
  { id: 'n1', title: 'Appointment confirmed', body: 'Mark Henderson checked in for cardiology follow-up.', time: '8 min ago', tone: 'blue' },
  { id: 'n2', title: 'Low stock alert', body: 'Amoxicillin and Ibuprofen are below threshold.', time: '24 min ago', tone: 'red' },
  { id: 'n3', title: 'Lab result ready', body: 'CBC results for Emma Watson are ready for review.', time: '1 hr ago', tone: 'green' },
  { id: 'n4', title: 'Billing review', body: 'Three invoices require payment confirmation.', time: 'Today', tone: 'orange' },
];

export const patients = [
  { id: 'P-1042', name: 'Mark Henderson', meta: 'Cardiology follow-up', status: 'In Progress', detail: '10:00 AM with Dr. Sarah Smith' },
  { id: 'P-1043', name: 'Emma Watson', meta: 'New patient routine checkup', status: 'Waiting', detail: '10:30 AM with Dr. John Doe' },
  { id: 'P-1044', name: 'James Miller', meta: 'ECG review', status: 'Scheduled', detail: '11:00 AM with Dr. Sarah Smith' },
  { id: 'P-1045', name: 'Emily Davis', meta: 'General consultation', status: 'Waiting', detail: '11:20 AM with Dr. John Doe' },
];

export const appointments = [
  { id: 'A-2201', title: 'Dr. Sarah Smith', subtitle: 'Cardiologist', time: 'Tomorrow, 10:00 AM', status: 'Confirmed' },
  { id: 'A-2202', title: 'Dental Cleaning', subtitle: 'Harborview Dental', time: 'Friday, 2:30 PM', status: 'Scheduled' },
  { id: 'A-2203', title: 'Routine Checkup', subtitle: 'Dr. John Doe', time: 'Monday, 9:15 AM', status: 'Pending' },
];

export const labTests = [
  { id: 'L-881', name: 'Complete Blood Count', patient: 'Mark Henderson', status: 'Processing', time: '45m left', requester: 'Dr. Sarah Smith' },
  { id: 'L-882', name: 'Lipid Panel', patient: 'Alex Johnson', status: 'Pending', time: 'Start', requester: 'Dr. Sarah Smith' },
  { id: 'L-883', name: 'Urinalysis', patient: 'Emily Davis', status: 'Pending', time: 'Start', requester: 'Dr. John Doe' },
  { id: 'L-884', name: 'HbA1c', patient: 'James Miller', status: 'Completed', time: 'Ready', requester: 'Dr. Sarah Smith' },
];

export const medicines = [
  { id: 'M-01', name: 'Paracetamol 500mg', stock: '248 boxes', status: 'Healthy', meta: 'Analgesic' },
  { id: 'M-02', name: 'Amoxicillin 250mg', stock: '12 boxes', status: 'Low', meta: 'Antibiotic' },
  { id: 'M-03', name: 'Ibuprofen 400mg', stock: '9 boxes', status: 'Low', meta: 'Anti-inflammatory' },
  { id: 'M-04', name: 'Vitamin C', stock: '86 bottles', status: 'Healthy', meta: 'Supplement' },
];

export const prescriptions = [
  { id: 'RX-8492', patient: 'Alex Johnson', items: 'Paracetamol 500mg, Vitamin C', status: 'Pending' },
  { id: 'RX-8493', patient: 'Mariam Ali', items: 'Amoxicillin 250mg', status: 'Ready' },
  { id: 'RX-8494', patient: 'Robert Brown', items: 'Ibuprofen 400mg', status: 'Dispensed' },
];

export const invoices = [
  { id: 'INV-2011', name: 'Alex Johnson', meta: 'Cardiology consultation', amount: 'BHD 42.000', status: 'Paid' },
  { id: 'INV-2012', name: 'Emma Watson', meta: 'Registration and lab package', amount: 'BHD 28.500', status: 'Pending' },
  { id: 'INV-2013', name: 'Mark Henderson', meta: 'ECG and follow-up', amount: 'BHD 35.000', status: 'Review' },
];

export const reports = [
  { title: 'Patient Growth', value: '+12%', meta: 'Month over month', accent: '#0ea5e9' },
  { title: 'Appointment Trends', value: '86%', meta: 'Utilization this week', accent: '#2563eb' },
  { title: 'Revenue', value: 'BHD 18.4k', meta: 'Projected monthly billing', accent: '#10b981' },
  { title: 'Pharmacy', value: '94%', meta: 'Stock availability', accent: '#f97316' },
  { title: 'Laboratory', value: '31', meta: 'Tests completed today', accent: '#e11d48' },
];

export const adminModules = [
  'User Management',
  'Patient Management',
  'Doctor Management',
  'Appointment Management',
  'Billing & Invoices',
  'Pharmacy',
  'Laboratory',
  'Reports',
];
