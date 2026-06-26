import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getLabRequest, LabRequestDetail } from '../../services/labService';
import { Content, Screen, SectionHeader, colors } from '../../ui/ClinicComponents';

const computeAge = (dob?: string) => {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const formatDateTime = (value?: string) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatTime = (value?: string) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

const statusTone = (status?: string) => {
  if (status === 'Submitted') return colors.blue;
  if (status === 'Pending') return colors.red;
  if (status === 'Processing') return colors.orange;
  if (status === 'Completed') return colors.green;
  return colors.muted;
};

const priorityTone = (priority?: string) => {
  if (priority === 'Stat') return colors.red;
  if (priority === 'Urgent') return colors.orange;
  return colors.blue;
};

export default function LabRequestDetailScreen({ navigation, route }: any) {
  const { requestId } = route.params as { requestId: string };
  const [item, setItem] = useState<LabRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setItem(await getLabRequest(requestId));
    } catch (err: any) {
      console.error('[LabRequestDetail] Load error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Unable to load lab request.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [requestId]);

  if (loading) {
    return (
      <Screen>
        <Content>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Ionicons name="arrow-back" size={22} color={colors.ink} />
            <Text style={{ marginLeft: 8, fontSize: 15, fontWeight: '600', color: colors.ink }}>Back</Text>
          </TouchableOpacity>
          <ActivityIndicator color={colors.teal} style={{ marginTop: 40 }} />
        </Content>
      </Screen>
    );
  }

  if (error || !item) {
    return (
      <Screen>
        <Content>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Ionicons name="arrow-back" size={22} color={colors.ink} />
            <Text style={{ marginLeft: 8, fontSize: 15, fontWeight: '600', color: colors.ink }}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={load} style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: colors.red, fontSize: 14, textAlign: 'center', marginBottom: 12 }}>{error || 'Lab request not found.'}</Text>
            <Text style={{ color: colors.teal, fontWeight: '700', fontSize: 13 }}>Tap to retry</Text>
          </TouchableOpacity>
        </Content>
      </Screen>
    );
  }

  const age = computeAge(item.patients?.date_of_birth);
  const appointmentDate = item.appointments?.appointment_date;

  return (
    <Screen>
      <Content>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
          <Text style={{ marginLeft: 8, fontSize: 15, fontWeight: '600', color: colors.ink }}>Back</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, marginTop: 8 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink, flex: 1 }}>Lab Request</Text>
          <View style={{ borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: `${statusTone(item.status)}18` }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: statusTone(item.status) }}>{item.status}</Text>
          </View>
        </View>

        <SectionHeader title="Patient" />
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 4, borderWidth: 1, borderColor: colors.line }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>{item.patients?.name || 'N/A'}</Text>
          <View style={{ flexDirection: 'row', marginTop: 6, gap: 16 }}>
            {age !== null ? <Text style={{ fontSize: 13, color: colors.muted }}>Age: {age}</Text> : null}
            <Text style={{ fontSize: 13, color: colors.muted }}>Gender: {item.patients?.gender || 'N/A'}</Text>
          </View>
        </View>

        <SectionHeader title="Doctor" />
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 4, borderWidth: 1, borderColor: colors.line }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>{item.doctors?.name || 'N/A'}</Text>
        </View>

        <SectionHeader title="Appointment" />
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 4, borderWidth: 1, borderColor: colors.line }}>
          <Text style={{ fontSize: 13, color: colors.muted }}>Date: {formatDate(appointmentDate)}</Text>
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>Time: {formatTime(appointmentDate)}</Text>
        </View>

        <SectionHeader title="Requested Tests" />
        {item.lab_request_tests?.length === 0 ? (
          <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 12, marginBottom: 20 }}>No tests requested.</Text>
        ) : (
          item.lab_request_tests?.map((test) => (
            <View
              key={test.id}
              style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.line }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink, flex: 1 }}>{test.test_name}</Text>
                <View style={{ borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: `${priorityTone(test.priority)}18` }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: priorityTone(test.priority) }}>{test.priority}</Text>
                </View>
              </View>
              {test.clinical_notes ? (
                <Text style={{ fontSize: 13, color: colors.muted, marginTop: 8 }}>Notes: {test.clinical_notes}</Text>
              ) : null}
            </View>
          ))
        )}
      </Content>
    </Screen>
  );
}
