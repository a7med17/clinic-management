import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPatientById, PatientRecord } from '../../services/patientDirectoryService';
import { Header, Screen, colors } from '../../ui/ClinicComponents';

const patientFieldRows = [
  ['Patient ID', 'id'],
  ['Full Name', 'name'],
  ['Gender', 'gender'],
  ['Date of Birth', 'date_of_birth'],
  ['Blood Group', 'blood_type'],
  ['Phone Number', 'phone'],
  ['Email', 'email'],
  ['Address', 'address'],
  ['Emergency Contact', 'emergency_contact'],
  ['Insurance Provider', 'insurance_provider'],
  ['Registration Date', 'created_at'],
] as const;

const formatDate = (value?: string | null) => {
  if (!value) return 'Not recorded';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
};

const getAge = (value?: string | null) => {
  if (!value) return 'Not recorded';
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return 'Not recorded';

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return `${age} years`;
};

const getFieldValue = (patient: PatientRecord | null, key: keyof PatientRecord | 'created_at') => {
  if (!patient) return 'Not recorded';
  if (key === 'created_at') return formatDate(patient.created_at);
  if (key === 'date_of_birth') return patient.date_of_birth ? formatDate(patient.date_of_birth) : 'Not recorded';
  if (key === 'gender') return patient.gender || 'Not recorded';
  const value = patient[key];
  return value ? String(value) : 'Not recorded';
};

export default function PatientDetailsScreen({ navigation, route }: any) {
  const patientId = route.params?.patientId || route.params?.patient?.id;
  const initialPatient = route.params?.patient || null;
  const [patient, setPatient] = useState<PatientRecord | null>(initialPatient);
  const [loading, setLoading] = useState(!initialPatient);
  const [error, setError] = useState('');

  const loadPatient = async () => {
    if (!patientId) {
      setPatient(null);
      setLoading(false);
      setError('No patient was selected.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setPatient(await getPatientById(patientId));
    } catch (loadError: any) {
      console.error('[Patient Details] Load error:', loadError.response?.data || loadError.message);
      setError(loadError.response?.data?.message || 'Unable to load patient details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatient();
  }, [patientId]);

  const openEdit = () => {
    const target = navigation.getParent?.() || navigation;
    target.navigate('ReceptionPatientForm', { patient });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <Header title="Patient Details" subtitle="Profile information" navigation={navigation} />
        {loading ? (
          <View style={{ paddingVertical: 28 }}>
            <ActivityIndicator color={colors.teal} />
            <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 10 }}>Loading patient details...</Text>
          </View>
        ) : null}
        {error ? (
          <TouchableOpacity style={{ backgroundColor: '#fff', borderRadius: 22, padding: 18, marginHorizontal: 16, marginTop: 16 }} onPress={loadPatient} activeOpacity={0.82}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="alert-circle-outline" size={22} color={colors.red} />
              <Text style={{ color: colors.ink, fontWeight: '700', flex: 1 }}>{error}</Text>
            </View>
            <Text style={{ color: colors.muted, marginTop: 8 }}>Tap to retry</Text>
          </TouchableOpacity>
        ) : null}
        {!loading && !error && !patient ? (
          <View style={{ backgroundColor: '#fff', borderRadius: 22, padding: 18, marginHorizontal: 16, marginTop: 16 }}>
            <Text style={{ color: colors.ink, fontWeight: '700' }}>No patient selected.</Text>
          </View>
        ) : null}
        {!loading && !error && patient ? (
          <View style={{ marginHorizontal: 16, gap: 12 }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 22, padding: 18 }}>
              {patientFieldRows.map(([label, key]) => {
                const value = key === 'date_of_birth' ? getFieldValue(patient, key) : getFieldValue(patient, key);
                const displayValue = key === 'date_of_birth' ? `${value} (${getAge(patient.date_of_birth)})` : value;
                return (
                  <View key={label} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eef3f1' }}>
                    <Text style={{ color: colors.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</Text>
                    <Text style={{ color: colors.ink, fontSize: 15, fontWeight: '600', marginTop: 4 }}>{displayValue}</Text>
                  </View>
                );
              })}
            </View>
            <TouchableOpacity activeOpacity={0.82} onPress={openEdit} style={{ backgroundColor: colors.teal, borderRadius: 18, paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Edit Patient</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}