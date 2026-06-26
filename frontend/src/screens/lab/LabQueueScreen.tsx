import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getLabRequests, LabRequestRecord } from '../../services/labService';
import { Content, Header, ListRow, Screen, colors } from '../../ui/ClinicComponents';

export default function LabQueueScreen({ navigation }: any) {
  const [items, setItems] = useState<LabRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      setItems(await getLabRequests());
    } catch (err: any) {
      console.error('[LabQueue] Load error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Unable to load lab requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item) => {
      const patientName = item.patients?.name?.toLowerCase() || '';
      const doctorName = item.doctors?.name?.toLowerCase() || '';
      return patientName.includes(q) || doctorName.includes(q);
    });
  }, [items, search]);

  const priorityTone = (priority?: string) => {
    if (priority === 'Stat') return colors.red;
    if (priority === 'Urgent') return colors.orange;
    return colors.blue;
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
          <Header title="Queue" subtitle="Laboratory workflow" navigation={navigation} />
          <ActivityIndicator color={colors.teal} style={{ marginTop: 40 }} />
        </Content>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <Content>
          <Header title="Queue" subtitle="Laboratory workflow" navigation={navigation} />
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
        <Header title="Queue" subtitle="Laboratory workflow" navigation={navigation} />

        <View style={{ height: 54, backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <Ionicons name="search" size={20} color="#9aa5b5" />
          <TextInput
            placeholder="Search by patient or doctor..."
            placeholderTextColor="#8b97a8"
            value={search}
            onChangeText={setSearch}
            style={{ flex: 1, fontSize: 14, color: colors.ink }}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#9aa5b5" />
            </TouchableOpacity>
          ) : null}
        </View>

        {filtered.length === 0 ? (
          <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 20 }}>
            {search ? 'No requests match your search.' : 'No lab requests found.'}
          </Text>
        ) : (
          filtered.map((item) => (
            <ListRow
              key={item.id}
              icon="flask-outline"
              title={item.patients?.name || 'Patient'}
              subtitle={`Dr. ${item.doctors?.name || 'Doctor'}  ·  ${item.lab_request_tests?.length || 0} test(s)`}
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
