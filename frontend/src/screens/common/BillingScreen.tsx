// Legacy billing overview. The active receptionist flow uses the role-specific invoice and payment screens.
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

interface Invoice {
  id: string;
  invoice_number: string;
  patient_name: string;
  details: string;
  items: string;
  total_amount: number;
  status: 'Paid' | 'Unpaid' | 'Partially Paid' | 'Refunded';
  due_date: string;
}

export default function BillingScreen({ navigation }: { navigation: any }) {
  const [user, setUser] = useState<any>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const activeUser = await getCurrentUser();
      setUser(activeUser);
    };
    fetchUser();
    fetchInvoices();
  }, []);

  // Preserve an offline preview by loading local examples only when the billing request fails.
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await api.get('/billing/invoices');
      if (response.data && response.data.success) {
        setInvoices((response.data.data || []).map((invoice: any) => ({
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          patient_name: invoice.patients?.name || 'Unknown patient',
          details: invoice.appointments?.appointment_date ? `Appointment: ${invoice.appointments.appointment_date}` : 'Clinic services',
          items: 'See invoice details',
          total_amount: Number(invoice.total_amount || 0),
          status: invoice.status,
          due_date: invoice.due_date,
        })));
      }
    } catch (error) {
      console.warn('[Billing Screen] Failed to fetch invoices from API. Using local fallbacks.');
      setInvoices([
        {
          id: 'inv-3',
          invoice_number: 'INV-#003',
          patient_name: 'Robert Johnson',
          details: 'Neurological consult + blood work',
          items: 'Glucose Comprehensive Blood Lab ($100), Neurologist consult ($120)',
          total_amount: 220.00,
          status: 'Paid',
          due_date: '2026-06-05'
        },
        {
          id: 'inv-2',
          invoice_number: 'INV-#002',
          patient_name: 'Alice Smith',
          details: 'Pediatric Wellness Visit',
          items: 'General Consultation ($95)',
          total_amount: 95.00,
          status: 'Paid',
          due_date: '2026-06-10'
        },
        {
          id: 'inv-1',
          invoice_number: 'INV-#001',
          patient_name: 'John Doe',
          details: 'Cardiology Consultation & ECG Report',
          items: 'ECG Scan ($75), Professional Consultation ($75)',
          total_amount: 150.00,
          status: 'Paid',
          due_date: '2026-06-15'
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
          <Text style={styles.pageTitle}>Billing & Invoicing Centers</Text>
          <Text style={styles.pageSubtitle}>Trace clinic financial records, invoices, and payments.</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#3ba372" style={{ marginTop: 20 }} />
        ) : (
          /* Invoice Cards list */
          <View style={styles.listContainer}>
            {invoices.map((inv) => (
              <View key={inv.id} style={styles.invoiceCard}>
                
                {/* Inv header line */}
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.invoiceNumber}>{inv.invoice_number}</Text>
                  
                  {/* Paid Badge */}
                  <View style={[
                    styles.statusBadge,
                    inv.status === 'Paid' && styles.statusPaid
                  ]}>
                    <Text style={[
                      styles.statusText,
                      inv.status === 'Paid' && styles.textPaid
                    ]}>
                      {inv.status}
                    </Text>
                  </View>
                </View>

                {/* Patient / Details */}
                <View style={styles.cardBody}>
                  <Text style={styles.billedToText}>
                    Billed to: <Text style={styles.patientName}>{inv.patient_name}</Text>
                  </Text>

                  <Text style={styles.detailsLabel}>Details: {inv.details}</Text>
                  
                  <Text style={styles.itemsLabel}>
                    Diagnoses Items: <Text style={styles.itemsValue}>{inv.items}</Text>
                  </Text>
                </View>

                {/* Footer amount / date row */}
                <View style={styles.cardFooterRow}>
                  <View style={styles.dateCol}>
                    <Text style={styles.dateLabel}>Statement Date: {inv.due_date}</Text>
                    <Text style={styles.dueLabel}>Total amount due:</Text>
                  </View>
                  
                  <Text style={styles.amountText}>${inv.total_amount.toFixed(1)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="document-text" size={24} color="#558b70" />
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
  invoiceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d0ecd9',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f4c3a',
  },
  statusBadge: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  statusPaid: {
    backgroundColor: '#e6f4ea',
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  textPaid: {
    color: '#16a34a',
  },
  cardBody: {
    marginBottom: 10,
  },
  billedToText: {
    fontSize: 14.5,
    fontWeight: 'bold',
    color: '#0f4c3a',
    marginBottom: 4,
  },
  patientName: {
    color: '#0f4c3a',
    fontWeight: '600',
  },
  detailsLabel: {
    fontSize: 12.5,
    color: '#71a28a',
    fontWeight: '500',
    marginBottom: 4,
  },
  itemsLabel: {
    fontSize: 12.5,
    fontWeight: 'bold',
    color: '#4b5563',
  },
  itemsValue: {
    fontWeight: '500',
    color: '#4b5563',
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#f3faf6',
    paddingTop: 12,
  },
  dateCol: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    color: '#71a28a',
    fontWeight: '500',
    marginBottom: 4,
  },
  dueLabel: {
    fontSize: 11,
    color: '#71a28a',
    fontWeight: '500',
  },
  amountText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2b8a5d',
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
