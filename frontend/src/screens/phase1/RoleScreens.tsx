// Role-aware screen collection. Each workflow is grouped below but shares the same design primitives and API adapters.
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { changePassword as changeOwnPassword, getCurrentUserProfile, logout } from '../../services/authService';
import {
  ActiveStaff,
  AdminDashboardSummary,
  AdminUser,
  createAdminUser,
  getActiveStaff,
  getAdminDashboardSummary,
  getAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
  updateAdminUserStatus,
} from '../../services/adminService';
import {
  AppointmentStatus,
  DoctorAppointment,
  DoctorDashboardData,
  DoctorLabTest,
  createDoctorLabTest,
  getDoctorAppointment,
  getDoctorAppointments,
  getDoctorDashboard,
  getDoctorLabTests,
  getDoctorPatient,
  getDoctorPatients,
  getDoctorProfile,
  updateDoctorAppointmentNotes,
  updateDoctorAppointmentStatus,
} from '../../services/doctorService';
import {
  PatientAppointment,
  PatientDashboardData,
  PatientRecordsData,
  bookPatientAppointment,
  cancelPatientAppointment,
  getDoctorsForBooking,
  getPatientAppointments,
  getPatientDashboard,
  getPatientLabResults,
  getPatientProfile,
  getPatientRecords,
  updatePatientProfile,
} from '../../services/patientService';
import {
  ReceptionAppointment,
  ReceptionDashboardData,
  ReceptionInvoice,
  ReceptionPatient,
  cancelReceptionAppointment,
  checkInReceptionAppointment,
  createReceptionAppointment,
  createReceptionInvoice,
  getReceptionAppointments,
  getReceptionDashboard,
  getReceptionInvoices,
  getReceptionPatients,
  getReceptionProfile,
  getReceptionWaitingRoom,
  recordReceptionPayment,
  updateReceptionAppointment,
  updateReceptionProfile,
} from '../../services/receptionService';
import { Medicine, getMedicines } from '../../services/pharmacyService';
import { LabTestRecord, getLabTests, updateLabTest } from '../../services/labService';
import { PatientRegistrationPayload, PatientRecord, createPatientRecord, listPatients, updatePatientRecord } from '../../services/patientDirectoryService';
import ApplicationShellScreen from '../../shell/ApplicationShellScreen';
import {
  ActionCard,
  ChartCard,
  Content,
  Header,
  ListRow,
  Screen,
  SearchBar,
  SectionHeader,
  StatCard,
  colors,
} from '../../ui/ClinicComponents';
import {
  Role,
  adminModules,
  appointments,
  invoices,
  labTests,
  medicines,
  notifications,
  patients,
  prescriptions,
  reports,
  roleProfiles,
} from '../../ui/clinicData';

const adminRoles: Role[] = ['Admin', 'Doctor', 'Patient', 'Receptionist', 'Pharmacist', 'Laboratory Staff'];
const appointmentStatuses: AppointmentStatus[] = ['Pending', 'Confirmed', 'Checked In', 'In Consultation', 'Completed', 'Cancelled', 'No Show'];
const labStatuses = ['All', 'Pending', 'Processing', 'Completed', 'Cancelled'];

// Resolve role/user data supplied once by the navigator; fallbacks keep preview screens usable without a session.
function getRole(route: any): Role {
  return route?.params?.user?.role || 'Patient';
}

function getName(route: any): string {
  const role = getRole(route);
  return route?.params?.user?.name || roleProfiles[role].name;
}

function grid(children: React.ReactNode) {
  return <View style={local.grid}>{children}</View>;
}

function formatPatientMeta(patient: PatientRecord) {
  return [patient.phone, patient.email].filter(Boolean).join(' • ') || 'No contact details';
}

