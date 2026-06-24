// Legacy standalone admin overview. The active navigator uses RoleScreens' live AdminDashboard instead.
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

export default function AdminHomeScreen({ navigation }: { navigation: any }) {
  const [user, setUser] = useState<any>(null);

  // Read the locally cached identity for display only; live operational counts belong to the portal dashboard.
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

  const dashboardCards = [
    { id: '1', title: 'Users', icon: 'people-outline', color: '#3b82f6' },
    { id: '2', title: 'Patients', icon: 'bed-outline', color: '#10b981' },
    { id: '3', title: 'Doctors', icon: 'medkit-outline', color: '#f59e0b' },
    { id: '4', title: 'Appointments', icon: 'calendar-outline', color: '#8b5cf6' },
    { id: '5', title: 'Billing', icon: 'card-outline', color: '#ef4444' },
    { id: '6', title: 'Pharmacy', icon: 'flask-outline', color: '#06b6d4' },
    { id: '7', title: 'Laboratory', icon: 'beaker-outline', color: '#ec4899' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>{user ? `Active: ${user.name}` : 'Loading...'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={26} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeRow}>
          <View>
            <Text style={styles.greetingText}>Welcome back, Admin</Text>
            <Text style={styles.userNameText}>{user?.name || 'Administrator'}</Text>
            <Text style={styles.roleText}>Role: {user?.role || 'Admin'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Dashboard Overview</Text>

        <View style={styles.cardsGrid}>
          {dashboardCards.map((card) => (
            <TouchableOpacity key={card.id} style={styles.card}>
              <View style={[styles.iconContainer, { backgroundColor: card.color + '20' }]}>
                <Ionicons name={card.icon as any} size={32} color={card.color} />
              </View>
              <Text style={styles.cardTitle}>{card.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  header: {
    backgroundColor: '#0A6EBD',
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
    color: '#E1E8EF',
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
  welcomeRow: {
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 15,
    color: '#6B7A90',
    fontWeight: '600',
  },
  userNameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A2138',
    marginTop: 2,
  },
  roleText: {
    fontSize: 14,
    color: '#0A6EBD',
    fontWeight: '500',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A2138',
    marginBottom: 16,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: '#ffffff',
    width: '48%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A2138',
  },
});
