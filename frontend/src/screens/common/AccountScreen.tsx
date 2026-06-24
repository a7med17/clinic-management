// Legacy account overview driven by cached user data; the active app uses the phase-one ProfileScreen flow.
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUser, logout } from '../../services/authService';

export default function AccountScreen({ navigation }: { navigation: any }) {
  const [user, setUser] = useState<any>(null);

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

  // Keep the page title role-aware while reusing a single account layout.
  const getHeaderTitle = () => {
    if (!user) return 'Account';
    switch (user.role) {
      case 'Admin':
        return 'Admin Account';
      case 'Doctor':
        return 'Doctor Account';
      case 'Patient':
        return 'Patient Account';
      case 'Receptionist':
        return 'Receptionist Account';
      case 'Pharmacist':
        return 'Pharmacy Account';
      case 'Laboratory Staff':
        return 'Lab Account';
      default:
        return 'Account';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
          <Text style={styles.headerSubtitle}>{user ? `Active: ${user.name}` : 'Loading...'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={26} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.titleContainer}>
          <Text style={styles.pageTitle}>Account Settings</Text>
          <Text style={styles.pageSubtitle}>Manage your profile and access preferences.</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Ionicons name="person" size={40} color="#2b8a5d" />
          </View>
          <Text style={styles.profileName}>{user?.name || 'Loading...'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{user?.role || 'User'}</Text>
          </View>
          <Text style={styles.profileEmail}>{user?.email || ''}</Text>
        </View>

        <View style={styles.optionsList}>
          <Text style={styles.sectionHeader}>Preferences</Text>

          <TouchableOpacity style={styles.optionItem}>
            <View style={styles.optionLeft}>
              <Ionicons name="notifications-outline" size={22} color="#0f4c3a" />
              <Text style={styles.optionText}>Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#71a28a" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem}>
            <View style={styles.optionLeft}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#0f4c3a" />
              <Text style={styles.optionText}>Security</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#71a28a" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem}>
            <View style={styles.optionLeft}>
              <Ionicons name="settings-outline" size={22} color="#0f4c3a" />
              <Text style={styles.optionText}>App settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#71a28a" />
          </TouchableOpacity>

          <Text style={[styles.sectionHeader, { marginTop: 16 }]}>System</Text>

          <TouchableOpacity style={styles.optionItem} onPress={handleLogout}>
            <View style={styles.optionLeft}>
              <Ionicons name="log-out-outline" size={22} color="#b91c1c" />
              <Text style={[styles.optionText, { color: '#b91c1c' }]}>Sign out</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#fca5a5" />
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#d0ecd9',
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e6f4ea',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#a3dcb9',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f4c3a',
    marginBottom: 6,
  },
  roleBadge: {
    backgroundColor: '#d8f3e5',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f4c3a',
  },
  profileEmail: {
    fontSize: 14,
    color: '#71a28a',
    fontWeight: '500',
  },
  optionsList: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#71a28a',
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 15,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#d0ecd9',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f4c3a',
    marginLeft: 12,
  },
});
