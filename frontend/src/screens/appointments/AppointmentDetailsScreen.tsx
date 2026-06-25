import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppointmentRecord, cancelAppointment, checkInPatient, getAppointmentById } from '../../services/appointmentService';
import { Content, Header, ListRow, Screen, colors } from '../../ui/ClinicComponents';

type DetailRole = 'Doctor' | 'Patient' | 'Receptionist';

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
};

const formatTime = (value?: string) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function AppointmentDetailsScreen({ navigation, route }: any) {
  const { id, role } = route.params as { id: string; role: DetailRole };
  const [item, setItem] = useState<AppointmentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setItem(await getAppointmentById(id));
    } catch (loadError: any) {
      console.error('[AppointmentDetails] Load error:', loadError.response?.data || loadError.message);
      setError(loadError.response?.data?.message || 'Unable to load appointment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleCheckIn = async () => {
    if (!item) return;
    try {
      setActionSaving(true);
      setActionMessage('');
      setActionError(false);
      const updated = await checkInPatient(item.id);
      setItem(updated);
      setActionMessage('Patient checked in.');
    } catch (err: any) {
      setActionError(true);
      setActionMessage(err.response?.data?.message || 'Unable to check in patient.');
    } finally {
      setActionSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!item) return;
    try {
      setActionSaving(true);
      setActionMessage('');
      setActionError(false);
      const updated = await cancelAppointment(item.id);
      setItem(updated);
      setActionMessage('Appointment cancelled.');
    } catch (err: any) {
      setActionError(true);
      setActionMessage(err.response?.data?.message || 'Unable to cancel appointment.');
    } finally {
      setActionSaving(false);
    }
  };

  const canCancel = role === 'Patient'
    ? item && ['Pending', 'Confirmed'].includes(item.status || '')
    : role === 'Receptionist'
    ? item && item.status !== 'Cancelled'
    : false;
  const canOpenConsultation = role === 'Doctor' && item && !['Cancelled', 'No Show'].includes(item.status || '');
  const consultationLabel = item?.status === 'Completed'
    ? 'Review Consultation'
    : item?.status === 'In Consultation'
    ? 'Continue Consultation'
    : 'Start Consultation';

  return (
    <Screen>
      <Content>
        <Header title="Appointment Details" subtitle={item?.patients?.name || role} navigation={navigation} />
        {loading ? <ActivityIndicator color={colors.teal} /> : null}
        {error ? (
          <TouchableOpacity style={styles.stateCard} onPress={load}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        ) : null}
        {!loading && !error && !item ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateText}>Appointment not found.</Text>
          </View>
        ) : null}
        {item ? (
          <>
            <ListRow title="Appointment ID" subtitle={item.id} icon="hash-outline" tone={colors.muted} />
            <ListRow title="Patient" subtitle={item.patients?.name || 'N/A'} meta={item.patients?.email || ''} icon="person-outline" tone={colors.teal} />
            <ListRow title="Doctor" subtitle={item.doctors?.name || 'N/A'} meta={item.doctors?.specialization || ''} icon="medical-outline" tone={colors.blue} />
            <ListRow title="Date" subtitle={formatDate(item.appointment_date)} icon="calendar-outline" tone={colors.orange} />
            <ListRow title="Time" subtitle={formatTime(item.appointment_date)} icon="time-outline" tone={colors.blue} />
            <ListRow
              title="Status"
              subtitle={item.status || 'N/A'}
              icon="pulse-outline"
              tone={item.status === 'Cancelled' ? colors.red : item.status === 'Completed' ? colors.green : colors.orange}
            />
            <ListRow title="Reason / Notes" subtitle={item.notes || 'No notes'} icon="document-text-outline" tone={colors.purple} />
            <ListRow title="Created" subtitle={formatDate((item as any).created_at)} icon="add-circle-outline" tone={colors.muted} />
            {(item as any).updated_at ? <ListRow title="Last Updated" subtitle={formatDate((item as any).updated_at)} icon="refresh-outline" tone={colors.muted} /> : null}
            {actionMessage ? <Text style={actionError ? styles.errorText : styles.successText}>{actionMessage}</Text> : null}
            {canOpenConsultation ? (
              <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('DoctorConsultation', { appointmentId: item.id })}>
                <Text style={styles.secondaryButtonText}>{consultationLabel}</Text>
              </TouchableOpacity>
            ) : null}
            {role === 'Doctor' && item.patient_id ? (
              <TouchableOpacity style={styles.outlineButton} onPress={() => navigation.navigate('ConsultationHistory', { patientId: item.patient_id, patientName: item.patients?.name })}>
                <Text style={styles.outlineButtonText}>Consultation History</Text>
              </TouchableOpacity>
            ) : null}
            {role === 'Doctor' && item.patient_id ? (
              <TouchableOpacity style={styles.outlineButton} onPress={() => navigation.navigate('DoctorPrescription', { appointmentId: item.id, patientId: item.patient_id, patientName: item.patients?.name })}>
                <Text style={styles.outlineButtonText}>Prescribe</Text>
              </TouchableOpacity>
            ) : null}
            {role === 'Receptionist' ? (
              <>
                <TouchableOpacity disabled={actionSaving || !['Pending', 'Confirmed'].includes(item.status || '')} style={styles.secondaryButton} onPress={handleCheckIn}>
                  <Text style={styles.secondaryButtonText}>{actionSaving ? 'Saving...' : 'Check In Patient'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.outlineButton} onPress={() => navigation.navigate('ReceptionAppointmentForm', { appointment: item })}>
                  <Text style={styles.outlineButtonText}>Edit / Reschedule</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={actionSaving || item.status === 'Cancelled'} style={styles.outlineButton} onPress={handleCancel}>
                  <Text style={styles.outlineButtonText}>Cancel Appointment</Text>
                </TouchableOpacity>
              </>
            ) : null}
            {role === 'Patient' && canCancel ? (
              <TouchableOpacity disabled={actionSaving} style={styles.outlineButton} onPress={handleCancel}>
                <Text style={styles.outlineButtonText}>{actionSaving ? 'Cancelling...' : 'Cancel Appointment'}</Text>
              </TouchableOpacity>
            ) : null}
          </>
        ) : null}
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
  successText: {
    color: colors.green,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  secondaryButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
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
