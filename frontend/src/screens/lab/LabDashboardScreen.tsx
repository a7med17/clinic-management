import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { getLabDashboard, getLabRequests, LabDashboardData, LabRequestRecord } from '../../services/labService';
import { Content, Header, ListRow, Screen, SectionHeader, StatCard, colors } from '../../ui/ClinicComponents';

export default function LabDashboardScreen({ navigation }: any) {
  const [dashboard, setDashboard] = useState<LabDashboardData | null>(null);
  const [requests, setRequests] = useState<LabRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      const [dashData, reqData] = await Promise.all([getLabDashboard(), getLabRequests()]);
      setDashboard(dashData);
      setRequests(reqData);
    } catch (err: any) {
      console.error('[LabDashboard] Load error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Unable to load laboratory data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const priorityTone = (priority?: string) => {
    if (priority === 'Stat') return colors.red;
    if (priority === 'Urgent') return colors.orange;
    return colors.blue;
  };

  const statusTone = (status?: string) => {
    if (status === 'Pending') return colors.red;
    if (status === 'Processing') return colors.blue;
    if (status === 'Completed') return colors.green;
    return colors.muted;
  };

  const formatTime = (value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  if (loading) {
    return (
      <Screen>
        <Content>
          <Header title="Laboratory" subtitle="Diagnostic Center" navigation={navigation} />
          <ActivityIndicator color={colors.teal} style={{ marginTop: 40 }} />
        </Content>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <Content>
          <Header title="Laboratory" subtitle="Diagnostic Center" navigation={navigation} />
          <TouchableOpacity onPress={() => load()} style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: colors.red, fontSize: 14, textAlign: 'center', marginBottom: 12 }}>{error}</Text>
            <Text style={{ color: colors.teal, fontWeight: '700', fontSize: 13 }}>Tap to retry</Text>
          </TouchableOpacity>
        </Content>
      </Screen>
    );
  }

  return (
    <Screen>
      <Content
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.teal} colors={[colors.teal]} />}
      >
        <Header title="Laboratory" subtitle="Diagnostic Center" navigation={navigation} />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <StatCard icon="clipboard-outline" value={String(dashboard?.pendingRequests ?? 0)} label="Pending Requests" tone={colors.red} />
          <StatCard icon="flask-outline" value={String(dashboard?.processingRequests ?? 0)} label="Processing" tone={colors.blue} />
          <StatCard icon="checkmark-circle-outline" value={String(dashboard?.completedToday ?? 0)} label="Completed Today" tone={colors.green} />
          <StatCard icon="alert-circle-outline" value={String(dashboard?.urgentRequests ?? 0)} label="Urgent" tone={colors.orange} />
        </View>

        <SectionHeader title="Today's Laboratory Queue" />

        {requests.length === 0 ? (
          <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 20 }}>No lab requests found.</Text>
        ) : (
          requests.map((item) => (
            <ListRow
              key={item.id}
              icon="flask-outline"
              title={item.patients?.name || 'Patient'}
              subtitle={`Dr. ${item.doctors?.name || 'Doctor'}`}
              meta={formatTime(item.updated_at)}
              status={item.highest_priority || 'Routine'}
              tone={priorityTone(item.highest_priority)}
              onPress={() => navigation.getParent()?.navigate('LabRequestDetail', { requestId: item.id })}
            />
          ))
        )}
      </Content>
    </Screen>
  );
}
