// Legacy patient directory with an API-first load and local demo records for disconnected development.
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { getCurrentUser, logout } from '../../services/authService';

interface Patient {
  id: string;
  name: string;
  date_of_birth: string;
  gender: string;
  blood_type: string;
  diagnoses: string;
  medications: string;
}

export default function EHRDirectoryScreen({ navigation }: { navigation: any }) {
  const [user, setUser] = useState<any>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const activeUser = await getCurrentUser();
      setUser(activeUser);
    };
    fetchUser();
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await api.get('/patients');
      if (response.data && response.data.success) {
        setPatients((response.data.data || []).map((patient: any) => ({
          id: patient.id,
          name: patient.name,
          date_of_birth: patient.date_of_birth || 'Not recorded',
          gender: patient.gender || 'Unspecified',
          blood_type: patient.blood_type || 'Not recorded',
          diagnoses: patient.medical_conditions || 'Not recorded',
          medications: 'Not recorded',
        })));
      }
    } catch (error) {
      console.warn('[EHR Screen] Failed to fetch patients from API. Using local fallbacks.');
      // Local fallback in case server is not running or network fails
      setPatients([
        {
          id: 'pat-1',
          name: 'Jane Mary Doe',
          date_of_birth: '1995-01-01',
          gender: 'Unspecified',
          blood_type: 'O+',
          diagnoses: 'Awaiting triage',
          medications: 'None prescribed',
        },
        {
          id: 'pat-2',
          name: 'John Doe',
          date_of_birth: '1985-05-12',
          gender: 'Male',
          blood_type: 'O+',
          diagnoses: 'Hypertension',
          medications: 'Lisinopril 10mg',
        },
        {
          id: 'pat-3',
          name: 'Alice Smith',
          date_of_birth: '1992-09-22',
          gender: 'Female',
          blood_type: 'A-',
          diagnoses: 'Mild Asthma',
          medications: 'Albuterol Inhaler',
        },
        {
          id: 'pat-4',
          name: 'Robert Johnson',
          date_of_birth: '1978-11-30',
          gender: 'Male',
          blood_type: 'B+',
          diagnoses: 'Migraine',
          medications: 'Sumatriptan 50mg',
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

  // Filtering is intentionally local because this legacy screen already holds a small result set.
  const filteredPatients = patients.filter((patient) => {
    const query = searchQuery.toLowerCase();
    return (
      patient.name.toLowerCase().includes(query) ||
      patient.blood_type.toLowerCase().includes(query) ||
      patient.diagnoses.toLowerCase().includes(query)
    );
  });

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
          <Text style={styles.pageTitle}>EHR Directory & Patient Records</Text>
          <Text style={styles.pageSubtitle}>Real-time query of clinical health histories and notes.</Text>
        </View>

        {/* Search Patients Input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#78a48c" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Patients (Name, Disease, Blood Type)"
            placeholderTextColor="#78a48c"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Load Spinner */}
        {loading ? (
          <ActivityIndicator size="large" color="#3ba372" style={{ marginTop: 20 }} />
        ) : (
          /* Patients Cards list */
          <View style={styles.patientsList}>
            {filteredPatients.map((patient) => (
              <View key={patient.id} style={styles.patientCard}>
                {/* Header Row */}
                <View style={styles.patientCardHeader}>
                  <Text style={styles.patientName}>{patient.name}</Text>
                  <View style={styles.bloodBadge}>
                    <Text style={styles.bloodText}>Blood: {patient.blood_type}</Text>
                  </View>
                </View>

                {/* Patient Specs */}
                <Text style={styles.patientDetailText}>
                  Age/Gender: {patient.date_of_birth} | {patient.gender}
                </Text>
                
                <Text style={styles.diagnosisLabel}>
                  Diagnoses: <Text style={styles.diagnosisValue}>{patient.diagnoses}</Text>
                </Text>

                <Text style={styles.medsLabel}>
                  Medications: <Text style={styles.medsValue}>{patient.medications}</Text>
                </Text>

                {/* Footer tap indicator */}
                <TouchableOpacity style={styles.viewRecordButton}>
                  <Text style={styles.viewRecordText}>Tap to View Health Record</Text>
                </TouchableOpacity>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f4ea', // Light green background for search input matching screenshot
    borderWidth: 1,
    borderColor: '#b2dfc3',
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#0f4c3a',
    fontSize: 14,
    fontWeight: '500',
  },
  patientsList: {
    marginBottom: 20,
  },
  patientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d0ecd9',
  },
  patientCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2b8a5d',
    flex: 1,
  },
  bloodBadge: {
    backgroundColor: '#f1e8f7',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  bloodText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#8b5cf6',
  },
  patientDetailText: {
    fontSize: 13,
    color: '#71a28a',
    marginBottom: 6,
    fontWeight: '500',
  },
  diagnosisLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f4c3a',
    marginBottom: 4,
  },
  diagnosisValue: {
    fontWeight: '500',
    color: '#1e3a8a', // Blue text matching diagnosis value
  },
  medsLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f4c3a',
    marginBottom: 12,
  },
  medsValue: {
    fontWeight: '500',
    color: '#0d9488', // Teal text matching prescribed meds
  },
  viewRecordButton: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
  },
  viewRecordText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#059669', // Emerald tap action
  },
  fab: {
    position: 'absolute',
    bottom: 95, // Above the floating navigation bar
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