function PatientDirectoryScreen({ navigation, title, subtitle, role }: { navigation: any; title: string; subtitle: string; role: 'Admin' | 'Receptionist' }) {
  const [items, setItems] = useState<PatientRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (query = search) => {
    try {
      setLoading(true);
      setError('');
      setItems(await listPatients(query.trim() || undefined));
    } catch (loadError: any) {
      console.error(`[${role} Patients] Load error:`, loadError.response?.data || loadError.message);
      setError(loadError.response?.data?.message || 'Unable to load patients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load('');
  }, []);

  return (
    <Screen>
      <Content>
        <Header title={title} subtitle={subtitle} navigation={navigation} />
        <View style={local.formCard}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => load(search)}
            placeholder="Search name, phone, or email"
            placeholderTextColor="#8b97a8"
            style={local.input}
            autoCapitalize="none"
          />
          <TouchableOpacity style={local.secondaryButton} onPress={() => load(search)}>
            <Text style={local.secondaryButtonText}>Search Patients</Text>
          </TouchableOpacity>
        </View>
        {loading ? <ActivityIndicator color={colors.teal} /> : null}
        {error ? (
          <TouchableOpacity style={local.stateCard} onPress={() => load(search)}>
            <Text style={local.errorText}>{error}</Text>
            <Text style={local.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        ) : null}
        {!loading && !error && items.length === 0 ? <Text style={local.stateText}>No patients found.</Text> : null}
        {items.map((item) => (
          <ListRow
            key={item.id}
            title={item.name}
            subtitle={formatPatientMeta(item)}
            meta={item.gender || item.blood_type || 'Patient directory'}
            status={item.blood_type || undefined}
            icon="person-outline"
            tone={colors.teal}
            onPress={() => navigation.getParent()?.navigate('PatientDetails', { patientId: item.id, patient: item, role })}
          />
        ))}
      </Content>
    </Screen>
  );
}

// Dashboard dispatcher: each role receives only its dashboard and its API calls.
export function RoleDashboardScreen({ navigation, route }: any) {
  const role = getRole(route);
  const user = route?.params?.user || { role, name: getName(route) };

  return <ApplicationShellScreen navigation={navigation} route={route} user={user} />;
}

// ── Role dashboards: fetch independently owned metrics and expose role-specific next actions. ──
function AdminDashboard({ navigation }: any) {
  const [dashboard, setDashboard] = useState<AdminDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAdminDashboardSummary();
      setDashboard(data);
    } catch (loadError: any) {
      console.error('[Admin Dashboard] Unable to load dashboard metrics:', {
        message: loadError.message,
        status: loadError.response?.status,
        data: loadError.response?.data,
      });
      setDashboard(null);
      setError(loadError.response?.data?.message || 'Unable to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const cards = dashboard?.cards;
  const summary = dashboard?.summary;
  const formatCount = (value?: number) => (value === undefined ? '-' : value.toLocaleString());
  const summaryRows = [
    ['Active Staff', `${formatCount(summary?.activeStaff)} staff currently active`, 'pulse-outline', colors.green],
    ['Waiting Patients', `${formatCount(summary?.waitingPatients)} patients currently checked in`, 'time-outline', colors.orange],
    ['Completed Appointments', `${formatCount(summary?.completedAppointments)} visits completed today`, 'checkmark-done-outline', colors.teal],
    ['System Status', `All services ${summary?.systemStatus?.toLowerCase() || 'unavailable'}`, 'shield-checkmark-outline', colors.blue],
  ];

  return (
    <Screen>
      <Content>
        <Header title="Admin Portal" subtitle="System Overview" navigation={navigation} />
        {loading ? (
          <View style={local.stateCard}>
            <ActivityIndicator color={colors.teal} />
            <Text style={local.stateText}>Loading dashboard metrics...</Text>
          </View>
        ) : null}
        {error ? (
          <TouchableOpacity activeOpacity={0.82} style={local.stateCard} onPress={loadDashboard}>
            <Ionicons name="alert-circle-outline" size={22} color={colors.red} />
            <Text style={local.stateText}>{error}</Text>
            <Text style={local.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        ) : null}
        {grid(
          <>
            <StatCard icon="people-outline" value={formatCount(cards?.totalPatients)} label="Total Patients" tone={colors.teal} />
            <StatCard icon="medical-outline" value={formatCount(cards?.totalDoctors)} label="Total Doctors" tone={colors.blue} />
            <StatCard icon="calendar-outline" value={formatCount(cards?.todaysAppointments)} label="Today's Appts" tone={colors.orange} />
            <StatCard icon="receipt-outline" value={formatCount(cards?.pendingBills)} label="Pending Bills" tone={colors.red} />
          </>,
        )}
        <SectionHeader title="Today's Summary" />
        {!loading && !error && !dashboard ? (
          <View style={local.stateCard}>
            <Text style={local.stateText}>No dashboard metrics available.</Text>
          </View>
        ) : null}
        {summaryRows.map(([title, subtitle, icon, tone]) => (
          <ListRow
            key={title}
            title={title}
            subtitle={subtitle}
            icon={icon}
            tone={tone}
            onPress={() => title === 'Active Staff' ? navigation.getParent()?.navigate('ActiveStaff') : navigation.navigate('ModuleDetail', { title, role: 'Admin' })}
          />
        ))}
      </Content>
    </Screen>
  );
}

function ReceptionDashboard({ navigation }: any) {
  const [dashboard, setDashboard] = useState<ReceptionDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      setDashboard(await getReceptionDashboard());
    } catch (loadError: any) {
      console.error('[Reception Dashboard] Load error:', loadError.response?.data || loadError.message);
      setError(loadError.response?.data?.message || 'Unable to load reception dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const metrics = dashboard?.metrics;
  const waitingRoom = dashboard?.waitingRoom || [];

  return (
    <Screen>
      <Content>
        <Header title="Front Desk" subtitle="Manage operations" navigation={navigation} />
        {loading ? <ActivityIndicator color={colors.teal} /> : null}
        {error ? (
          <TouchableOpacity style={local.stateCard} onPress={loadDashboard}>
            <Text style={local.errorText}>{error}</Text>
            <Text style={local.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        ) : null}
        {grid(
          <>
            <StatCard icon="calendar-outline" value={`${metrics?.todaysAppointments ?? 0}`} label="Today's Appts" tone={colors.blue} />
            <StatCard icon="time-outline" value={`${metrics?.waitingPatients ?? 0}`} label="Waiting" tone={colors.orange} />
            <StatCard icon="checkmark-circle-outline" value={`${metrics?.checkedInPatients ?? 0}`} label="Checked In" tone={colors.teal} />
            <StatCard icon="receipt-outline" value={`${metrics?.pendingBillingCount ?? 0}`} label="Pending Bills" tone={colors.red} />
          </>,
        )}
        <SectionHeader title="Quick Actions" />
        {grid(
          <>
            <ActionCard large icon="person-add-outline" title="Register" subtitle="New Patient" tone={colors.orange} onPress={() => navigation.getParent()?.navigate('ReceptionPatientForm')} />
            <ActionCard large icon="calendar-outline" title="Schedule" subtitle="Appointment" tone={colors.blue} onPress={() => navigation.getParent()?.navigate('ReceptionAppointmentForm')} />
            <ActionCard icon="cash-outline" title="Billing" tone={colors.teal} onPress={() => navigation.navigate('Billing')} />
            <ActionCard icon="document-text-outline" title="Patients" tone={colors.purple} onPress={() => navigation.getParent()?.navigate('Patients')} />
          </>,
        )}
        <SectionHeader title="Waiting Room" action={`${waitingRoom.length} Waiting`} onPress={() => navigation.getParent()?.navigate('ReceptionWaitingRoom')} />
        {!loading && !error && waitingRoom.length === 0 ? <Text style={local.stateText}>No patients currently waiting.</Text> : null}
        {waitingRoom.map((item) => (
          <ListRow
            key={item.id}
            title={item.patients?.name || 'Patient'}
            subtitle={item.doctors?.name || 'Doctor'}
            meta={new Date(item.appointment_date).toLocaleString()}
            status={`#${item.queuePosition || '-'}`}
            tone={item.status === 'In Consultation' ? colors.green : colors.orange}
            icon="time-outline"
            onPress={() => navigation.getParent()?.navigate('ReceptionAppointmentDetail', { appointment: item })}
          />
        ))}
      </Content>
    </Screen>
  );
}

function PharmacyDashboard({ navigation }: any) {
  const [items, setItems] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setItems(await getMedicines());
    } catch (loadError: any) {
      console.error('[Pharmacy Dashboard] Load error:', loadError.response?.data || loadError.message);
      setError(loadError.response?.data?.message || 'Unable to load pharmacy inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const lowStock = items.filter((item) => Number(item.quantity || 0) <= 10);
  const expiring = items.filter((item) => item.expiry_date && item.expiry_date <= today);

  return (
    <Screen>
      <Content>
        <Header title="Pharmacy" subtitle="Inventory & Dispensing" navigation={navigation} />
        {loading ? <ActivityIndicator color={colors.teal} /> : null}
        {error ? (
          <TouchableOpacity style={local.stateCard} onPress={load}>
            <Text style={local.errorText}>{error}</Text>
            <Text style={local.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        ) : null}
        {grid(
          <>
            <StatCard icon="cube-outline" value={`${items.length}`} label="Medicines" tone={colors.blue} />
            <StatCard icon="warning-outline" value={`${lowStock.length}`} label="Low Stock" tone={colors.red} />
            <StatCard icon="calendar-outline" value={`${expiring.length}`} label="Expiring" tone={colors.orange} />
          </>,
        )}
        <SectionHeader title="Low Stock Alerts" action="View All" onPress={() => navigation.navigate('Alerts')} />
        {!loading && !error && lowStock.length === 0 ? <Text style={local.stateText}>No low-stock medicines found.</Text> : null}
        {lowStock.slice(0, 4).map((item) => (
          <ListRow key={item.id} title={item.name} subtitle={`Quantity: ${item.quantity}`} meta={item.expiry_date ? `Expires ${item.expiry_date}` : 'No expiry date'} status="Low" tone={colors.red} icon="warning-outline" onPress={() => navigation.navigate('Inventory')} />
        ))}
      </Content>
    </Screen>
  );
}

function DoctorDashboard({ navigation, name }: any) {
  const [dashboard, setDashboard] = useState<DoctorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      setDashboard(await getDoctorDashboard());
    } catch (loadError: any) {
      console.error('[Doctor Dashboard] Load error:', loadError.response?.data || loadError.message);
      setError(loadError.response?.data?.message || 'Unable to load doctor dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const metrics = dashboard?.metrics;
  const doctor = dashboard?.doctor;
  return (
    <Screen>
      <Content>
        <Header title={doctor?.name || name || 'Doctor'} subtitle={doctor?.specialization || 'Clinical workspace'} navigation={navigation} avatar={(doctor?.name || name || 'DR').slice(0, 2).toUpperCase()} />
        {loading ? <ActivityIndicator color={colors.teal} /> : null}
        {error ? (
          <TouchableOpacity activeOpacity={0.82} style={local.stateCard} onPress={loadDashboard}>
            <Text style={local.errorText}>{error}</Text>
            <Text style={local.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        ) : null}
        {grid(
          <>
            <StatCard icon="calendar-outline" value={`${metrics?.todaysAppointments ?? '-'}`} label="Today's Appts" tone={colors.blue} />
            <StatCard icon="time-outline" value={`${metrics?.pendingConsultations ?? '-'}`} label="Pending" tone={colors.orange} />
            <StatCard icon="people-outline" value={`${metrics?.patientQueue ?? '-'}`} label="Queue" tone={colors.teal} />
            <StatCard icon="flask-outline" value={`${metrics?.labRequests ?? '-'}`} label="Lab Requests" tone={colors.red} />
          </>,
        )}
        <SectionHeader title="Today's Schedule" action="View All" onPress={() => navigation.navigate('Schedule')} />
        {!loading && !error && dashboard?.upcomingAppointments.length === 0 ? <Text style={local.stateText}>No appointments scheduled.</Text> : null}
        {(dashboard?.upcomingAppointments || []).map((item) => (
          <ListRow
            key={item.id}
            title={item.patients?.name || 'Patient'}
            subtitle={item.status}
            meta={new Date(item.appointment_date).toLocaleString()}
            icon="time-outline"
            tone={item.status === 'Completed' ? colors.green : colors.blue}
            onPress={() => navigation.getParent()?.navigate('DoctorAppointmentDetail', { id: item.id })}
          />
        ))}
        <ListRow title="Completed Today" subtitle={`${metrics?.completedToday ?? '-'} consultations completed`} icon="checkmark-done-outline" tone={colors.green} />
        <ListRow title="Lab Requests" subtitle="Create or review lab requests" icon="flask-outline" tone={colors.red} onPress={() => navigation.getParent()?.navigate('DoctorLabTests')} />
      </Content>
    </Screen>
  );
}

function PatientDashboard({ navigation, name }: any) {
  const [dashboard, setDashboard] = useState<PatientDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      setDashboard(await getPatientDashboard());
    } catch (loadError: any) {
      console.error('[Patient Dashboard] Load error:', loadError.response?.data || loadError.message);
      setError(loadError.response?.data?.message || 'Unable to load patient dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const upcoming = dashboard?.upcomingAppointment;
  const patient = dashboard?.patient;
  const latestLab = dashboard?.latestLabResult;
  const recentAppointments = dashboard?.recentActivity?.appointments || [];
  const recentLabs = dashboard?.recentActivity?.labResults || [];

  return (
    <Screen>
      <Content>
        <Header title={patient?.name || name || 'Patient'} subtitle="Good Morning," navigation={navigation} />
        {loading ? <ActivityIndicator color={colors.teal} /> : null}
        {error ? (
          <TouchableOpacity style={local.stateCard} onPress={loadDashboard}>
            <Text style={local.errorText}>{error}</Text>
            <Text style={local.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        ) : null}
        <SectionHeader title="Upcoming Appointment" />
        {upcoming ? (
          <View style={local.appointmentHero}>
            <View style={local.heroIcon}>
              <Ionicons name="medical-outline" size={26} color="#ffffff" />
            </View>
            <Text style={local.heroTitle}>{upcoming.doctors?.name || 'Doctor'}</Text>
            <Text style={local.heroSub}>{upcoming.doctors?.specialization || upcoming.status}</Text>
            <View style={local.heroTime}>
              <Ionicons name="calendar-outline" size={17} color="#ffffff" />
              <Text style={local.heroTimeText}>{new Date(upcoming.appointment_date).toLocaleString()}</Text>
            </View>
          </View>
        ) : !loading && !error ? (
          <View style={local.stateCard}>
            <Text style={local.stateText}>No upcoming appointment found.</Text>
          </View>
        ) : null}
        {grid(
          <>
            <StatCard icon="calendar-outline" value={`${dashboard?.appointmentCount ?? 0}`} label="Appointments" tone={colors.blue} />
            <StatCard icon="flask-outline" value={latestLab?.status || 'None'} label="Latest Lab" tone={colors.red} />
          </>,
        )}
        <SectionHeader title="Quick Actions" />
        {grid(
          <>
            <ActionCard icon="calendar-outline" title="Book Appt" tone={colors.blue} onPress={() => navigation.getParent()?.navigate('PatientBookAppointment')} />
            <ActionCard icon="document-text-outline" title="Records" tone={colors.purple} onPress={() => navigation.navigate('Records')} />
            <ActionCard icon="flask-outline" title="Lab Results" tone={colors.red} onPress={() => navigation.getParent()?.navigate('PatientLabResults')} />
            <ActionCard icon="medical-outline" title="My Doctors" tone={colors.teal} onPress={() => navigation.navigate('Appointments')} />
          </>,
        )}
        <SectionHeader title="Health Summary" />
        <ListRow title="Blood Type" subtitle={dashboard?.healthSummary?.bloodType || 'Not recorded'} icon="water-outline" tone={colors.red} />
        <ListRow title="Allergies" subtitle={dashboard?.healthSummary?.allergies || 'None recorded'} icon="alert-circle-outline" tone={colors.orange} />
        <ListRow title="Emergency Contact" subtitle={dashboard?.healthSummary?.emergencyContact || 'Not recorded'} icon="call-outline" tone={colors.green} />
        <SectionHeader title="Recent Activity" action="See All" onPress={() => navigation.navigate('Records')} />
        {!loading && !error && recentAppointments.length === 0 && recentLabs.length === 0 ? <Text style={local.stateText}>No recent activity yet.</Text> : null}
        {recentAppointments.slice(0, 2).map((item) => (
          <ListRow key={item.id} title={item.doctors?.name || 'Appointment'} subtitle={item.status} meta={new Date(item.appointment_date).toLocaleString()} icon="calendar-outline" tone={colors.blue} onPress={() => navigation.getParent()?.navigate('PatientAppointmentDetail', { appointment: item })} />
        ))}
        {recentLabs.slice(0, 1).map((item) => (
          <ListRow key={item.id} title={item.test_name} subtitle={item.status} meta={item.result || new Date(item.created_at).toLocaleString()} icon="flask-outline" tone={item.status === 'Completed' ? colors.green : colors.red} onPress={() => navigation.getParent()?.navigate('PatientLabResults')} />
        ))}
      </Content>
    </Screen>
  );
}

function LabDashboard({ navigation }: any) {
  const [filter, setFilter] = useState('Pending');
  const [items, setItems] = useState<LabTestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setItems(await getLabTests());
    } catch (loadError: any) {
      console.error('[Lab Dashboard] Load error:', loadError.response?.data || loadError.message);
      setError(loadError.response?.data?.message || 'Unable to load laboratory tests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => items.filter((test) => (filter === 'Pending' ? test.status !== 'Completed' : test.status === filter)), [filter, items]);
  const pending = items.filter((item) => item.status === 'Pending').length;
  const processing = items.filter((item) => item.status === 'Processing').length;
  const completed = items.filter((item) => item.status === 'Completed').length;

  return (
    <Screen>
      <Content>
        <Header title="Laboratory" subtitle="Diagnostic Center" navigation={navigation} />
        {loading ? <ActivityIndicator color={colors.teal} /> : null}
        {error ? (
          <TouchableOpacity style={local.stateCard} onPress={load}>
            <Text style={local.errorText}>{error}</Text>
            <Text style={local.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        ) : null}
        {grid(
          <>
            <StatCard icon="clipboard-outline" value={`${pending}`} label="PENDING" tone={colors.red} />
            <StatCard icon="flask-outline" value={`${processing}`} label="PROCESSING" tone={colors.blue} />
            <StatCard icon="document-attach-outline" value={`${completed}`} label="COMPLETED" tone={colors.green} />
          </>,
        )}
        <SectionHeader title="Test Queue" />
        <View style={local.segment}>
          {['Pending', 'Processing', 'Completed'].map((item) => (
            <TouchableOpacity key={item} style={[local.segmentItem, filter === item && local.segmentActive]} onPress={() => setFilter(item)}>
              <Text style={[local.segmentText, filter === item && local.segmentActiveText]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {!loading && !error && filtered.length === 0 ? <Text style={local.stateText}>No lab tests found.</Text> : null}
        {filtered.map((item, index) => (
          <ListRow
            key={item.id}
            title={item.test_name}
            subtitle={`Patient: ${item.patients?.name || 'Unassigned'}`}
            meta={`Requested by ${item.doctors?.name || 'Clinic'}`}
            status={item.status}
            tone={item.status === 'Completed' ? colors.green : item.status === 'Processing' ? colors.red : colors.blue}
            icon="flask-outline"
            onPress={() => navigation.navigate('Tests')}
          />
        ))}
      </Content>
    </Screen>
  );
}

// Tab dispatcher for resource screens whose implementation depends on the current role and selected tab name.
export function RoleListScreen({ navigation, route }: any) {
  const role = getRole(route);
  const title = route.name;
  if (role === 'Admin' && title === 'Patients') return <PatientDirectoryScreen navigation={navigation} title="Patients" subtitle="Admin patient directory" role="Admin" />;
  if (role === 'Doctor' && title === 'Schedule') return <DoctorAppointmentsScreen navigation={navigation} />;
  if (role === 'Doctor' && title === 'Patients') return <DoctorPatientsScreen navigation={navigation} />;
  if (role === 'Patient' && title === 'Appointments') return <PatientAppointmentsScreen navigation={navigation} />;
  if (role === 'Patient' && title === 'Records') return <PatientRecordsScreen navigation={navigation} />;
  if (role === 'Receptionist' && title === 'Patients') return <PatientDirectoryScreen navigation={navigation} title="Patients" subtitle="Front desk patient directory" role="Receptionist" />;
  if (role === 'Receptionist' && title === 'Appointments') return <ReceptionAppointmentsScreen navigation={navigation} />;
  if (role === 'Receptionist' && title === 'Billing') return <ReceptionBillingScreen navigation={navigation} />;
  if (role === 'Pharmacist' && (title === 'Inventory' || title === 'Medicines' || title === 'Alerts')) return <PharmacyInventoryScreen navigation={navigation} mode={title} />;
  if (role === 'Laboratory Staff' && (title === 'Tests' || title === 'Results')) return <LaboratoryTestsScreen navigation={navigation} mode={title} />;
  let rows = patients.map((item) => ({ title: item.name, subtitle: item.meta, meta: item.detail, status: item.status, tone: colors.teal, icon: 'person-outline' }));
  if (title === 'Appointments' || title === 'Schedule') rows = appointments.map((item) => ({ title: item.title, subtitle: item.subtitle, meta: item.time, status: item.status, tone: colors.blue, icon: 'calendar-outline' }));
  if (title === 'Records' || title === 'Results') rows = labTests.map((item) => ({ title: item.name, subtitle: item.patient, meta: item.requester, status: item.status, tone: colors.red, icon: 'document-text-outline' }));
  if (title === 'Billing') rows = invoices.map((item) => ({ title: item.name, subtitle: item.meta, meta: item.amount, status: item.status, tone: colors.orange, icon: 'card-outline' }));
  if (title === 'Inventory' || title === 'Medicines') rows = medicines.map((item) => ({ title: item.name, subtitle: item.meta, meta: item.stock, status: item.status, tone: item.status === 'Low' ? colors.red : colors.green, icon: 'medkit-outline' }));
  if (title === 'Alerts') rows = notifications.map((item) => ({ title: item.title, subtitle: item.body, meta: item.time, status: '', tone: item.tone === 'red' ? colors.red : item.tone === 'green' ? colors.green : item.tone === 'orange' ? colors.orange : colors.blue, icon: 'notifications-outline' }));
  if (title === 'Tests') rows = labTests.map((item) => ({ title: item.name, subtitle: item.patient, meta: item.time, status: item.status, tone: colors.blue, icon: 'flask-outline' }));

  return (
    <Screen>
      <Content>
        <Header title={title} subtitle={roleProfiles[role].department} navigation={navigation} />
        <SearchBar placeholder={`Search ${title.toLowerCase()}...`} />
        {rows.map((row) => (
          <ListRow key={`${row.title}-${row.meta}`} {...row} onPress={() => navigation.navigate('ModuleDetail', { title: row.title })} />
        ))}
      </Content>
    </Screen>
  );
}

export function PharmacyInventoryScreen({ navigation, mode }: any) {
  const [items, setItems] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setItems(await getMedicines(mode === 'Alerts' ? { low_stock: true } : undefined));
    } catch (loadError: any) {
      console.error('[Pharmacy Inventory] Load error:', loadError.response?.data || loadError.message);
      setError(loadError.response?.data?.message || 'Unable to load inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [mode]);

  return (
    <Screen>
      <Content>
        <Header title={mode} subtitle="Pharmacy inventory" navigation={navigation} />
        {loading ? <ActivityIndicator color={colors.teal} /> : null}
        {error ? (
          <TouchableOpacity style={local.stateCard} onPress={load}>
            <Text style={local.errorText}>{error}</Text>
            <Text style={local.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        ) : null}
        {!loading && !error && items.length === 0 ? <Text style={local.stateText}>No medicines found.</Text> : null}
        {items.map((item) => {
          const low = Number(item.quantity || 0) <= 10;
          return (
            <ListRow
              key={item.id}
              title={item.name}
              subtitle={`Quantity: ${item.quantity}`}
              meta={item.expiry_date ? `Expires ${item.expiry_date}` : item.price ? `Price: ${item.price}` : 'No extra details'}
              status={low ? 'Low' : 'In Stock'}
              icon={low ? 'warning-outline' : 'medkit-outline'}
              tone={low ? colors.red : colors.green}
            />
          );
        })}
      </Content>
    </Screen>
  );
}

export function LaboratoryTestsScreen({ navigation, mode }: any) {
  const [items, setItems] = useState<LabTestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setItems(await getLabTests(mode === 'Results' ? { status: 'Completed' } : undefined));
    } catch (loadError: any) {
      console.error('[Laboratory Tests] Load error:', loadError.response?.data || loadError.message);
      setError(loadError.response?.data?.message || 'Unable to load lab tests.');
    } finally {
      setLoading(false);
    }
  };

  const markProcessing = async (item: LabTestRecord) => {
    try {
      await updateLabTest(item.id, { status: item.status === 'Pending' ? 'Processing' : item.status });
      await load();
    } catch (updateError: any) {
      console.error('[Laboratory Tests] Update error:', updateError.response?.data || updateError.message);
      setError(updateError.response?.data?.message || 'Unable to update lab test.');
    }
  };

  useEffect(() => {
    load();
  }, [mode]);

  return (
    <Screen>
      <Content>
        <Header title={mode} subtitle="Laboratory workflow" navigation={navigation} />
        {loading ? <ActivityIndicator color={colors.teal} /> : null}
        {error ? (
          <TouchableOpacity style={local.stateCard} onPress={load}>
            <Text style={local.errorText}>{error}</Text>
            <Text style={local.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        ) : null}
        {!loading && !error && items.length === 0 ? <Text style={local.stateText}>No lab tests found.</Text> : null}
        {items.map((item) => (
          <ListRow
            key={item.id}
            title={item.test_name}
            subtitle={`${item.patients?.name || 'Unassigned'} - ${item.status}`}
            meta={item.result || item.doctors?.name || new Date(item.created_at).toLocaleString()}
            status={item.status}
            icon="flask-outline"
            tone={item.status === 'Completed' ? colors.green : item.status === 'Cancelled' ? colors.red : colors.blue}
            onPress={() => markProcessing(item)}
          />
        ))}
      </Content>
    </Screen>
  );
}

const patientFormDefaults = {
  name: '',
  email: '',
  phone: '',
  gender: '',
  date_of_birth: '',
  blood_type: '',
  address: '',
  emergency_contact: '',
  insurance_provider: '',
};
const patientGenderOptions = ['Male', 'Female', 'Other', 'Unspecified'];
const patientBloodTypeOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const optionalPatientValue = (value: unknown) => {
  const text = String(value ?? '').trim();
  return text ? text : null;
};

const isValidPatientDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const [, year, month, day] = match;
  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return (
    parsedDate.getUTCFullYear() === Number(year) &&
    parsedDate.getUTCMonth() + 1 === Number(month) &&
    parsedDate.getUTCDate() === Number(day)
  );
};

const validatePatientForm = (form: Record<string, any>) => {
  const name = String(form.name || '').trim();
  const email = optionalPatientValue(form.email);
  const gender = optionalPatientValue(form.gender);
  const dateOfBirth = optionalPatientValue(form.date_of_birth);
  const bloodType = optionalPatientValue(form.blood_type);

  if (!name) return 'Full name is required.';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
  if (gender && !patientGenderOptions.includes(gender)) return `Gender must be one of: ${patientGenderOptions.join(', ')}.`;
  if (dateOfBirth) {
    if (!isValidPatientDate(dateOfBirth)) return 'Date of birth must use YYYY-MM-DD format.';
    const parsedDate = new Date(`${dateOfBirth}T00:00:00`);
    if (parsedDate > new Date()) return 'Date of birth cannot be in the future.';
  }
  if (bloodType && !patientBloodTypeOptions.includes(bloodType)) return `Blood type must be one of: ${patientBloodTypeOptions.join(', ')}.`;

  return '';
};

const buildPatientPayload = (form: Record<string, any>): PatientRegistrationPayload => ({
  name: String(form.name || '').trim(),
  email: optionalPatientValue(form.email),
  phone: optionalPatientValue(form.phone),
  gender: optionalPatientValue(form.gender) as PatientRegistrationPayload['gender'],
  date_of_birth: optionalPatientValue(form.date_of_birth),
  blood_type: optionalPatientValue(form.blood_type) as PatientRegistrationPayload['blood_type'],
  address: optionalPatientValue(form.address),
  emergency_contact: optionalPatientValue(form.emergency_contact),
  insurance_provider: optionalPatientValue(form.insurance_provider),
});

// ── Reception workflow: patient registration, scheduling, queue visibility, invoices, and payments. ──
export function ReceptionPatientsScreen({ navigation }: any) {
  return <PatientDirectoryScreen navigation={navigation} title="Patients" subtitle="Registration and search" role="Receptionist" />;
}

export function ReceptionPatientFormScreen({ navigation, route }: any) {
  const patient = route.params?.patient;
  const [form, setForm] = useState<Record<string, any>>({ ...patientFormDefaults, ...(patient || {}) });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const updateField = (field: keyof typeof patientFormDefaults, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const save = async () => {
    const validationMessage = validatePatientForm(form);
    if (validationMessage) {
      setIsError(true);
      setMessage(validationMessage);
      return;
    }

    try {
      setSaving(true);
      setMessage('');
      const payload = buildPatientPayload(form);
      const saved = patient?.id ? await updatePatientRecord(patient.id, payload) : await createPatientRecord(payload);
      setForm({ ...patientFormDefaults, ...saved });
      setIsError(false);
      setMessage(patient?.id ? 'Patient updated.' : 'Patient registered.');
    } catch (saveError: any) {
      console.error('[Reception Patient Form] Save error:', saveError.response?.data || saveError.message);
      setIsError(true);
      setMessage(saveError.response?.data?.message || 'Unable to save patient.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Content>
        <Header title={patient?.id ? 'Edit Patient' : 'Register Patient'} subtitle="Patient information" navigation={navigation} />
        <View style={local.formCard}>
          <TextInput placeholder="Full name" placeholderTextColor="#8b97a8" value={form.name} onChangeText={(value) => updateField('name', value)} style={local.input} />
          <TextInput placeholder="Email" placeholderTextColor="#8b97a8" value={form.email || ''} onChangeText={(value) => updateField('email', value)} style={local.input} autoCapitalize="none" />
          <TextInput placeholder="Phone" placeholderTextColor="#8b97a8" value={form.phone || ''} onChangeText={(value) => updateField('phone', value)} style={local.input} />
          <TextInput placeholder="Gender" placeholderTextColor="#8b97a8" value={form.gender || ''} onChangeText={(value) => updateField('gender', value)} style={local.input} />
          <TextInput placeholder="Date of birth" placeholderTextColor="#8b97a8" value={form.date_of_birth || ''} onChangeText={(value) => updateField('date_of_birth', value)} style={local.input} />
          <TextInput placeholder="Blood group" placeholderTextColor="#8b97a8" value={form.blood_type || ''} onChangeText={(value) => updateField('blood_type', value)} style={local.input} />
          <TextInput placeholder="Address" placeholderTextColor="#8b97a8" value={form.address || ''} onChangeText={(value) => updateField('address', value)} style={[local.input, local.textArea]} multiline />
          <TextInput placeholder="Emergency contact" placeholderTextColor="#8b97a8" value={form.emergency_contact || ''} onChangeText={(value) => updateField('emergency_contact', value)} style={local.input} />
          <TextInput placeholder="Insurance provider" placeholderTextColor="#8b97a8" value={form.insurance_provider || ''} onChangeText={(value) => updateField('insurance_provider', value)} style={local.input} />
          {message ? <Text style={isError ? local.errorText : local.successText}>{message}</Text> : null}
          <TouchableOpacity disabled={saving || !String(form.name || '').trim()} style={local.secondaryButton} onPress={save}>
            <Text style={local.secondaryButtonText}>{saving ? 'Saving...' : 'Save Patient'}</Text>
          </TouchableOpacity>
        </View>
      </Content>
    </Screen>
  );
}

export function ReceptionAppointmentsScreen({ navigation }: any) {
  const [items, setItems] = useState<ReceptionAppointment[]>([]);
  const [view, setView] = useState<'today' | 'upcoming'>('today');
  const [status, setStatus] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setItems(await getReceptionAppointments({ view, status: status === 'All' ? undefined : status }));
    } catch (loadError: any) {
      console.error('[Reception Appointments] Load error:', loadError.response?.data || loadError.message);
      setError(loadError.response?.data?.message || 'Unable to load appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [view, status]);

  return (
    <Screen>
      <Content>
        <Header title="Appointments" subtitle="Front desk schedule" navigation={navigation} />
        <TouchableOpacity style={local.secondaryButton} onPress={() => navigation.getParent()?.navigate('ReceptionAppointmentForm')}>
          <Text style={local.secondaryButtonText}>Book Appointment</Text>
        </TouchableOpacity>
        <View style={local.chipRow}>
          {['today', 'upcoming'].map((item) => (
            <TouchableOpacity key={item} style={[local.chip, view === item && local.chipActive]} onPress={() => setView(item as any)}>
              <Text style={[local.chipText, view === item && local.chipTextActive]}>{item === 'today' ? 'Today' : 'Upcoming'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={local.chipRow}>
          {['All', ...appointmentStatuses].map((item) => (
            <TouchableOpacity key={item} style={[local.chip, status === item && local.chipActive]} onPress={() => setStatus(item)}>
              <Text style={[local.chipText, status === item && local.chipTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {loading ? <ActivityIndicator color={colors.teal} /> : null}
        {error ? (
          <TouchableOpacity style={local.stateCard} onPress={load}>
            <Text style={local.errorText}>{error}</Text>
            <Text style={local.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        ) : null}
        {!loading && !error && items.length === 0 ? <Text style={local.stateText}>No appointments found.</Text> : null}
        {items.map((item) => (
          <ListRow
            key={item.id}
            title={item.patients?.name || 'Patient'}
            subtitle={`${item.doctors?.name || 'Doctor'} - ${item.status}`}
            meta={new Date(item.appointment_date).toLocaleString()}
            status={item.status}
            icon="calendar-outline"
            tone={item.status === 'Cancelled' ? colors.red : item.status === 'Checked In' ? colors.orange : colors.blue}
            onPress={() => navigation.getParent()?.navigate('ReceptionAppointmentDetail', { appointment: item })}
          />
        ))}
      </Content>
    </Screen>
  );
}

export function ReceptionAppointmentFormScreen({ navigation, route }: any) {
  const appointment = route.params?.appointment;
  const [patientsList, setPatientsList] = useState<ReceptionPatient[]>([]);
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [patientId, setPatientId] = useState(appointment?.patient_id || '');
  const [doctorId, setDoctorId] = useState(appointment?.doctor_id || '');
  const [appointmentDate, setAppointmentDate] = useState(appointment?.appointment_date || '');
  const [notes, setNotes] = useState(appointment?.notes || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const loadOptions = async () => {
    try {
      setLoading(true);
      const [patientOptions, doctorOptions] = await Promise.all([getReceptionPatients(), getDoctorsForBooking()]);
      setPatientsList(patientOptions);
      setDoctorsList(doctorOptions);
      if (!patientId && patientOptions[0]) setPatientId(patientOptions[0].id);
      if (!doctorId && doctorOptions[0]) setDoctorId(doctorOptions[0].id);
    } catch (loadError: any) {
      console.error('[Reception Appointment Form] Load error:', loadError.response?.data || loadError.message);
      setIsError(true);
      setMessage(loadError.response?.data?.message || 'Unable to load booking options.');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    try {
      setSaving(true);
      setMessage('');
      const payload = { patient_id: patientId, doctor_id: doctorId, appointment_date: appointmentDate, notes };
      await (appointment?.id ? updateReceptionAppointment(appointment.id, payload) : createReceptionAppointment(payload));
      setIsError(false);
      setMessage(appointment?.id ? 'Appointment updated.' : 'Appointment booked.');
    } catch (saveError: any) {
      console.error('[Reception Appointment Form] Save error:', saveError.response?.data || saveError.message);
      setIsError(true);
      setMessage(saveError.response?.data?.message || 'Unable to save appointment.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  return (
    <Screen>
      <Content>
        <Header title={appointment?.id ? 'Edit Appointment' : 'Book Appointment'} subtitle="Patient, doctor, and slot" navigation={navigation} />
        {loading ? <ActivityIndicator color={colors.teal} /> : null}
        <SectionHeader title="Patient" />
        <View style={local.chipRow}>
          {patientsList.slice(0, 20).map((patient) => (
            <TouchableOpacity key={patient.id} style={[local.chip, patientId === patient.id && local.chipActive]} onPress={() => setPatientId(patient.id)}>
              <Text style={[local.chipText, patientId === patient.id && local.chipTextActive]}>{patient.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <SectionHeader title="Doctor" />
        <View style={local.chipRow}>
          {doctorsList.map((doctor) => (
            <TouchableOpacity key={doctor.id} style={[local.chip, doctorId === doctor.id && local.chipActive]} onPress={() => setDoctorId(doctor.id)}>
              <Text style={[local.chipText, doctorId === doctor.id && local.chipTextActive]}>{doctor.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={local.formCard}>
          <TextInput value={appointmentDate} onChangeText={setAppointmentDate} placeholder="Appointment date, e.g. 2026-06-20T10:00:00+03:00" placeholderTextColor="#8b97a8" style={local.input} />
          <TextInput value={notes} onChangeText={setNotes} placeholder="Appointment notes" placeholderTextColor="#8b97a8" style={[local.input, local.textArea]} multiline />
          {message ? <Text style={isError ? local.errorText : local.successText}>{message}</Text> : null}
          <TouchableOpacity disabled={saving || !patientId || !doctorId || !appointmentDate} style={local.secondaryButton} onPress={save}>
            <Text style={local.secondaryButtonText}>{saving ? 'Saving...' : 'Save Appointment'}</Text>
          </TouchableOpacity>
        </View>
      </Content>
    </Screen>
  );
}

export function ReceptionAppointmentDetailScreen({ navigation, route }: any) {
  const [appointment, setAppointment] = useState<ReceptionAppointment | null>(route.params?.appointment || null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const run = async (action: 'checkIn' | 'cancel') => {
    if (!appointment) return;
    try {
      setSaving(true);
      setMessage('');
      const updated = action === 'checkIn' ? await checkInReceptionAppointment(appointment.id) : await cancelReceptionAppointment(appointment.id);
      setAppointment(updated);
      setIsError(false);
      setMessage(action === 'checkIn' ? 'Patient checked in.' : 'Appointment cancelled.');
    } catch (error: any) {
      console.error('[Reception Appointment Detail] Action error:', error.response?.data || error.message);
      setIsError(true);
      setMessage(error.response?.data?.message || 'Unable to update appointment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Content>
        <Header title="Appointment" subtitle={appointment?.patients?.name || 'Details'} navigation={navigation} />
        {appointment ? (
          <>
            <ListRow title={appointment.patients?.name || 'Patient'} subtitle={appointment.doctors?.name || 'Doctor'} meta={new Date(appointment.appointment_date).toLocaleString()} status={appointment.status} icon="calendar-outline" tone={colors.blue} />
            <ListRow title="Queue Position" subtitle={appointment.queuePosition ? `#${appointment.queuePosition}` : 'Not checked in'} icon="time-outline" tone={colors.orange} />
            {message ? <Text style={isError ? local.errorText : local.successText}>{message}</Text> : null}
            <TouchableOpacity disabled={saving || appointment.status === 'Checked In'} style={local.secondaryButton} onPress={() => run('checkIn')}>
              <Text style={local.secondaryButtonText}>{saving ? 'Saving...' : 'Check In Patient'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={local.outlineButton} onPress={() => navigation.navigate('ReceptionAppointmentForm', { appointment })}>
              <Text style={local.outlineButtonText}>Edit / Reschedule</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={saving || appointment.status === 'Cancelled'} style={local.outlineButton} onPress={() => run('cancel')}>
              <Text style={local.outlineButtonText}>Cancel Appointment</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={local.stateText}>Appointment details are unavailable.</Text>
        )}
      </Content>
    </Screen>
  );
}

export function ReceptionWaitingRoomScreen({ navigation }: any) {
  const [items, setItems] = useState<ReceptionAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setItems(await getReceptionWaitingRoom());
    } catch (loadError: any) {
      console.error('[Reception Waiting Room] Load error:', loadError.response?.data || loadError.message);
      setError(loadError.response?.data?.message || 'Unable to load waiting room.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Screen>
      <Content>
        <Header title="Waiting Room" subtitle="Checked-in patients" navigation={navigation} />
        {loading ? <ActivityIndicator color={colors.teal} /> : null}
        {error ? (
          <TouchableOpacity style={local.stateCard} onPress={load}>
            <Text style={local.errorText}>{error}</Text>
            <Text style={local.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        ) : null}
        {!loading && !error && items.length === 0 ? <Text style={local.stateText}>No patients currently waiting.</Text> : null}
        {items.map((item) => (
          <ListRow key={item.id} title={item.patients?.name || 'Patient'} subtitle={`${item.doctors?.name || 'Doctor'} - ${item.status}`} meta={new Date(item.appointment_date).toLocaleString()} status={`#${item.queuePosition}`} icon="time-outline" tone={item.status === 'In Consultation' ? colors.green : colors.orange} onPress={() => navigation.navigate('ReceptionAppointmentDetail', { appointment: item })} />
        ))}
      </Content>
    </Screen>
  );
}

export function ReceptionBillingScreen({ navigation }: any) {
  const [items, setItems] = useState<ReceptionInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setItems(await getReceptionInvoices());
    } catch (loadError: any) {
      console.error('[Reception Billing] Load error:', loadError.response?.data || loadError.message);
      setError(loadError.response?.data?.message || 'Unable to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Screen>
      <Content>
        <Header title="Billing" subtitle="Invoices and payments" navigation={navigation} />
        <TouchableOpacity style={local.secondaryButton} onPress={() => navigation.getParent()?.navigate('ReceptionInvoiceForm')}>
          <Text style={local.secondaryButtonText}>Generate Invoice</Text>
        </TouchableOpacity>
        {loading ? <ActivityIndicator color={colors.teal} /> : null}
        {error ? (
          <TouchableOpacity style={local.stateCard} onPress={load}>
            <Text style={local.errorText}>{error}</Text>
            <Text style={local.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        ) : null}
        {!loading && !error && items.length === 0 ? <Text style={local.stateText}>No invoices found.</Text> : null}
        {items.map((item) => (
          <ListRow key={item.id} title={item.invoice_number} subtitle={item.patients?.name || 'Patient'} meta={`${item.total_amount} due ${item.due_date}`} status={item.status} icon="cash-outline" tone={item.status === 'Paid' ? colors.green : item.status === 'Refunded' ? colors.purple : colors.orange} onPress={() => navigation.getParent()?.navigate('ReceptionInvoicePayment', { invoice: item })} />
        ))}
      </Content>
    </Screen>
  );
}

export function ReceptionInvoiceFormScreen({ navigation }: any) {
  const [patientsList, setPatientsList] = useState<ReceptionPatient[]>([]);
  const [patientId, setPatientId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [itemName, setItemName] = useState('Consultation');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getReceptionPatients().then((list) => {
      setPatientsList(list);
      if (list[0]) setPatientId(list[0].id);
    }).catch((error) => {
      console.error('[Reception Invoice Form] Patients load error:', error.response?.data || error.message);
      setIsError(true);
      setMessage('Unable to load patients.');
    });
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      setMessage('');
      await createReceptionInvoice({
        patient_id: patientId,
        due_date: dueDate,
        items: [{ item_name: itemName || 'Service', quantity: 1, unit_price: Number(amount) || 0 }]
      });
      setIsError(false);
      setMessage('Invoice generated.');
    } catch (error: any) {
      console.error('[Reception Invoice Form] Save error:', error.response?.data || error.message);
      setIsError(true);
      setMessage(error.response?.data?.message || 'Unable to generate invoice.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Content>
        <Header title="Generate Invoice" subtitle="Billing details" navigation={navigation} />
        <SectionHeader title="Patient" />
        <View style={local.chipRow}>
          {patientsList.slice(0, 20).map((patient) => (
            <TouchableOpacity key={patient.id} style={[local.chip, patientId === patient.id && local.chipActive]} onPress={() => setPatientId(patient.id)}>
              <Text style={[local.chipText, patientId === patient.id && local.chipTextActive]}>{patient.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={local.formCard}>
          <TextInput placeholder="Due date, e.g. 2026-06-30" placeholderTextColor="#8b97a8" value={dueDate} onChangeText={setDueDate} style={local.input} />
          <TextInput placeholder="Item name" placeholderTextColor="#8b97a8" value={itemName} onChangeText={setItemName} style={local.input} />
          <TextInput placeholder="Amount" placeholderTextColor="#8b97a8" value={amount} onChangeText={setAmount} style={local.input} keyboardType="numeric" />
          {message ? <Text style={isError ? local.errorText : local.successText}>{message}</Text> : null}
          <TouchableOpacity disabled={saving || !patientId || !dueDate} style={local.secondaryButton} onPress={save}>
            <Text style={local.secondaryButtonText}>{saving ? 'Saving...' : 'Create Invoice'}</Text>
          </TouchableOpacity>
        </View>
      </Content>
    </Screen>
  );
}

export function ReceptionInvoicePaymentScreen({ navigation, route }: any) {
  const invoice = route.params?.invoice as ReceptionInvoice | undefined;
  const [amount, setAmount] = useState(invoice?.total_amount ? String(invoice.total_amount) : '');
  const [method, setMethod] = useState('Cash');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!invoice) return;
    try {
      setSaving(true);
      setMessage('');
      await recordReceptionPayment(invoice.id, { amount, payment_method: method });
      setIsError(false);
      setMessage('Payment recorded.');
    } catch (error: any) {
      console.error('[Reception Payment] Save error:', error.response?.data || error.message);
      setIsError(true);
      setMessage(error.response?.data?.message || 'Unable to record payment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Content>
        <Header title="Record Payment" subtitle={invoice?.invoice_number || 'Invoice'} navigation={navigation} />
        {invoice ? (
          <>
            <ListRow title={invoice.patients?.name || 'Patient'} subtitle={invoice.status} meta={`${invoice.total_amount} due ${invoice.due_date}`} icon="cash-outline" tone={colors.orange} />
            <View style={local.chipRow}>
              {['Cash', 'Card', 'Insurance', 'Bank Transfer'].map((item) => (
                <TouchableOpacity key={item} style={[local.chip, method === item && local.chipActive]} onPress={() => setMethod(item)}>
                  <Text style={[local.chipText, method === item && local.chipTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={local.formCard}>
              <TextInput placeholder="Payment amount" placeholderTextColor="#8b97a8" value={amount} onChangeText={setAmount} style={local.input} keyboardType="numeric" />
              {message ? <Text style={isError ? local.errorText : local.successText}>{message}</Text> : null}
              <TouchableOpacity disabled={saving || !amount} style={local.secondaryButton} onPress={save}>
                <Text style={local.secondaryButtonText}>{saving ? 'Saving...' : 'Record Payment'}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <Text style={local.stateText}>Invoice details are unavailable.</Text>
        )}
      </Content>
    </Screen>
  );
}

// ── Patient workflow: appointments, booking, records, laboratory results, and self-service profile data. ──
export function PatientAppointmentsScreen({ navigation }: any) {
  const [items, setItems] = useState<PatientAppointment[]>([]);
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming');
  const [status, setStatus] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setItems(await getPatientAppointments({ view, status: status === 'All' ? undefined : status }));
    } catch (loadError: any) {
      console.error('[Patient Appointments] Load error:', loadError.response?.data || loadError.message);
      setError(loadError.response?.data?.message || 'Unable to load appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [view, status]);

  return (
    <Screen>
      <Content>
        <Header title="Appointments" subtitle="Your visits" navigation={navigation} />
        <TouchableOpacity style={local.secondaryButton} onPress={() => navigation.getParent()?.navigate('PatientBookAppointment')}>
          <Text style={local.secondaryButtonText}>Book Appointment</Text>
        </TouchableOpacity>
        <View style={local.chipRow}>
          {['upcoming', 'past'].map((item) => (
            <TouchableOpacity key={item} style={[local.chip, view === item && local.chipActive]} onPress={() => setView(item as any)}>
              <Text style={[local.chipText, view === item && local.chipTextActive]}>{item === 'upcoming' ? 'Upcoming' : 'Past'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={local.chipRow}>
          {['All', ...appointmentStatuses].map((item) => (
            <TouchableOpacity key={item} style={[local.chip, status === item && local.chipActive]} onPress={() => setStatus(item)}>
              <Text style={[local.chipText, status === item && local.chipTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {loading ? <ActivityIndicator color={colors.teal} /> : null}
        {error ? (
          <TouchableOpacity style={local.stateCard} onPress={load}>
            <Text style={local.errorText}>{error}</Text>
            <Text style={local.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        ) : null}
        {!loading && !error && items.length === 0 ? <Text style={local.stateText}>No appointments found.</Text> : null}
        {items.map((item) => (
          <ListRow
            key={item.id}
            title={item.doctors?.name || 'Doctor'}
            subtitle={item.doctors?.specialization || item.status}
            meta={new Date(item.appointment_date).toLocaleString()}
            status={item.status}
            tone={item.status === 'Completed' ? colors.green : item.status === 'Cancelled' ? colors.red : colors.blue}
            icon="calendar-outline"
            onPress={() => navigation.getParent()?.navigate('PatientAppointmentDetail', { appointment: item })}
          />
        ))}
      </Content>
    </Screen>
  );
}

export function PatientAppointmentDetailScreen({ navigation, route }: any) {
  const [appointment, setAppointment] = useState<PatientAppointment | null>(route.params?.appointment || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const cancel = async () => {
    if (!appointment) return;
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const updated = await cancelPatientAppointment(appointment.id);
      setAppointment(updated);
      setSuccess('Appointment cancelled.');
    } catch (cancelError: any) {
      console.error('[Patient Appointment] Cancel error:', cancelError.response?.data || cancelError.message);
      setError(cancelError.response?.data?.message || 'Unable to cancel appointment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Content>
        <Header title="Appointment" subtitle={appointment?.doctors?.name || 'Details'} navigation={navigation} />
        {appointment ? (
          <>
            <ListRow title={appointment.doctors?.name || 'Doctor'} subtitle={appointment.doctors?.specialization || 'Specialist'} meta={new Date(appointment.appointment_date).toLocaleString()} status={appointment.status} icon="medical-outline" tone={colors.blue} />
            <ListRow title="Patient Notes" subtitle={appointment.notes || 'No notes added'} icon="document-text-outline" tone={colors.purple} />
            <ListRow title="Doctor Notes" subtitle={appointment.doctor_notes || 'Not available yet'} icon="clipboard-outline" tone={colors.teal} />
            {error ? <Text style={local.errorText}>{error}</Text> : null}
            {success ? <Text style={local.successText}>{success}</Text> : null}
            {!['Completed', 'Cancelled', 'No Show'].includes(appointment.status) ? (
              <TouchableOpacity disabled={saving} style={local.outlineButton} onPress={cancel}>
                <Text style={local.outlineButtonText}>{saving ? 'Cancelling...' : 'Cancel Appointment'}</Text>
              </TouchableOpacity>
            ) : null}
          </>
        ) : (
          <Text style={local.stateText}>Appointment details are unavailable.</Text>
        )}
      </Content>
    </Screen>
  );
}

export function PatientBookAppointmentScreen({ navigation }: any) {
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [doctorId, setDoctorId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadDoctors = async () => {
    try {
      setLoading(true);
      setError('');
      const list = await getDoctorsForBooking();
      setDoctorsList(list);
      if (!doctorId && list[0]) setDoctorId(list[0].id);
    } catch (loadError: any) {
      console.error('[Patient Booking] Doctors load error:', loadError.response?.data || loadError.message);
      setError(loadError.response?.data?.message || 'Unable to load doctors.');
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await bookPatientAppointment({ doctor_id: doctorId, appointment_date: appointmentDate, notes });
      setSuccess('Appointment booked successfully.');
    } catch (saveError: any) {
      console.error('[Patient Booking] Save error:', saveError.response?.data || saveError.message);
      setError(saveError.response?.data?.message || 'Unable to book appointment.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  return (
    <Screen>
      <Content>
        <Header title="Book Appointment" subtitle="Select doctor and time" navigation={navigation} />
        {loading ? <ActivityIndicator color={colors.teal} /> : null}
        {error ? (
          <TouchableOpacity style={local.stateCard} onPress={loadDoctors}>
            <Text style={local.errorText}>{error}</Text>
            <Text style={local.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        ) : null}
        {!loading && doctorsList.length === 0 ? <Text style={local.stateText}>No doctors available for booking.</Text> : null}
        <SectionHeader title="Doctor" />
        <View style={local.chipRow}>
          {doctorsList.map((doctor) => (
            <TouchableOpacity key={doctor.id} style={[local.chip, doctorId === doctor.id && local.chipActive]} onPress={() => setDoctorId(doctor.id)}>
              <Text style={[local.chipText, doctorId === doctor.id && local.chipTextActive]}>{doctor.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={local.formCard}>
          <TextInput value={appointmentDate} onChangeText={setAppointmentDate} placeholder="Appointment date, e.g. 2026-06-20T10:00:00+03:00" placeholderTextColor="#8b97a8" style={local.input} />
          <TextInput value={notes} onChangeText={setNotes} placeholder="Notes for the clinic" placeholderTextColor="#8b97a8" style={[local.input, local.textArea]} multiline />
          {success ? <Text style={local.successText}>{success}</Text> : null}
          <TouchableOpacity disabled={saving || !doctorId || !appointmentDate} style={local.secondaryButton} onPress={submit}>
            <Text style={local.secondaryButtonText}>{saving ? 'Booking...' : 'Confirm Booking'}</Text>
          </TouchableOpacity>
        </View>
      </Content>
    </Screen>
  );
}

export function PatientRecordsScreen({ navigation }: any) {
  const [records, setRecords] = useState<PatientRecordsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setRecords(await getPatientRecords());
    } catch (loadError: any) {
      console.error('[Patient Records] Load error:', loadError.response?.data || loadError.message);
      setError(loadError.response?.data?.message || 'Unable to load medical records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const profile = records?.profile;

  return (
    <Screen>
      <Content>
        <Header title="Medical Records" subtitle="Your health history" navigation={navigation} />
        {loading ? <ActivityIndicator color={colors.teal} /> : null}
        {error ? (
          <TouchableOpacity style={local.stateCard} onPress={load}>
            <Text style={local.errorText}>{error}</Text>
            <Text style={local.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        ) : null}
        {profile ? (
          <>
            <SectionHeader title="Profile" />
            <ListRow title={profile.name || 'Patient'} subtitle={`${profile.gender || 'Unspecified'} - ${profile.blood_type || 'No blood type'}`} meta={profile.email || profile.phone || ''} icon="person-outline" tone={colors.teal} />
            <ListRow title="Allergies" subtitle={profile.allergies || 'None recorded'} icon="alert-circle-outline" tone={colors.orange} />
            <ListRow title="Medical Conditions" subtitle={profile.medical_conditions || 'None recorded'} icon="medical-outline" tone={colors.red} />
            <ListRow title="Emergency Contact" subtitle={profile.emergency_contact || 'Not recorded'} icon="call-outline" tone={colors.green} />
          </>
        ) : null}
        <SectionHeader title="Appointment History" />
        {!loading && !error && records?.appointmentHistory.length === 0 ? <Text style={local.stateText}>No appointment history found.</Text> : null}
        {records?.appointmentHistory.map((item) => (
          <ListRow key={item.id} title={item.doctors?.name || 'Doctor'} subtitle={item.doctor_notes || item.status} meta={new Date(item.appointment_date).toLocaleString()} status={item.status} icon="calendar-outline" tone={colors.blue} onPress={() => navigation.getParent()?.navigate('PatientAppointmentDetail', { appointment: item })} />
        ))}
      </Content>
    </Screen>
  );
}

export function PatientLabResultsScreen({ navigation }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setItems(await getPatientLabResults());
    } catch (loadError: any) {
      console.error('[Patient Lab Results] Load error:', loadError.response?.data || loadError.message);
      setError(loadError.response?.data?.message || 'Unable to load lab results.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Screen>
      <Content>
        <Header title="Lab Results" subtitle="Tests linked to your record" navigation={navigation} />
        {loading ? <ActivityIndicator color={colors.teal} /> : null}
        {error ? (
          <TouchableOpacity style={local.stateCard} onPress={load}>
            <Text style={local.errorText}>{error}</Text>
            <Text style={local.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        ) : null}
        {!loading && !error && items.length === 0 ? <Text style={local.stateText}>No lab results found.</Text> : null}
        {items.map((item) => (
          <ListRow key={item.id} title={item.test_name} subtitle={item.result || item.status} meta={item.doctors?.name || new Date(item.created_at).toLocaleString()} status={item.status} icon="flask-outline" tone={item.status === 'Completed' ? colors.green : item.status === 'Cancelled' ? colors.red : colors.blue} />
        ))}
      </Content>
    </Screen>
  );
}

// ── Doctor workflow: appointment decisions, assigned-patient context, clinical notes, and lab requests. ──
export function DoctorAppointmentsScreen({ navigation }: any) {
  const [items, setItems] = useState<DoctorAppointment[]>([]);
  const [view, setView] = useState<'today' | 'upcoming'>('today');
  const [status, setStatus] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setItems(await getDoctorAppointments({ view, status: status === 'All' ? undefined : status }));
    } catch (loadError: any) {
      console.error('[Doctor Appointments] Load error:', loadError.response?.data || loadError.message);
      setError(loadError.response?.data?.message || 'Unable to load appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [view, status]);

  return (
    <Screen>
      <Content>
        <Header title="Schedule" subtitle="Appointments" navigation={navigation} />
        <View style={local.chipRow}>
          {['today', 'upcoming'].map((item) => (
            <TouchableOpacity key={item} style={[local.chip, view === item && local.chipActive]} onPress={() => setView(item as any)}>
              <Text style={[local.chipText, view === item && local.chipTextActive]}>{item === 'today' ? 'Today' : 'Upcoming'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={local.chipRow}>
          {['All', ...appointmentStatuses].map((item) => (
            <TouchableOpacity key={item} style={[local.chip, status === item && local.chipActive]} onPress={() => setStatus(item)}>
              <Text style={[local.chipText, status === item && local.chipTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {loading ? <ActivityIndicator color={colors.teal} /> : null}
        {error ? (
          <TouchableOpacity style={local.stateCard} onPress={load}>
            <Text style={local.errorText}>{error}</Text>
            <Text style={local.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        ) : null}
        {!loading && !error && items.length === 0 ? <Text style={local.stateText}>No appointments found.</Text> : null}
        {items.map((item) => (
          <ListRow
            key={item.id}
            title={item.patients?.name || 'Patient'}
            subtitle={item.status}
            meta={new Date(item.appointment_date).toLocaleString()}
            status={item.status}
            tone={item.status === 'Completed' ? colors.green : item.status === 'Cancelled' ? colors.red : colors.blue}
            icon="calendar-outline"
            onPress={() => navigation.getParent()?.navigate('DoctorAppointmentDetail', { id: item.id })}
          />
        ))}
      </Content>
    </Screen>
  );
}

export function DoctorPatientsScreen({ navigation }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setItems(await getDoctorPatients());
    } catch (loadError: any) {
      console.error('[Doctor Patients] Load error:', loadError.response?.data || loadError.message);
      setError(loadError.response?.data?.message || 'Unable to load assigned patients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Screen>
      <Content>
        <Header title="Patients" subtitle="Assigned patients" navigation={navigation} />
        {loading ? <ActivityIndicator color={colors.teal} /> : null}
        {error ? (
          <TouchableOpacity style={local.stateCard} onPress={load}>
            <Text style={local.errorText}>{error}</Text>
            <Text style={local.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        ) : null}
        {!loading && !error && items.length === 0 ? <Text style={local.stateText}>No assigned patients found.</Text> : null}
        {items.map((item) => (
          <ListRow
            key={item.id}
            title={item.name}
            subtitle={`${item.gender || 'Unspecified'} - ${item.blood_type || 'No blood type'}`}
            meta={item.email || item.phone || ''}
            icon="person-outline"
            tone={colors.teal}
            onPress={() => navigation.getParent()?.navigate('DoctorPatientDetail', { id: item.id })}
          />
        ))}
      </Content>
    </Screen>
  );
}

// ── Administrative workflow: management shortcuts, user lifecycle, and staff availability. ──
export function ManagementScreen({ navigation, route }: any) {
  const role = getRole(route);
  const openModule = (title: string) => {
    if (title === 'User Management') {
      navigation.getParent()?.navigate('AdminUsers');
      return;
    }
    if (title === 'Patient Management') {
      navigation.getParent()?.navigate('ReceptionPatientForm');
      return;
    }
    navigation.navigate('ModuleDetail', { title, role });
  };
  return (
    <Screen>
      <Content>
        <Header title="Management" subtitle="Clinic control center" navigation={navigation} />
        {adminModules.map((title, index) => (
          <ListRow key={title} title={title} subtitle="Open dashboard, review records, and coordinate workflows." icon={['person-add-outline', 'people-outline', 'medical-outline', 'calendar-outline', 'card-outline', 'medkit-outline', 'flask-outline', 'analytics-outline'][index]} tone={[colors.purple, colors.teal, colors.blue, colors.orange, colors.blue, colors.green, colors.red, colors.teal][index]} onPress={() => openModule(title)} />
        ))}
      </Content>
    </Screen>
  );
}

export function AdminUsersScreen({ navigation }: any) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('Patient');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setMessage('');
      const data = await getAdminUsers({ search, role: roleFilter === 'All' ? undefined : roleFilter });
      setUsers(data);
    } catch (error: any) {
      console.error('[Admin Users] Load error:', error.response?.data || error.message);
      setIsError(true);
      setMessage(error.response?.data?.message || 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const edit = (user: AdminUser) => {
    setSelectedUser(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setPassword('');
    setMessage('');
  };

  const clearForm = () => {
    setSelectedUser(null);
    setName('');
    setEmail('');
    setRole('Patient');
    setPassword('');
  };

  const saveUser = async () => {
    try {
      setSaving(true);
      setMessage('');
      if (selectedUser) {
        await updateAdminUser(selectedUser.id, { name, email, role });
      } else {
        await createAdminUser({ name, email, role, password });
      }
      setIsError(false);
      setMessage(selectedUser ? 'User updated.' : 'User created.');
      clearForm();
      await loadUsers();
    } catch (error: any) {
      setIsError(true);
      setMessage(error.response?.data?.message || 'Unable to save user.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (user: AdminUser) => {
    try {
      await updateAdminUserStatus(user.id, !user.is_active);
      await loadUsers();
    } catch (error: any) {
      setIsError(true);
      setMessage(error.response?.data?.message || 'Unable to update user status.');
    }
  };

  const resetPassword = async () => {
    if (!selectedUser) return;
    try {
      setSaving(true);
      await resetAdminUserPassword(selectedUser.id, password);
      setIsError(false);
      setMessage('Password reset.');
      setPassword('');
    } catch (error: any) {
      setIsError(true);
      setMessage(error.response?.data?.message || 'Unable to reset password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Content>
        <Header title="User Management" subtitle="Admin controls" navigation={navigation} />
        <View style={local.formCard}>
          <TextInput placeholder="Search users" placeholderTextColor="#8b97a8" value={search} onChangeText={setSearch} onSubmitEditing={loadUsers} style={local.input} />
          <View style={local.chipRow}>
            {['All', ...adminRoles].map((item) => (
              <TouchableOpacity key={item} style={[local.chip, roleFilter === item && local.chipActive]} onPress={() => setRoleFilter(item)}>
                <Text style={[local.chipText, roleFilter === item && local.chipTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity activeOpacity={0.82} style={local.secondaryButton} onPress={loadUsers}>
            <Text style={local.secondaryButtonText}>Search / Refresh</Text>
          </TouchableOpacity>
        </View>

        <SectionHeader title={selectedUser ? 'Edit User' : 'Add User'} action={selectedUser ? 'Clear' : undefined} onPress={clearForm} />
        <View style={local.formCard}>
          <TextInput placeholder="Name" placeholderTextColor="#8b97a8" value={name} onChangeText={setName} style={local.input} />
          <TextInput placeholder="Email" placeholderTextColor="#8b97a8" autoCapitalize="none" value={email} onChangeText={setEmail} style={local.input} />
          <View style={local.chipRow}>
            {adminRoles.map((item) => (
              <TouchableOpacity key={item} style={[local.chip, role === item && local.chipActive]} onPress={() => setRole(item)}>
                <Text style={[local.chipText, role === item && local.chipTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput secureTextEntry placeholder={selectedUser ? 'New password for reset' : 'Password'} placeholderTextColor="#8b97a8" value={password} onChangeText={setPassword} style={local.input} />
          {message ? <Text style={isError ? local.errorText : local.successText}>{message}</Text> : null}
          <TouchableOpacity activeOpacity={0.82} style={local.secondaryButton} onPress={saveUser} disabled={saving}>
            <Text style={local.secondaryButtonText}>{saving ? 'Saving...' : selectedUser ? 'Save User' : 'Create User'}</Text>
          </TouchableOpacity>
          {selectedUser ? (
            <TouchableOpacity activeOpacity={0.82} style={local.outlineButton} onPress={resetPassword} disabled={saving}>
              <Text style={local.outlineButtonText}>Reset Password</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <SectionHeader title="Users" />
        {loading ? <ActivityIndicator color={colors.teal} /> : null}
        {!loading && users.length === 0 ? <Text style={local.stateText}>No users found.</Text> : null}
        {users.map((user) => (
          <ListRow
            key={user.id}
            title={user.name}
            subtitle={`${user.role} - ${user.email}`}
            status={user.is_active ? 'Active' : 'Inactive'}
            tone={user.is_active ? colors.green : colors.red}
            icon="person-outline"
            onPress={() => edit(user)}
          />
        ))}
        {selectedUser ? (
          <TouchableOpacity activeOpacity={0.82} style={local.outlineButton} onPress={() => toggleStatus(selectedUser)}>
            <Text style={local.outlineButtonText}>{selectedUser.is_active ? 'Deactivate Selected User' : 'Activate Selected User'}</Text>
          </TouchableOpacity>
        ) : null}
      </Content>
    </Screen>
  );
}

export function ActiveStaffScreen({ navigation }: any) {
  const [staff, setStaff] = useState<ActiveStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStaff = async () => {
    try {
      setLoading(true);
      setError('');
      setStaff(await getActiveStaff());
    } catch (loadError: any) {
      console.error('[Active Staff] Load error:', loadError.response?.data || loadError.message);
      setError(loadError.response?.data?.message || 'Unable to load active staff.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  return (
    <Screen>
      <Content>
        <Header title="Active Staff" subtitle="Real-time staff availability" navigation={navigation} />
        {loading ? <ActivityIndicator color={colors.teal} /> : null}
        {error ? (
          <TouchableOpacity activeOpacity={0.82} style={local.stateCard} onPress={loadStaff}>
            <Text style={local.errorText}>{error}</Text>
            <Text style={local.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        ) : null}
        {!loading && !error && staff.length === 0 ? <Text style={local.stateText}>No active staff found.</Text> : null}
        {staff.map((member) => (
          <ListRow
            key={member.id}
            title={member.name}
            subtitle={`${member.role} - ${member.email}`}
            meta={`Status: ${member.is_active ? 'Active' : 'Inactive'}`}
            status={member.availability}
            tone={member.availability === 'Busy' ? colors.orange : member.availability === 'Unavailable' ? colors.red : colors.green}
            icon="pulse-outline"
          />
        ))}
      </Content>
    </Screen>
  );
}

export function DoctorAppointmentDetailScreen({ navigation, route }: any) {
  const [item, setItem] = useState<DoctorAppointment | null>(null);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const id = route.params?.id;

  const load = async () => {
    try {
      setLoading(true);
      const data = await getDoctorAppointment(id);
      setItem(data);
      setNotes(data.doctor_notes || '');
      setMessage('');
    } catch (loadError: any) {
      setIsError(true);
      setMessage(loadError.response?.data?.message || 'Unable to load appointment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const changeStatus = async (status: AppointmentStatus) => {
    try {
      setItem(await updateDoctorAppointmentStatus(id, status));
      setIsError(false);
      setMessage('Status updated.');
    } catch (error: any) {
      setIsError(true);
      setMessage(error.response?.data?.message || 'Unable to update status.');
    }
  };

  const saveNotes = async (complete = false) => {
    try {
      setItem(await updateDoctorAppointmentNotes(id, notes, complete));
      setIsError(false);
      setMessage(complete ? 'Consultation completed.' : 'Notes saved.');
    } catch (error: any) {
      setIsError(true);
      setMessage(error.response?.data?.message || 'Unable to save notes.');
    }
  };

  return (
    <Screen>
      <Content>
        <Header title="Appointment" subtitle={item?.patients?.name || 'Consultation'} navigation={navigation} />
        {loading ? <ActivityIndicator color={colors.teal} /> : null}
        {item ? (
          <>
            <ListRow title={item.patients?.name || 'Patient'} subtitle={item.status} meta={new Date(item.appointment_date).toLocaleString()} icon="calendar-outline" tone={colors.blue} />
            <View style={local.chipRow}>
              {appointmentStatuses.map((status) => (
                <TouchableOpacity key={status} style={[local.chip, item.status === status && local.chipActive]} onPress={() => changeStatus(status)}>
                  <Text style={[local.chipText, item.status === status && local.chipTextActive]}>{status}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={local.formCard}>
              <TextInput multiline placeholder="Doctor notes" placeholderTextColor="#8b97a8" value={notes} onChangeText={setNotes} style={[local.input, local.textArea]} editable={item.status !== 'Completed'} />
              {message ? <Text style={isError ? local.errorText : local.successText}>{message}</Text> : null}
              <TouchableOpacity style={local.secondaryButton} onPress={() => saveNotes(false)} disabled={item.status === 'Completed'}>
                <Text style={local.secondaryButtonText}>Save Notes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={local.outlineButton} onPress={() => saveNotes(true)}>
                <Text style={local.outlineButtonText}>Mark Consultation Completed</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </Content>
    </Screen>
  );
}

export function DoctorPatientDetailScreen({ navigation, route }: any) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const id = route.params?.id;

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setDetail(await getDoctorPatient(id));
    } catch (loadError: any) {
      setError(loadError.response?.data?.message || 'Unable to load patient.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const patient = detail?.patient;
  return (
    <Screen>
      <Content>
        <Header title="Patient Profile" subtitle={patient?.name || 'Assigned patient'} navigation={navigation} />
        {loading ? <ActivityIndicator color={colors.teal} /> : null}
        {error ? <Text style={local.errorText}>{error}</Text> : null}
        {patient ? (
          <>
            <ListRow title={patient.name} subtitle={`${patient.gender || 'Unspecified'} - ${patient.blood_type || 'No blood type'}`} meta={patient.email || patient.phone || ''} icon="person-outline" tone={colors.teal} />
            <ListRow title="Allergies" subtitle={patient.allergies || 'None recorded'} icon="alert-circle-outline" tone={colors.orange} />
            <ListRow title="Medical Conditions" subtitle={patient.medical_conditions || 'None recorded'} icon="medical-outline" tone={colors.red} />
            <ListRow title="Emergency Contact" subtitle={patient.emergency_contact || 'Not available'} icon="call-outline" tone={colors.green} />
            <SectionHeader title="Appointment History" />
            {(detail.appointmentHistory || []).map((appointment: DoctorAppointment) => (
              <ListRow key={appointment.id} title={new Date(appointment.appointment_date).toLocaleString()} subtitle={appointment.status} meta={appointment.doctor_notes || appointment.notes || ''} icon="calendar-outline" tone={appointment.status === 'Completed' ? colors.green : colors.blue} />
            ))}
          </>
        ) : null}
      </Content>
    </Screen>
  );
}

export function DoctorLabTestsScreen({ navigation }: any) {
  const [items, setItems] = useState<DoctorLabTest[]>([]);
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [patientId, setPatientId] = useState('');
  const [testName, setTestName] = useState('');
  const [status, setStatus] = useState('All');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      setItems(await getDoctorLabTests(status === 'All' ? undefined : status));
      const assigned = await getDoctorPatients();
      setPatientsList(assigned);
      if (!patientId && assigned[0]) setPatientId(assigned[0].id);
    } catch (loadError: any) {
      setIsError(true);
      setMessage(loadError.response?.data?.message || 'Unable to load lab requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status]);

  const create = async () => {
    try {
      await createDoctorLabTest({ patient_id: patientId, test_name: testName });
      setTestName('');
      setIsError(false);
      setMessage('Lab request created.');
      await load();
    } catch (error: any) {
      setIsError(true);
      setMessage(error.response?.data?.message || 'Unable to create lab request.');
    }
  };

  return (
    <Screen>
      <Content>
        <Header title="Lab Requests" subtitle="Doctor requests" navigation={navigation} />
        <View style={local.formCard}>
          <View style={local.chipRow}>
            {patientsList.map((patient) => (
              <TouchableOpacity key={patient.id} style={[local.chip, patientId === patient.id && local.chipActive]} onPress={() => setPatientId(patient.id)}>
                <Text style={[local.chipText, patientId === patient.id && local.chipTextActive]}>{patient.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput placeholder="Test name" placeholderTextColor="#8b97a8" value={testName} onChangeText={setTestName} style={local.input} />
          <TouchableOpacity style={local.secondaryButton} onPress={create}>
            <Text style={local.secondaryButtonText}>Create Lab Request</Text>
          </TouchableOpacity>
        </View>
        {message ? <Text style={isError ? local.errorText : local.successText}>{message}</Text> : null}
        <View style={local.chipRow}>
          {labStatuses.map((item) => (
            <TouchableOpacity key={item} style={[local.chip, status === item && local.chipActive]} onPress={() => setStatus(item)}>
              <Text style={[local.chipText, status === item && local.chipTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {loading ? <ActivityIndicator color={colors.teal} /> : null}
        {!loading && items.length === 0 ? <Text style={local.stateText}>No lab requests found.</Text> : null}
        {items.map((item) => (
          <ListRow key={item.id} title={item.test_name} subtitle={item.patients?.name || 'Patient'} meta={new Date(item.created_at).toLocaleString()} status={item.status} icon="flask-outline" tone={item.status === 'Completed' ? colors.green : item.status === 'Cancelled' ? colors.red : colors.blue} />
        ))}
      </Content>
    </Screen>
  );
}

export function ReportsScreen({ navigation }: any) {
  return (
    <Screen>
      <Content>
        <Header title="Reports" subtitle="Performance insights" navigation={navigation} />
        {reports.map((report) => (
          <ChartCard key={report.title} {...report} />
        ))}
      </Content>
    </Screen>
  );
}

export function NotificationsScreen({ navigation }: any) {
  return (
    <Screen>
      <Content>
        <Header title="Notifications" subtitle="Clinic updates" navigation={navigation} />
        {notifications.map((item) => (
          <ListRow key={item.id} title={item.title} subtitle={item.body} meta={item.time} icon="notifications-outline" tone={item.tone === 'red' ? colors.red : item.tone === 'green' ? colors.green : item.tone === 'orange' ? colors.orange : colors.blue} />
        ))}
      </Content>
    </Screen>
  );
}

// ── Shared self-service screens: profile, credential, preference, support, and generic module detail views. ──
export function ProfileScreen({ navigation, route }: any) {
  const role = getRole(route);
  const [profile, setProfile] = useState<any>({ ...roleProfiles[role], ...(route?.params?.user || {}) });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    // Fetch the base account first, then merge role-specific profile fields only when the role supports them.
    const loadProfile = async () => {
      setLoadingProfile(true);
      setProfileError('');
      const current = await getCurrentUserProfile();
      if (current) {
        if (current.role === 'Doctor') {
          try {
            const doctorProfile = await getDoctorProfile();
            setProfile({ ...roleProfiles[current.role], ...current, ...doctorProfile });
          } catch (error: any) {
            console.error('[Doctor Profile] Load error:', error.response?.data || error.message);
            setProfile({ ...roleProfiles[current.role], ...current });
          }
        } else if (current.role === 'Patient') {
          try {
            const patientProfile = await getPatientProfile();
            setProfile({ ...roleProfiles[current.role], ...current, ...patientProfile });
          } catch (error: any) {
            console.error('[Patient Profile] Load error:', error.response?.data || error.message);
            setProfile({ ...roleProfiles[current.role], ...current });
          }
        } else if (current.role === 'Receptionist') {
          try {
            const receptionistProfile = await getReceptionProfile();
            setProfile({ ...roleProfiles[current.role], ...current, ...receptionistProfile });
          } catch (error: any) {
            console.error('[Reception Profile] Load error:', error.response?.data || error.message);
            setProfile({ ...roleProfiles[current.role], ...current });
          }
        } else {
          setProfile({ ...roleProfiles[current.role], ...current });
        }
      } else {
        setProfileError('Unable to load profile.');
      }
      setLoadingProfile(false);
    };
    loadProfile();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Login' }] });
  };
  return (
    <Screen>
      <Content>
        <Header title="Profile" subtitle={roleProfiles[role].title} navigation={navigation} />
        <View style={local.profileCard}>
          <View style={local.profileAvatar}>
            <Text style={local.profileInitials}>{profile.name?.split(' ').map((part: string) => part[0]).slice(0, 2).join('')}</Text>
          </View>
          {loadingProfile ? <ActivityIndicator color={colors.teal} /> : null}
          {profileError ? <Text style={local.errorText}>{profileError}</Text> : null}
          <Text style={local.profileName}>{profile.name}</Text>
          <Text style={local.profileMeta}>{profile.email}</Text>
          <Text style={local.profileMeta}>{profile.role} - {profile.is_active === false ? 'Inactive' : 'Active'}</Text>
          {profile.role === 'Doctor' ? <Text style={local.profileMeta}>{profile.specialization || 'General Practice'} - {profile.is_available === false ? 'Unavailable' : 'Available'}</Text> : null}
          {profile.role === 'Patient' ? <Text style={local.profileMeta}>{profile.blood_type || 'Blood type not recorded'}</Text> : null}
        </View>
        <ListRow title="Profile Information" subtitle={`${profile.department} - ${profile.role || role}`} icon="person-outline" tone={colors.teal} onPress={() => navigation.getParent()?.navigate('ProfileInformation', { profile, role: profile.role || role })} />
        <ListRow title="Change Password" subtitle="Update your login credentials" icon="lock-closed-outline" tone={colors.blue} onPress={() => navigation.getParent()?.navigate('ChangePassword', { profile, role })} />
        <ListRow title="Notification Settings" subtitle="Push, SMS, and email preferences" icon="notifications-outline" tone={colors.orange} onPress={() => navigation.getParent()?.navigate('NotificationSettings', { profile, role })} />
        <ListRow title="App Settings" subtitle="Language, display, and privacy" icon="settings-outline" tone={colors.purple} onPress={() => navigation.getParent()?.navigate('AppSettings', { profile, role })} />
        <ListRow title="Help & Support" subtitle="Contact support or view help topics" icon="help-circle-outline" tone={colors.green} onPress={() => navigation.getParent()?.navigate('HelpSupport', { profile, role })} />
        <TouchableOpacity style={local.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ffffff" />
          <Text style={local.logoutText}>Logout</Text>
        </TouchableOpacity>
      </Content>
    </Screen>
  );
}

export function ProfileInformationScreen({ navigation, route }: any) {
  const profile = route.params?.profile || {};
  const role = route.params?.role || 'Admin';
  const [form, setForm] = useState({
    name: profile.name || '',
    email: profile.email || '',
    phone: profile.phone || '',
    gender: profile.gender || '',
    date_of_birth: profile.date_of_birth || '',
    blood_type: profile.blood_type || '',
    emergency_contact: profile.emergency_contact || '',
    insurance_provider: profile.insurance_provider || '',
    allergies: profile.allergies || '',
    medical_conditions: profile.medical_conditions || '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const updateField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const savePatientProfile = async () => {
    try {
      setSaving(true);
      setMessage('');
      await updatePatientProfile(form);
      setIsError(false);
      setMessage('Profile updated.');
    } catch (error: any) {
      console.error('[Patient Profile] Update error:', error.response?.data || error.message);
      setIsError(true);
      setMessage(error.response?.data?.message || 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const saveReceptionProfile = async () => {
    try {
      setSaving(true);
      setMessage('');
      await updateReceptionProfile({ name: form.name, email: form.email });
      setIsError(false);
      setMessage('Profile updated.');
    } catch (error: any) {
      console.error('[Reception Profile] Update error:', error.response?.data || error.message);
      setIsError(true);
      setMessage(error.response?.data?.message || 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Content>
        <Header title="Profile Information" subtitle={`${profile.department || 'Operations'} - ${role}`} navigation={navigation} />
        {role === 'Patient' ? (
          <View style={local.formCard}>
            <TextInput placeholder="Name" placeholderTextColor="#8b97a8" value={form.name} onChangeText={(value) => updateField('name', value)} style={local.input} />
            <TextInput placeholder="Email" placeholderTextColor="#8b97a8" value={form.email} onChangeText={(value) => updateField('email', value)} style={local.input} autoCapitalize="none" />
            <TextInput placeholder="Phone" placeholderTextColor="#8b97a8" value={form.phone} onChangeText={(value) => updateField('phone', value)} style={local.input} />
            <TextInput placeholder="Gender" placeholderTextColor="#8b97a8" value={form.gender} onChangeText={(value) => updateField('gender', value)} style={local.input} />
            <TextInput placeholder="Date of birth" placeholderTextColor="#8b97a8" value={form.date_of_birth} onChangeText={(value) => updateField('date_of_birth', value)} style={local.input} />
            <TextInput placeholder="Blood type" placeholderTextColor="#8b97a8" value={form.blood_type} onChangeText={(value) => updateField('blood_type', value)} style={local.input} />
            <TextInput placeholder="Emergency contact" placeholderTextColor="#8b97a8" value={form.emergency_contact} onChangeText={(value) => updateField('emergency_contact', value)} style={local.input} />
            <TextInput placeholder="Insurance provider" placeholderTextColor="#8b97a8" value={form.insurance_provider} onChangeText={(value) => updateField('insurance_provider', value)} style={local.input} />
            <TextInput placeholder="Allergies" placeholderTextColor="#8b97a8" value={form.allergies} onChangeText={(value) => updateField('allergies', value)} style={[local.input, local.textArea]} multiline />
            <TextInput placeholder="Medical conditions" placeholderTextColor="#8b97a8" value={form.medical_conditions} onChangeText={(value) => updateField('medical_conditions', value)} style={[local.input, local.textArea]} multiline />
            {message ? <Text style={isError ? local.errorText : local.successText}>{message}</Text> : null}
            <TouchableOpacity activeOpacity={0.82} style={local.secondaryButton} onPress={savePatientProfile} disabled={saving}>
              <Text style={local.secondaryButtonText}>{saving ? 'Saving...' : 'Save Profile'}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {role === 'Receptionist' ? (
          <View style={local.formCard}>
            <TextInput placeholder="Name" placeholderTextColor="#8b97a8" value={form.name} onChangeText={(value) => updateField('name', value)} style={local.input} />
            <TextInput placeholder="Email" placeholderTextColor="#8b97a8" value={form.email} onChangeText={(value) => updateField('email', value)} style={local.input} autoCapitalize="none" />
            {message ? <Text style={isError ? local.errorText : local.successText}>{message}</Text> : null}
            <TouchableOpacity activeOpacity={0.82} style={local.secondaryButton} onPress={saveReceptionProfile} disabled={saving}>
              <Text style={local.secondaryButtonText}>{saving ? 'Saving...' : 'Save Profile'}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <ListRow title="Name" subtitle={profile.name || 'Not available'} icon="person-outline" tone={colors.teal} />
        <ListRow title="Email" subtitle={profile.email || 'Not available'} icon="mail-outline" tone={colors.blue} />
        <ListRow title="Phone" subtitle={profile.phone || 'Not available'} icon="call-outline" tone={colors.green} />
        <ListRow title="Role" subtitle={role} icon="shield-checkmark-outline" tone={colors.purple} />
        {role === 'Patient' ? (
          <>
            <ListRow title="Gender" subtitle={profile.gender || 'Not available'} icon="person-circle-outline" tone={colors.teal} />
            <ListRow title="DOB" subtitle={profile.date_of_birth || 'Not available'} icon="calendar-outline" tone={colors.blue} />
            <ListRow title="Blood Type" subtitle={profile.blood_type || 'Not available'} icon="water-outline" tone={colors.red} />
            <ListRow title="Emergency Contact" subtitle={profile.emergency_contact || 'Not available'} icon="call-outline" tone={colors.green} />
            <ListRow title="Insurance Provider" subtitle={profile.insurance_provider || 'Not available'} icon="card-outline" tone={colors.orange} />
          </>
        ) : null}
        {role === 'Doctor' ? (
          <>
            <ListRow title="Specialization" subtitle={profile.specialization || 'Not available'} icon="medical-outline" tone={colors.blue} />
            <ListRow title="Consultation Fee" subtitle={profile.consultation_fee ? `${profile.consultation_fee}` : 'Not available'} icon="cash-outline" tone={colors.orange} />
            <ListRow title="Availability" subtitle={profile.is_available === false ? 'Unavailable' : 'Available'} icon="pulse-outline" tone={profile.is_available === false ? colors.red : colors.green} />
          </>
        ) : null}
      </Content>
    </Screen>
  );
}

export function ChangePasswordScreen({ navigation }: any) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const submit = async () => {
    setSaving(true);
    setMessage('');
    const result = await changeOwnPassword({ currentPassword, newPassword, confirmPassword });
    setIsError(!result.success);
    setMessage(result.message);
    if (result.success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setSaving(false);
  };

  return (
    <Screen>
      <Content>
        <Header title="Change Password" subtitle="Update your login credentials" navigation={navigation} />
        <View style={local.formCard}>
          <TextInput secureTextEntry placeholder="Current password" placeholderTextColor="#8b97a8" value={currentPassword} onChangeText={setCurrentPassword} style={local.input} />
          <TextInput secureTextEntry placeholder="New password" placeholderTextColor="#8b97a8" value={newPassword} onChangeText={setNewPassword} style={local.input} />
          <TextInput secureTextEntry placeholder="Confirm new password" placeholderTextColor="#8b97a8" value={confirmPassword} onChangeText={setConfirmPassword} style={local.input} />
          {message ? <Text style={isError ? local.errorText : local.successText}>{message}</Text> : null}
          <TouchableOpacity activeOpacity={0.82} style={local.secondaryButton} onPress={submit} disabled={saving}>
            <Text style={local.secondaryButtonText}>{saving ? 'Saving...' : 'Save Password'}</Text>
          </TouchableOpacity>
        </View>
      </Content>
    </Screen>
  );
}

export function NotificationSettingsScreen({ navigation }: any) {
  return (
    <Screen>
      <Content>
        <Header title="Notification Settings" subtitle="Push, SMS, and email preferences" navigation={navigation} />
        <ListRow title="Push Notifications" subtitle="Enabled for account alerts" icon="phone-portrait-outline" tone={colors.teal} />
        <ListRow title="Email Notifications" subtitle="Enabled for reports and billing updates" icon="mail-outline" tone={colors.blue} />
        <ListRow title="SMS Notifications" subtitle="Enabled for urgent operational alerts" icon="chatbubble-outline" tone={colors.orange} />
      </Content>
    </Screen>
  );
}

export function AppSettingsScreen({ navigation }: any) {
  return (
    <Screen>
      <Content>
        <Header title="App Settings" subtitle="Language, display, and privacy" navigation={navigation} />
        <ListRow title="Language" subtitle="English" icon="language-outline" tone={colors.teal} />
        <ListRow title="Display" subtitle="System default" icon="contrast-outline" tone={colors.blue} />
        <ListRow title="Privacy" subtitle="Admin session security enabled" icon="lock-closed-outline" tone={colors.purple} />
      </Content>
    </Screen>
  );
}

export function HelpSupportScreen({ navigation }: any) {
  return (
    <Screen>
      <Content>
        <Header title="Help & Support" subtitle="Contact support or view help topics" navigation={navigation} />
        <ListRow title="Support Desk" subtitle="support@clinic.local" icon="help-circle-outline" tone={colors.green} />
        <ListRow title="System Guide" subtitle="Admin workflow documentation" icon="book-outline" tone={colors.blue} />
        <ListRow title="Report an Issue" subtitle="Send details to the operations team" icon="bug-outline" tone={colors.red} />
      </Content>
    </Screen>
  );
}

export function ModuleDetailScreen({ navigation, route }: any) {
  const title = route.params?.title || 'Clinic Module';
  return (
    <Screen>
      <Content>
        <Header title={title} subtitle="Operational workspace" navigation={navigation} />
        <View style={local.detailPanel}>
          <Text style={local.detailTitle}>{title}</Text>
          <Text style={local.detailText}>Review current items, assigned staff, status history, notes, and related healthcare records in one focused workspace.</Text>
        </View>
        <SectionHeader title="Current Worklist" />
        {[...patients.slice(0, 2), ...labTests.slice(0, 1)].map((item: any) => (
          <ListRow key={`${title}-${item.id}`} title={item.name} subtitle={item.meta || item.patient} meta={item.detail || item.requester} status={item.status} icon="ellipse-outline" tone={colors.teal} />
        ))}
      </Content>
    </Screen>
  );
}

const local = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  stateCard: {
    minHeight: 64,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  stateText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  retryText: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: '900',
  },
  errorText: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  successText: {
    color: colors.green,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 12,
  },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.faint,
  },
  chipActive: {
    backgroundColor: colors.teal,
  },
  chipText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  secondaryButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 15,
  },
  outlineButton: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginTop: 10,
    backgroundColor: colors.surface,
  },
  outlineButtonText: {
    color: colors.ink,
    fontWeight: '900',
    fontSize: 14,
  },
  alert: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 22,
  },
  alertIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    fontWeight: '900',
    color: colors.ink,
  },
  alertText: {
    color: colors.red,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  pill: {
    backgroundColor: '#ffffff',
    color: colors.red,
    fontSize: 11,
    fontWeight: '800',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  featureCard: {
    backgroundColor: colors.blue,
    borderRadius: 20,
    padding: 16,
    minHeight: 154,
    marginBottom: 14,
  },
  featureBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff33',
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    overflow: 'hidden',
  },
  featureTime: {
    position: 'absolute',
    top: 18,
    right: 16,
    color: '#ffffff',
    fontWeight: '900',
  },
  featureTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 18,
  },
  featureText: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 6,
  },
  featureButton: {
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  featureButtonText: {
    color: colors.blue,
    fontWeight: '900',
  },
  appointmentHero: {
    backgroundColor: colors.teal,
    borderRadius: 20,
    padding: 18,
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 4,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#ffffff25',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: 18,
    top: 18,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 62,
  },
  heroSub: {
    color: '#ffffff',
    marginLeft: 62,
    marginTop: 4,
  },
  heroTime: {
    height: 48,
    borderRadius: 16,
    backgroundColor: '#ffffff18',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    marginTop: 22,
  },
  heroTimeText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#e9edf4',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  segmentItem: {
    flex: 1,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: '#ffffff',
  },
  segmentText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  segmentActiveText: {
    color: colors.teal,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 16,
  },
  profileAvatar: {
    width: 74,
    height: 74,
    borderRadius: 28,
    backgroundColor: '#e6fbf7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileInitials: {
    color: colors.teal,
    fontSize: 24,
    fontWeight: '900',
  },
  profileName: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  profileMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  logoutButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 26,
  },
  logoutText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 15,
  },
  detailPanel: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  detailTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  detailText: {
    color: colors.muted,
    lineHeight: 21,
    marginTop: 8,
  },
});
