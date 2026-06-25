import { useEffect, useState } from 'react';
import { getAdminDashboardSummary, getActiveStaff } from '../services/adminService';
import { getDoctorDashboard } from '../services/doctorService';
import { getLabTests, LabTestRecord } from '../services/labService';
import { getPatientDashboard } from '../services/patientService';
import { getMedicines, Medicine } from '../services/pharmacyService';
import { getReceptionDashboard } from '../services/receptionService';
import { colors } from '../ui/ClinicComponents';
import { Role } from '../ui/clinicData';
import { ShellActivity, ShellTask } from './shellConfig';

type ShellDashboardSections = {
  taskCenter?: ShellTask[];
  todaysActivity?: ShellActivity[];
  recentActivity?: ShellActivity[];
};

type ShellDashboardState = ShellDashboardSections & {
  loading: boolean;
  error: string | null;
};

const emptyState: ShellDashboardState = {
  loading: false,
  error: null,
};

const countByStatus = <T extends { status?: string }>(items: T[], status: string) =>
  items.filter((item) => item.status?.toLowerCase() === status.toLowerCase()).length;

const formatDateTime = (value?: string | null) => {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getPatientName = (record: any) =>
  record?.patients?.name || record?.patient?.name || record?.patient_name || 'Patient';

const getDoctorName = (record: any) =>
  record?.doctors?.name || record?.doctor?.name || record?.doctor_name || 'Doctor';

const hasArrayItems = <T,>(items?: T[]) => Array.isArray(items) && items.length > 0;

async function loadAdminShellData(): Promise<ShellDashboardSections> {
  const [dashboard, activeStaff] = await Promise.all([getAdminDashboardSummary(), getActiveStaff()]);

  return {
    taskCenter: [
      { icon: 'people-outline', value: String(dashboard.summary.activeStaff), label: 'Staff active', tone: colors.green },
      { icon: 'calendar-outline', value: String(dashboard.cards.todaysAppointments), label: 'Appointments', tone: colors.blue },
      { icon: 'person-outline', value: String(dashboard.cards.totalPatients), label: 'Patients', tone: colors.teal },
      { icon: 'receipt-outline', value: String(dashboard.cards.pendingBills), label: 'Pending bills', tone: colors.orange },
    ],
    todaysActivity: [
      {
        icon: 'pulse-outline',
        title: 'Active staff',
        subtitle: `${activeStaff.length} staff accounts currently active`,
        meta: 'Live',
        status: String(activeStaff.length),
        tone: colors.green,
        target: { name: 'ActiveStaff', scope: 'root' },
      },
      {
        icon: 'calendar-outline',
        title: 'Clinic schedule',
        subtitle: `${dashboard.summary.waitingPatients} waiting, ${dashboard.summary.completedAppointments} completed`,
        meta: 'Today',
        status: String(dashboard.cards.todaysAppointments),
        tone: colors.blue,
      },
    ],
    recentActivity: [
      {
        icon: 'shield-checkmark-outline',
        title: 'System status',
        subtitle: dashboard.summary.systemStatus || 'Operational dashboard available',
        meta: formatDateTime(dashboard.generatedAt) || 'Live',
        status: 'Live',
        tone: colors.green,
      },
      {
        icon: 'people-outline',
        title: 'Doctor coverage',
        subtitle: `${dashboard.cards.totalDoctors} doctors in the clinic directory`,
        meta: 'Admin',
        tone: colors.teal,
        target: { name: 'AdminUsers', scope: 'root' },
      },
    ],
  };
}

async function loadDoctorShellData(): Promise<ShellDashboardSections> {
  const dashboard = await getDoctorDashboard();
  const appointments = dashboard.upcomingAppointments || [];
  const nextAppointment = appointments[0];

  return {
    taskCenter: [
      { icon: 'calendar-outline', value: String(dashboard.metrics.todaysAppointments), label: 'Appointments', tone: colors.blue },
      { icon: 'time-outline', value: String(dashboard.metrics.pendingConsultations), label: 'Pending consults', tone: colors.orange },
      { icon: 'people-outline', value: String(dashboard.metrics.patientQueue), label: 'Patient queue', tone: colors.teal },
      { icon: 'flask-outline', value: String(dashboard.metrics.labRequests), label: 'Lab requests', tone: colors.red },
    ],
    todaysActivity: [
      {
        icon: 'time-outline',
        title: nextAppointment ? `Next: ${getPatientName(nextAppointment)}` : 'No upcoming appointments',
        subtitle: nextAppointment ? `Status: ${nextAppointment.status}` : 'Your schedule has no upcoming visit from the current dashboard.',
        meta: formatDateTime(nextAppointment?.appointment_date) || 'Today',
        status: nextAppointment?.status || 'Clear',
        tone: nextAppointment ? colors.orange : colors.green,
        target: { name: 'Schedule' },
      },
      {
        icon: 'checkmark-done-outline',
        title: 'Completed visits',
        subtitle: 'Consultations completed today',
        meta: 'Clinical',
        status: String(dashboard.metrics.completedToday),
        tone: colors.green,
      },
    ],
    recentActivity: hasArrayItems(appointments)
      ? appointments.slice(0, 2).map((appointment) => ({
          icon: 'person-outline',
          title: getPatientName(appointment),
          subtitle: `Appointment status: ${appointment.status}`,
          meta: formatDateTime(appointment.appointment_date) || 'Upcoming',
          status: appointment.status,
          tone: colors.teal,
          target: { name: 'Schedule' },
        }))
      : undefined,
  };
}

async function loadReceptionShellData(): Promise<ShellDashboardSections> {
  const dashboard = await getReceptionDashboard();
  const waitingRoom = dashboard.waitingRoom || [];
  const nextWaitingPatient = waitingRoom[0];

  return {
    taskCenter: [
      { icon: 'calendar-outline', value: String(dashboard.metrics.todaysAppointments), label: 'Appointments', tone: colors.blue },
      { icon: 'time-outline', value: String(dashboard.metrics.waitingPatients), label: 'Waiting', tone: colors.orange },
      { icon: 'walk-outline', value: String(dashboard.metrics.checkedInPatients), label: 'Checked in', tone: colors.green },
      { icon: 'receipt-outline', value: String(dashboard.metrics.pendingBillingCount), label: 'Billing tasks', tone: colors.teal },
    ],
    todaysActivity: [
      {
        icon: 'walk-outline',
        title: nextWaitingPatient ? `Waiting: ${getPatientName(nextWaitingPatient)}` : 'Waiting room clear',
        subtitle: nextWaitingPatient ? `Queue position ${nextWaitingPatient.queuePosition || 1}` : 'No waiting patients returned by the dashboard.',
        meta: 'Queue',
        status: String(dashboard.metrics.waitingPatients),
        tone: dashboard.metrics.waitingPatients > 0 ? colors.orange : colors.green,
        target: { name: 'ReceptionWaitingRoom', scope: 'root' },
      },
      {
        icon: 'person-add-outline',
        title: 'New registrations',
        subtitle: 'Patients registered today',
        meta: 'Today',
        status: String(dashboard.metrics.newRegistrationsToday),
        tone: colors.teal,
        target: { name: 'Patients' },
      },
    ],
    recentActivity: hasArrayItems(waitingRoom)
      ? waitingRoom.slice(0, 2).map((appointment) => ({
          icon: 'person-outline',
          title: getPatientName(appointment),
          subtitle: `Appointment with ${getDoctorName(appointment)}`,
          meta: appointment.status,
          status: appointment.queuePosition ? `#${appointment.queuePosition}` : appointment.status,
          tone: colors.blue,
          target: { name: 'ReceptionWaitingRoom', scope: 'root' },
        }))
      : undefined,
  };
}

async function loadPatientShellData(): Promise<ShellDashboardSections> {
  const dashboard = await getPatientDashboard();
  const appointments = dashboard.recentActivity?.appointments || [];
  const labResults = dashboard.recentActivity?.labResults || [];
  const upcomingAppointment = dashboard.upcomingAppointment;
  const latestLabResult = dashboard.latestLabResult;
  const recentActivity: ShellActivity[] = [
    ...appointments.slice(0, 1).map((appointment): ShellActivity => ({
      icon: 'calendar-outline',
      title: 'Recent appointment',
      subtitle: `With ${getDoctorName(appointment)}`,
      meta: formatDateTime(appointment.appointment_date) || 'Recent',
      status: appointment.status,
      tone: colors.blue,
      target: { name: 'Appointments' },
    })),
    ...labResults.slice(0, 1).map((labResult: any): ShellActivity => ({
      icon: 'flask-outline',
      title: labResult.test_name || 'Lab result',
      subtitle: labResult.result || 'Open diagnostics to review available results',
      meta: labResult.status || 'Recent',
      status: labResult.status,
      tone: colors.red,
      target: { name: 'PatientLabResults', scope: 'root' },
    })),
  ];

  return {
    taskCenter: [
      { icon: 'calendar-outline', value: String(dashboard.appointmentCount), label: 'Appointments', tone: colors.blue },
      { icon: 'flask-outline', value: String(labResults.length), label: 'Lab results', tone: colors.red },
      { icon: 'heart-outline', value: dashboard.healthSummary?.bloodType || '—', label: 'Blood type', tone: colors.green },
    ],
    todaysActivity: [
      {
        icon: 'calendar-outline',
        title: upcomingAppointment ? 'Upcoming appointment' : 'No upcoming appointment',
        subtitle: upcomingAppointment ? `With ${getDoctorName(upcomingAppointment)}` : 'Book a visit when you need care.',
        meta: formatDateTime(upcomingAppointment?.appointment_date) || 'Patient',
        status: upcomingAppointment?.status || 'Open',
        tone: upcomingAppointment ? colors.blue : colors.green,
        target: { name: 'Appointments' },
      },
      {
        icon: 'flask-outline',
        title: latestLabResult ? 'Latest lab result' : 'No lab results yet',
        subtitle: latestLabResult?.test_name || 'Completed diagnostics will appear here.',
        meta: latestLabResult?.status || 'Labs',
        status: latestLabResult?.status,
        tone: latestLabResult ? colors.red : colors.teal,
        target: { name: 'PatientLabResults', scope: 'root' },
      },
    ],
    recentActivity,
  };
}

const isExpiringSoon = (medicine: Medicine) => {
  if (!medicine.expiry_date) return false;

  const expiryDate = new Date(medicine.expiry_date);
  if (Number.isNaN(expiryDate.getTime())) return false;

  const today = new Date();
  const ninetyDaysFromNow = new Date(today);
  ninetyDaysFromNow.setDate(today.getDate() + 90);

  return expiryDate >= today && expiryDate <= ninetyDaysFromNow;
};

async function loadPharmacistShellData(): Promise<ShellDashboardSections> {
  const medicines = await getMedicines();
  const lowStock = medicines.filter((medicine) => Number(medicine.quantity) <= 10);
  const expiringSoon = medicines.filter(isExpiringSoon);

  return {
    taskCenter: [
      { icon: 'warning-outline', value: String(lowStock.length), label: 'Low stock', tone: colors.red },
      { icon: 'cube-outline', value: String(medicines.length), label: 'Items active', tone: colors.blue },
      { icon: 'alert-circle-outline', value: String(expiringSoon.length), label: 'Expiring soon', tone: colors.orange },
    ],
    todaysActivity: [
      {
        icon: 'warning-outline',
        title: lowStock[0]?.name || 'Low stock alerts',
        subtitle: lowStock[0] ? `${lowStock[0].quantity} units remaining` : 'No low stock medicines returned by inventory.',
        meta: 'Inventory',
        status: String(lowStock.length),
        tone: lowStock.length > 0 ? colors.red : colors.green,
        target: { name: 'Alerts' },
      },
      {
        icon: 'cube-outline',
        title: 'Medicine catalog',
        subtitle: `${medicines.length} active medicine records`,
        meta: 'Live',
        status: String(medicines.length),
        tone: colors.blue,
        target: { name: 'Medicines' },
      },
    ],
    recentActivity: expiringSoon.slice(0, 2).map((medicine) => ({
      icon: 'alert-circle-outline',
      title: medicine.name,
      subtitle: 'Expiry watch item',
      meta: medicine.expiry_date ? formatDateTime(medicine.expiry_date) : 'Expiry',
      status: 'Review',
      tone: colors.orange,
      target: { name: 'Alerts' },
    })),
  };
}

async function loadLabShellData(): Promise<ShellDashboardSections> {
  const labTests = await getLabTests();
  const pending = countByStatus(labTests, 'Pending');
  const processing = countByStatus(labTests, 'Processing');
  const completed = countByStatus(labTests, 'Completed');

  return {
    taskCenter: [
      { icon: 'clipboard-outline', value: String(pending), label: 'Pending', tone: colors.red },
      { icon: 'flask-outline', value: String(processing), label: 'Processing', tone: colors.blue },
      { icon: 'checkmark-circle-outline', value: String(completed), label: 'Completed', tone: colors.green },
    ],
    todaysActivity: [
      {
        icon: 'flask-outline',
        title: 'Test queue',
        subtitle: 'Process pending diagnostic requests',
        meta: 'Live',
        status: String(pending),
        tone: pending > 0 ? colors.red : colors.green,
        target: { name: 'Tests' },
      },
      {
        icon: 'document-text-outline',
        title: 'Results ready',
        subtitle: 'Completed reports available for review',
        meta: 'Live',
        status: String(completed),
        tone: colors.green,
        target: { name: 'Results' },
      },
    ],
    recentActivity: labTests.slice(0, 2).map((test: LabTestRecord) => ({
      icon: 'beaker-outline',
      title: test.test_name,
      subtitle: `Status: ${test.status}`,
      meta: formatDateTime(test.created_at) || 'Recent',
      status: test.status,
      tone: test.status === 'Completed' ? colors.green : test.status === 'Processing' ? colors.blue : colors.red,
      target: { name: test.status === 'Completed' ? 'Results' : 'Tests' },
    })),
  };
}

async function loadShellDashboardData(role: Role): Promise<ShellDashboardSections> {
  switch (role) {
    case 'Admin':
      return loadAdminShellData();
    case 'Doctor':
      return loadDoctorShellData();
    case 'Receptionist':
      return loadReceptionShellData();
    case 'Patient':
      return loadPatientShellData();
    case 'Laboratory Staff':
      return loadLabShellData();
    case 'Pharmacist':
      return loadPharmacistShellData();
    default:
      return {};
  }
}

export function useShellDashboardData(role: Role): ShellDashboardState {
  const [state, setState] = useState<ShellDashboardState>(emptyState);

  useEffect(() => {
    let isMounted = true;

    setState({ loading: true, error: null });

    loadShellDashboardData(role)
      .then((data) => {
        if (!isMounted) return;
        setState({ ...data, loading: false, error: null });
      })
      .catch((error) => {
        if (!isMounted) return;

        console.warn('[ApplicationShell] Dashboard data request failed:', {
          role,
          message: error?.message,
          status: error?.response?.status,
        });
        setState({ loading: false, error: 'Live dashboard data is temporarily unavailable.' });
      });

    return () => {
      isMounted = false;
    };
  }, [role]);

  return state;
}
