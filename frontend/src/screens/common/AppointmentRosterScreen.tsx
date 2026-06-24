// Legacy appointment roster. It retains local fallback records for offline demonstrations.
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { getCurrentUser, logout } from '../../services/authService';

interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
  patient_name: string;
  physician_name: string;
  reason: string;
  doctor_notes?: string;
}

export default function AppointmentRosterScreen({ navigation }: { navigation: any }) {
  const [user, setUser] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const activeUser = await getCurrentUser();
      setUser(activeUser);
    };
    fetchUser();
    fetchAppointments();
  }, []);

  // Attempt the shared API first; fallback data keeps this legacy preview usable without a server.
  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await api.get('/appointments');
      if (response.data && response.data.success) {
        setAppointments((response.data.data || []).map((appointment: any) => ({
          id: appointment.id,
          appointment_date: appointment.appointment_date,
          status: appointment.status,
          patient_name: appointment.patients?.name || 'Unknown patient',
          physician_name: appointment.doctors?.name || 'Unassigned doctor',
          reason: appointment.notes || 'General consultation',
          doctor_notes: appointment.doctor_notes || '',
        })));
      }
    } catch (error) {
      console.warn('[Appointments Screen] Failed to fetch appointments from API. Using local fallbacks.');
      setAppointments([
        {
          id: 'appt-1',
          appointment_date: '2026-06-12 | 11:15 AM',
          status: 'Completed',
          patient_name: 'Robert Johnson',
          physician_name: 'Dr. Michael Chen',
          reason: 'Migraine Consultation',
          doctor_notes: 'Prescribed Sumatriptan. Patient reports relief.'
        },
        {
          id: 'appt-2',
          appointment_date: '2026-06-20 | 02:30 PM',
          status: 'Scheduled',
          patient_name: 'Alice Smith',
          physician_name: 'Dr. James Wilson',
          reason: 'Annual checkup and inhaler refill',
          doctor_notes: ''
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigation.replace('Login');
  };

  // Optimistically remove the row even when this demonstration screen is working from fallback data.
  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/appointments/${id}`);
    } catch {
      // ignore, local update
    }
    setAppointments(appointments.filter(a => a.id !== id));
  };

  const handleComplete = (id: string) => {
    setAppointments(appointments.map(a => {
      if (a.id === id) {
        return {
          ...a,
          status: 'Completed',
          doctor_notes: 'Prescribed treatment. Patient reports feeling better.'
        };
      }
      return a;
    }));
  };

  const handleCancelAppt = (id: string) => {
    setAppointments(appointments.map(a => {
      if (a.id === id) {
        return { ...a, status: 'Cancelled' };
      }
      return a;
    }));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Shared Green Header */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Clinic Management</Text>
          <Text style={styles.headerSubtitle}>
            {user ? `Active: ${user.name}` : 'Loading...'}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={26} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Title Block */}
        <View style={styles.titleContainer}>
          <Text style={styles.pageTitle}>Clinic Appointment Rosters</Text>
          <Text style={styles.pageSubtitle}>Manage consultations, schedules, and active bookings.</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#3ba372" style={{ marginTop: 20 }} />
        ) : (
          /* Cards list */
          <View style={styles.listContainer}>
            {appointments.map((appt) => (
              <View key={appt.id} style={styles.apptCard}>
                
                {/* Time header line */}
                <View style={styles.apptHeaderRow}>
                  <View style={styles.timeWrapper}>
                    <Ionicons name="calendar-outline" size={16} color="#71a28a" style={{ marginRight: 6 }} />
                    <Text style={styles.timeText}>{appt.appointment_date}</Text>
                  </View>
                  
                  {/* Status Badge */}
                  <View style={[
                    styles.statusBadge,
                    appt.status === 'Completed' && styles.statusCompleted,
                    appt.status === 'Cancelled' && styles.statusCancelled
                  ]}>
                    <Text style={[
                      styles.statusText,
                      appt.status === 'Completed' && styles.textCompleted,
                      appt.status === 'Cancelled' && styles.textCancelled
                    ]}>
                      {appt.status}
                    </Text>
                  </View>
                </View>

                {/* Details layout */}
                <View style={styles.detailsBody}>
                  <View style={styles.infoColumn}>
                    <Text style={styles.detailsLabel}>
                      Patient: <Text style={styles.detailsValue}>{appt.patient_name}</Text>
                    </Text>
                    
                    <Text style={styles.detailsLabel}>
                      Physician: <Text style={styles.detailsValue}>{appt.physician_name}</Text>
                    </Text>
                    
                    <Text style={styles.reasonLabel}>
                      Reason: <Text style={styles.reasonText}>{appt.reason}</Text>
                    </Text>

                    {appt.doctor_notes ? (
                      <Text style={styles.notesLabel}>
                        Doctor Note: <Text style={styles.notesText}>{appt.doctor_notes}</Text>
                      </Text>
                    ) : null}
                  </View>

                  {/* Right side delete bin */}
                  <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(appt.id)}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                {/* Bottom button line for scheduled */}
                {appt.status === 'Scheduled' && (
                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.actionBtnComplete} onPress={() => handleComplete(appt.id)}>
                      <Text style={styles.completeBtnText}>Complete</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.actionBtnCancel} onPress={() => handleCancelAppt(appt.id)}>
                      <Text style={styles.cancelBtnText}>Cancel Appt</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eefaf4',
  },
  header: {
    backgroundColor: '#3ba372',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 12 : 24,
    paddingBottom: 16,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#d1fae5',
    marginTop: 2,
    fontWeight: '500',
  },
  logoutButton: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 110,
  },
  titleContainer: {
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2b8a5d',
  },
  pageSubtitle: {
    fontSize: 12,
    color: '#71a28a',
    marginTop: 4,
    fontWeight: '500',
  },
  listContainer: {
    marginBottom: 20,
  },
  apptCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d0ecd9',
  },
  apptHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1fbf5',
    paddingBottom: 10,
    marginBottom: 10,
  },
  timeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 13.5,
    fontWeight: 'bold',
    color: '#0f4c3a',
  },
  statusBadge: {
    backgroundColor: '#ffedd5',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  statusCompleted: {
    backgroundColor: '#e6f4ea',
  },
  statusCancelled: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ea580c',
  },
  textCompleted: {
    color: '#16a34a',
  },
  textCancelled: {
    color: '#dc2626',
  },
  detailsBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoColumn: {
    flex: 1,
  },
  detailsLabel: {
    fontSize: 14.5,
    fontWeight: 'bold',
    color: '#0f4c3a',
    marginBottom: 4,
  },
  detailsValue: {
    fontWeight: '600',
    color: '#0f4c3a',
  },
  reasonLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#71a28a',
    marginBottom: 4,
  },
  reasonText: {
    color: '#4b5563',
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#166534',
    marginTop: 6,
  },
  notesText: {
    color: '#15803d',
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
    alignSelf: 'flex-start',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3faf6',
    paddingTop: 12,
  },
  actionBtnComplete: {
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 15,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  completeBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#374151',
  },
  actionBtnCancel: {
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 15,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  cancelBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#374151',
  },
  fab: {
    position: 'absolute',
    bottom: 95,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#a3dcb9',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
});
