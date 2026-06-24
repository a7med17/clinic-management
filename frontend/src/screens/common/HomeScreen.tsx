// Reusable legacy dashboard shell used by role wrapper screens; it currently displays local demonstration content.
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUser, logout } from '../../services/authService';

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  initials: string;
}

interface Center {
  id: string;
  name: string;
  type: string;
}

export default function HomeScreen({ navigation }: { navigation: any }) {
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const doctors: Doctor[] = [
    { id: '1', name: 'Sarah Jenkins', specialization: 'Cardiology', initials: 'DS' },
    { id: '2', name: 'James Wilson', specialization: 'Pediatrics', initials: 'DJ' },
    { id: '3', name: 'Michael Chen', specialization: 'Neurology', initials: 'DM' },
  ];

  const centers: Center[] = [
    { id: '1', name: 'Harborview Dental Associates', type: 'Dental Center' },
    { id: '2', name: 'Radiance Smile Studio', type: 'Dental Center' },
  ];

  useEffect(() => {
    const fetchUser = async () => {
      const activeUser = await getCurrentUser();
      setUser(activeUser);
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigation.replace('Login');
  };

  // Adapt the title from the cached role without duplicating one screen per role.
  const getUserHeaderTitle = () => {
    if (!user) return 'Clinic Dashboard';
    switch (user.role) {
      case 'Admin': return 'Admin Dashboard';
      case 'Doctor': return 'Doctor Dashboard';
      case 'Patient': return 'Patient Dashboard';
      case 'Receptionist': return 'Reception Dashboard';
      case 'Pharmacist': return 'Pharmacy Dashboard';
      case 'Laboratory Staff': return 'Lab Dashboard';
      default: return 'Clinic Dashboard';
    }
  };

  const getActiveRoleLabel = () => {
    if (!user) return 'Loading...';
    return `Active: ${user.name}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Banner Header */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>{getUserHeaderTitle()}</Text>
          <Text style={styles.headerSubtitle}>{getActiveRoleLabel()}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={26} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Greetings Panel */}
        <View style={styles.welcomeRow}>
          <View>
            <Text style={styles.greetingText}>Have a healthy day!</Text>
            <Text style={styles.userNameText}>{user?.name || 'Guest User'}</Text>
          </View>
          <View style={styles.actionsContainer}>
            <View style={[styles.circleAction, styles.heartCircle]}>
              <Ionicons name="heart" size={20} color="#e11d48" />
            </View>
            <View style={[styles.circleAction, styles.bagCircle]}>
              <Ionicons name="briefcase" size={20} color="#0d9488" />
            </View>
          </View>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#78a48c" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search doctors, centers, formulas..."
            placeholderTextColor="#78a48c"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Doctors Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Doctors</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={doctors}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.doctorCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{item.initials}</Text>
              </View>
              <Text style={styles.doctorName}>{item.name}</Text>
              <Text style={styles.doctorSpecialization}>{item.specialization}</Text>
            </View>
          )}
          contentContainerStyle={styles.doctorsList}
        />

        {/* Centers Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Centers</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.centersGrid}>
          {centers.map((center) => (
            <View key={center.id} style={styles.centerCard}>
              <View style={styles.centerIconContainer}>
                <Ionicons name="add-circle" size={32} color="#10b981" />
              </View>
              <Text style={styles.centerName}>{center.name}</Text>
              <Text style={styles.centerType}>{center.type}</Text>
            </View>
          ))}
        </View>

        {/* Operational Rates */}
        <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>
          Facility Operations Rate
        </Text>
        <View style={styles.operationsCard}>
          <View style={styles.operationsHeader}>
            <Ionicons name="pulse" size={24} color="#0f4c3a" />
            <Text style={styles.operationsTitle}>Operations Status</Text>
          </View>
          <View style={styles.progressRow}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '94%' }]} />
            </View>
            <Text style={styles.progressValue}>94%</Text>
          </View>
          <Text style={styles.operationsDesc}>All units are active and running at peak capacities.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eefaf4', // Light green background matching screenshot
  },
  header: {
    backgroundColor: '#3ba372', // Header green
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
    paddingBottom: 110, // Margin to prevent overlapping the floating bottom nav
  },
  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingText: {
    fontSize: 15,
    color: '#558b70',
    fontWeight: '600',
  },
  userNameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2b8a5d',
    marginTop: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
  },
  circleAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  heartCircle: {
    backgroundColor: '#ffe4e6',
  },
  bagCircle: {
    backgroundColor: '#ccfbf1',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ccebd8',
    borderRadius: 25,
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
    fontSize: 15,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f4c3a',
  },
  seeAllText: {
    fontSize: 14,
    color: '#2b8a5d',
    fontWeight: 'bold',
  },
  doctorsList: {
    paddingBottom: 16,
  },
  doctorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    marginRight: 12,
    width: 110,
    borderWidth: 1,
    borderColor: '#d0ecd9',
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#a3dcb9',
    backgroundColor: '#eefaf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2b8a5d',
  },
  doctorName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f4c3a',
    textAlign: 'center',
    marginBottom: 2,
  },
  doctorSpecialization: {
    fontSize: 11,
    color: '#71a28a',
    fontWeight: '500',
  },
  centersGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  centerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    width: '48%',
    borderWidth: 1,
    borderColor: '#d0ecd9',
    marginBottom: 12,
  },
  centerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#e6f4ea',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  centerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f4c3a',
    marginBottom: 4,
  },
  centerType: {
    fontSize: 11,
    color: '#71a28a',
    fontWeight: '500',
  },
  operationsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d0ecd9',
  },
  operationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  operationsTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f4c3a',
    marginLeft: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 10,
    backgroundColor: '#e2f0e7',
    borderRadius: 5,
    marginRight: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2b8a5d',
    borderRadius: 5,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f4c3a',
  },
  operationsDesc: {
    fontSize: 12,
    color: '#71a28a',
    fontWeight: '500',
  },
});
