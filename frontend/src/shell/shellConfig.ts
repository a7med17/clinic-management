import { Ionicons } from '@expo/vector-icons';
import { colors } from '../ui/ClinicComponents';
import { Role } from '../ui/clinicData';

type IconName = keyof typeof Ionicons.glyphMap;

export type ShellNavigationTarget = {
  name: string;
  params?: Record<string, unknown>;
  scope?: 'current' | 'root';
};

export type ShellTask = {
  icon: IconName;
  value: string;
  label: string;
  tone: string;
};

export type ShellAction = {
  icon: IconName;
  title: string;
  subtitle?: string;
  tone: string;
  target?: ShellNavigationTarget;
};

export type ShellActivity = {
  icon: IconName;
  title: string;
  subtitle?: string;
  meta?: string;
  status?: string;
  tone: string;
  target?: ShellNavigationTarget;
};

export type RoleShellConfig = {
  title: string;
  searchPlaceholder: string;
  taskCenter: ShellTask[];
  quickActions: ShellAction[];
  todaysActivity: ShellActivity[];
  recentActivity: ShellActivity[];
};

export const roleShellConfig: Record<Role, RoleShellConfig> = {
  Admin: {
    title: 'Operations command center',
    searchPlaceholder: 'Search patients, staff, invoices, or reports...',
    taskCenter: [
      { icon: 'people-outline', value: '24', label: 'Staff online', tone: colors.green },
      { icon: 'alert-circle-outline', value: '5', label: 'Needs review', tone: colors.orange },
    ],
    quickActions: [
      { icon: 'people-outline', title: 'User Management', subtitle: 'Manage access', tone: colors.teal, target: { name: 'AdminUsers', scope: 'root' } },
      { icon: 'pulse-outline', title: 'Active Staff', subtitle: 'Availability', tone: colors.green, target: { name: 'ActiveStaff', scope: 'root' } },
      { icon: 'analytics-outline', title: 'Reports', subtitle: 'Clinic trends', tone: colors.blue, target: { name: 'Reports' } },
      { icon: 'construct-outline', title: 'Management', subtitle: 'Modules', tone: colors.purple, target: { name: 'Management' } },
    ],
    todaysActivity: [
      { icon: 'calendar-outline', title: 'Clinic schedule', subtitle: 'Appointments and waiting room activity', meta: 'Today', status: 'Live', tone: colors.blue },
      { icon: 'receipt-outline', title: 'Billing review', subtitle: 'Invoices pending admin oversight', meta: 'Operations', status: '5', tone: colors.orange },
    ],
    recentActivity: [
      { icon: 'shield-checkmark-outline', title: 'Auth security baseline merged', subtitle: 'Secure sessions and backend hardening are active', meta: 'Sprint 0', tone: colors.green },
      { icon: 'document-text-outline', title: 'Reports workspace ready', subtitle: 'Use existing reports tab for current summaries', meta: 'Available', tone: colors.blue, target: { name: 'Reports' } },
    ],
  },
  Doctor: {
    title: 'Clinical workspace',
    searchPlaceholder: 'Search patients, appointments, or lab requests...',
    taskCenter: [
      { icon: 'calendar-outline', value: '8', label: 'Appointments', tone: colors.blue },
      { icon: 'flask-outline', value: '3', label: 'Lab follow-ups', tone: colors.red },
    ],
    quickActions: [
      { icon: 'calendar-outline', title: 'Schedule', subtitle: 'Today', tone: colors.blue, target: { name: 'Schedule' } },
      { icon: 'people-outline', title: 'Patients', subtitle: 'Assigned list', tone: colors.teal, target: { name: 'Patients' } },
      { icon: 'flask-outline', title: 'Lab Tests', subtitle: 'Requests', tone: colors.red, target: { name: 'DoctorLabTests', scope: 'root' } },
      { icon: 'document-text-outline', title: 'Notes', subtitle: 'Consultations', tone: colors.purple, target: { name: 'Schedule' } },
    ],
    todaysActivity: [
      { icon: 'time-outline', title: 'Next consultation', subtitle: 'Review schedule before patient visit', meta: 'Today', status: 'Next', tone: colors.orange, target: { name: 'Schedule' } },
      { icon: 'checkmark-done-outline', title: 'Completed visits', subtitle: 'Consultation notes ready for review', meta: 'Clinical', status: '4', tone: colors.green },
    ],
    recentActivity: [
      { icon: 'person-outline', title: 'Patient list updated', subtitle: 'Assigned clinical records are available', meta: 'Recent', tone: colors.teal, target: { name: 'Patients' } },
      { icon: 'flask-outline', title: 'Lab result queue', subtitle: 'Diagnostic follow-ups pending', meta: 'Recent', tone: colors.red, target: { name: 'DoctorLabTests', scope: 'root' } },
    ],
  },
  Receptionist: {
    title: 'Front desk workspace',
    searchPlaceholder: 'Search patients, appointments, queues, or invoices...',
    taskCenter: [
      { icon: 'time-outline', value: '6', label: 'Waiting', tone: colors.orange },
      { icon: 'receipt-outline', value: '3', label: 'Billing tasks', tone: colors.teal },
    ],
    quickActions: [
      { icon: 'person-add-outline', title: 'Register', subtitle: 'New patient', tone: colors.orange, target: { name: 'ReceptionPatientForm', scope: 'root' } },
      { icon: 'calendar-outline', title: 'Schedule', subtitle: 'Appointment', tone: colors.blue, target: { name: 'ReceptionAppointmentForm', scope: 'root' } },
      { icon: 'people-outline', title: 'Patients', subtitle: 'Directory', tone: colors.teal, target: { name: 'Patients' } },
      { icon: 'cash-outline', title: 'Billing', subtitle: 'Invoices', tone: colors.green, target: { name: 'Billing' } },
    ],
    todaysActivity: [
      { icon: 'walk-outline', title: 'Waiting room', subtitle: 'Patients checked in for today', meta: 'Queue', status: '6', tone: colors.orange, target: { name: 'ReceptionWaitingRoom', scope: 'root' } },
      { icon: 'calendar-outline', title: 'Appointments', subtitle: 'Confirm, check in, or reschedule visits', meta: 'Today', tone: colors.blue, target: { name: 'Appointments' } },
    ],
    recentActivity: [
      { icon: 'person-outline', title: 'Patient record created', subtitle: 'New demographic intake ready', meta: 'Recent', tone: colors.teal, target: { name: 'Patients' } },
      { icon: 'card-outline', title: 'Payment recorded', subtitle: 'Invoice workflow available from billing', meta: 'Recent', tone: colors.green, target: { name: 'Billing' } },
    ],
  },
  Patient: {
    title: 'Personal care hub',
    searchPlaceholder: 'Search appointments, records, prescriptions, or lab results...',
    taskCenter: [
      { icon: 'calendar-outline', value: '1', label: 'Upcoming', tone: colors.blue },
      { icon: 'flask-outline', value: '2', label: 'Results', tone: colors.red },
    ],
    quickActions: [
      { icon: 'calendar-outline', title: 'Book Appt', subtitle: 'Find a doctor', tone: colors.blue, target: { name: 'PatientBookAppointment', scope: 'root' } },
      { icon: 'document-text-outline', title: 'Records', subtitle: 'Health file', tone: colors.purple, target: { name: 'Records' } },
      { icon: 'flask-outline', title: 'Lab Results', subtitle: 'Diagnostics', tone: colors.red, target: { name: 'PatientLabResults', scope: 'root' } },
      { icon: 'medical-outline', title: 'Appointments', subtitle: 'Visits', tone: colors.teal, target: { name: 'Appointments' } },
    ],
    todaysActivity: [
      { icon: 'calendar-outline', title: 'Upcoming appointment', subtitle: 'Review visit details and notes', meta: 'Today', status: 'Confirmed', tone: colors.blue, target: { name: 'Appointments' } },
      { icon: 'heart-outline', title: 'Health summary', subtitle: 'Emergency and allergy details available', meta: 'Profile', tone: colors.green, target: { name: 'Records' } },
    ],
    recentActivity: [
      { icon: 'flask-outline', title: 'Lab result ready', subtitle: 'Open diagnostics to review available results', meta: 'Recent', tone: colors.red, target: { name: 'PatientLabResults', scope: 'root' } },
      { icon: 'receipt-outline', title: 'Visit history updated', subtitle: 'Recent appointments appear in records', meta: 'Recent', tone: colors.purple, target: { name: 'Records' } },
    ],
  },
  'Laboratory Staff': {
    title: 'Diagnostic center',
    searchPlaceholder: 'Search tests, patients, samples, or results...',
    taskCenter: [
      { icon: 'clipboard-outline', value: '12', label: 'Pending', tone: colors.red },
      { icon: 'flask-outline', value: '5', label: 'Processing', tone: colors.blue },
    ],
    quickActions: [
      { icon: 'flask-outline', title: 'Tests', subtitle: 'Queue', tone: colors.red, target: { name: 'Tests' } },
      { icon: 'document-attach-outline', title: 'Results', subtitle: 'Completed', tone: colors.green, target: { name: 'Results' } },
      { icon: 'checkmark-circle-outline', title: 'Verify', subtitle: 'Pending signoff', tone: colors.blue, target: { name: 'Tests' } },
      { icon: 'notifications-outline', title: 'Alerts', subtitle: 'Updates', tone: colors.orange, target: { name: 'Notifications', scope: 'root' } },
    ],
    todaysActivity: [
      { icon: 'flask-outline', title: 'Test queue', subtitle: 'Process pending diagnostic requests', meta: 'Today', status: '12', tone: colors.red, target: { name: 'Tests' } },
      { icon: 'document-text-outline', title: 'Results ready', subtitle: 'Completed reports awaiting review', meta: 'Today', status: '4', tone: colors.green, target: { name: 'Results' } },
    ],
    recentActivity: [
      { icon: 'beaker-outline', title: 'Sample received', subtitle: 'New lab request entered into queue', meta: 'Recent', tone: colors.blue, target: { name: 'Tests' } },
      { icon: 'checkmark-done-outline', title: 'Result completed', subtitle: 'Diagnostic result marked complete', meta: 'Recent', tone: colors.green, target: { name: 'Results' } },
    ],
  },
  Pharmacist: {
    title: 'Pharmacy operations',
    searchPlaceholder: 'Search medicines, prescriptions, stock, or alerts...',
    taskCenter: [
      { icon: 'warning-outline', value: '3', label: 'Low stock', tone: colors.red },
      { icon: 'cube-outline', value: '24', label: 'Items active', tone: colors.blue },
    ],
    quickActions: [
      { icon: 'cube-outline', title: 'Inventory', subtitle: 'Stock levels', tone: colors.blue, target: { name: 'Inventory' } },
      { icon: 'bandage-outline', title: 'Medicines', subtitle: 'Catalog', tone: colors.green, target: { name: 'Medicines' } },
      { icon: 'notifications-outline', title: 'Alerts', subtitle: 'Low stock', tone: colors.red, target: { name: 'Alerts' } },
      { icon: 'receipt-outline', title: 'Dispense', subtitle: 'Prescriptions', tone: colors.purple, target: { name: 'Medicines' } },
    ],
    todaysActivity: [
      { icon: 'warning-outline', title: 'Low stock alerts', subtitle: 'Review critical pharmacy inventory', meta: 'Today', status: '3', tone: colors.red, target: { name: 'Alerts' } },
      { icon: 'medkit-outline', title: 'Dispensing queue', subtitle: 'Prescriptions ready for processing', meta: 'Today', tone: colors.green, target: { name: 'Medicines' } },
    ],
    recentActivity: [
      { icon: 'cube-outline', title: 'Inventory updated', subtitle: 'Stock count changed for active medicines', meta: 'Recent', tone: colors.blue, target: { name: 'Inventory' } },
      { icon: 'alert-circle-outline', title: 'Expiry watch', subtitle: 'Review expiring stock during daily checks', meta: 'Recent', tone: colors.orange, target: { name: 'Alerts' } },
    ],
  },
};

