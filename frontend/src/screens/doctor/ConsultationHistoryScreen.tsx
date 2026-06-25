import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DoctorPatientConsultation, getDoctorPatientConsultations } from '../../services/doctorService';
import { Content, Header, ListRow, Screen, SectionHeader, colors } from '../../ui/ClinicComponents';

const formatDateTime = (value?: string) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
};

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
};

export default function ConsultationHistoryScreen({ navigation, route }: any) {
  const patientId = route.params?.patientId;
  const patientName = route.params?.patientName || 'Patient';
  const [items, setItems] = useState<DoctorPatientConsultation[]>([]);
  const [selected, setSelected] = useState<DoctorPatientConsultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (!patientId) {
      setLoading(false);
      setError('Patient ID is required.');
      return;
    }
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      setSelected(null);
      const data = await getDoctorPatientConsultations(patientId);
      setItems(data);
    } catch (loadError: any) {
      console.error('[ConsultationHistory] Load error:', loadError.response?.data || loadError.message);
      setError(loadError.response?.data?.message || 'Unable to load consultation history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  if (selected) {
    return (
      <Screen>
        <Content>
          <Header title="Consultation Detail" subtitle={selected.patient?.name || patientName} navigation={navigation} />
          <SectionHeader title="Appointment" />
          <ListRow title="Date" subtitle={formatDate(selected.appointment_date)} icon="calendar-outline" tone={colors.orange} />
          <ListRow title="Time" subtitle={formatDateTime(selected.appointment_date)} icon="time-outline" tone={colors.blue} />
          <ListRow title="Patient" subtitle={selected.patient?.name || patientName} icon="person-outline" tone={colors.teal} />
          <ListRow title="Doctor" subtitle={selected.doctor?.name || 'Doctor'} icon="medical-outline" tone={colors.blue} />
          <ListRow title="Status" subtitle={selected.status} icon="pulse-outline" tone={selected.status === 'Completed' ? colors.green : colors.orange} />
          <SectionHeader title="Clinical Record" />
          <ListRow title="Chief Complaint" subtitle={selected.chief_complaint || 'Not recorded'} icon="document-text-outline" tone={colors.purple} />
          <ListRow title="Symptoms" subtitle={selected.symptoms || 'Not recorded'} icon="pulse-outline" tone={colors.orange} />
          <ListRow title="Diagnosis Summary" subtitle={selected.diagnosis_summary || 'Not recorded'} icon="clipboard-outline" tone={colors.red} />
          <ListRow title="Treatment Plan" subtitle={selected.treatment_plan || 'Not recorded'} icon="medkit-outline" tone={colors.teal} />
          <ListRow title="Doctor Notes" subtitle={selected.doctor_notes || 'Not recorded'} icon="chatbubble-ellipses-outline" tone={colors.blue} />
          <ListRow title="Last Updated" subtitle={formatDateTime(selected.updated_at)} icon="refresh-outline" tone={colors.muted} />
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('DoctorConsultation', { appointmentId: selected.appointment_id })}>
            <Text style={styles.secondaryButtonText}>Edit Consultation</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineButton} onPress={() => setSelected(null)}>
            <Text style={styles.outlineButtonText}>Back to History</Text>
          </TouchableOpacity>
        </Content>
      </Screen>
    );
  }

  return (
    <Screen>
      <Content>
        <Header title="Consultation History" subtitle={patientName} navigation={navigation} />
        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={colors.teal} />
            <Text style={styles.stateText}>Loading consultation history...</Text>
          </View>
        ) : null}
        {error && !refreshing ? (
          <TouchableOpacity style={styles.stateCard} onPress={() => load()}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        ) : null}
        {!loading && !error && items.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateText}>No consultation records found for this patient.</Text>
          </View>
        ) : null}
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.82}
            style={styles.card}
            onPress={() => setSelected(item)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardDate}>{formatDate(item.appointment_date)}</Text>
              <View style={[styles.statusBadge, { backgroundColor: item.status === 'Completed' ? '#e6fbf7' : '#fff5e6' }]}>
                <Text style={[styles.statusText, { color: item.status === 'Completed' ? colors.teal : colors.orange }]}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.cardTitle}>{item.patient?.name || patientName}</Text>
            {item.chief_complaint ? <Text style={styles.cardSub}>Complaint: {item.chief_complaint}</Text> : null}
            {item.diagnosis_summary ? <Text style={styles.cardMeta}>Diagnosis: {item.diagnosis_summary}</Text> : null}
            {item.updated_at ? <Text style={styles.cardMeta}>Updated: {formatDateTime(item.updated_at)}</Text> : null}
          </TouchableOpacity>
        ))}
      </Content>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardDate: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardSub: {
    color: colors.ink,
    fontSize: 13,
    marginTop: 2,
  },
  cardMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  secondaryButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    marginTop: 16,
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
    backgroundColor: colors.surface,
  },
  outlineButtonText: {
    color: colors.ink,
    fontWeight: '900',
    fontSize: 14,
  },
});
