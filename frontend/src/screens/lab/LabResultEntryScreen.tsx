import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getLabRequest, getResults, saveResults, completeResults, LabRequestDetail, LabResult } from '../../services/labService';
import { Content, Screen, SectionHeader, colors } from '../../ui/ClinicComponents';

const ABNORMAL_FLAGS = ['', 'Normal', 'Low', 'High', 'Critical', 'Abnormal'];

const statusTone = (status?: string) => {
  if (status === 'Completed') return colors.green;
  if (status === 'Draft') return colors.orange;
  return colors.muted;
};

export default function LabResultEntryScreen({ navigation, route }: any) {
  const { requestId } = route.params as { requestId: string };
  const [item, setItem] = useState<LabRequestDetail | null>(null);
  const [resultMap, setResultMap] = useState<Record<string, LabResult>>({});
  const [formValues, setFormValues] = useState<Record<string, { result_value: string; unit: string; reference_range: string; abnormal_flag: string; comments: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [detail, existingResults] = await Promise.all([
        getLabRequest(requestId),
        getResults(requestId),
      ]);
      setItem(detail);

      const rm: Record<string, LabResult> = {};
      for (const r of existingResults) {
        rm[r.lab_request_test_id] = r;
      }
      setResultMap(rm);

      const fv: Record<string, any> = {};
      for (const test of detail.lab_request_tests || []) {
        const existing = rm[test.id];
        fv[test.id] = {
          result_value: existing?.result_value || '',
          unit: existing?.unit || '',
          reference_range: existing?.reference_range || '',
          abnormal_flag: existing?.abnormal_flag || '',
          comments: existing?.comments || '',
        };
      }
      setFormValues(fv);
    } catch (err: any) {
      console.error('[LabResultEntry] Load error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Unable to load lab request.');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateField = (testId: string, field: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [testId]: { ...prev[testId], [field]: value },
    }));
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      setError('');
      const results = Object.entries(formValues).map(([lab_request_test_id, values]) => ({
        lab_request_test_id,
        result_value: values.result_value.trim() || undefined,
        unit: values.unit.trim() || undefined,
        reference_range: values.reference_range.trim() || undefined,
        abnormal_flag: values.abnormal_flag || undefined,
        comments: values.comments.trim() || undefined,
      }));
      await saveResults(requestId, results);
      await load();
      Alert.alert('Saved', 'Results saved as draft.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Unable to save results.');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = () => {
    const incomplete = (item?.lab_request_tests || []).filter((test) => {
      const v = formValues[test.id];
      return !v || !v.result_value.trim();
    });
    if (incomplete.length > 0) {
      Alert.alert(
        'Incomplete Results',
        `${incomplete.length} test(s) have no result value. Complete anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Complete', onPress: () => doComplete() },
        ],
      );
    } else {
      Alert.alert('Complete Results', 'Finalize all results?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Complete', onPress: () => doComplete() },
      ]);
    }
  };

  const doComplete = async () => {
    try {
      setSaving(true);
      // Save draft first, then complete
      const results = Object.entries(formValues).map(([lab_request_test_id, values]) => ({
        lab_request_test_id,
        result_value: values.result_value.trim() || undefined,
        unit: values.unit.trim() || undefined,
        reference_range: values.reference_range.trim() || undefined,
        abnormal_flag: values.abnormal_flag || undefined,
        comments: values.comments.trim() || undefined,
      }));
      await saveResults(requestId, results);
      await completeResults(requestId);
      Alert.alert('Completed', 'Lab results have been finalized.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Unable to complete results.');
    } finally {
      setSaving(false);
    }
  };

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

  const inputStyle = {
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.line,
    fontSize: 14,
    color: colors.ink,
  };

  return (
    <Screen>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 130 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
          <Text style={{ marginLeft: 8, fontSize: 15, fontWeight: '600', color: colors.ink }}>Back</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, marginTop: 8 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink, flex: 1 }}>Enter Results</Text>
          <View style={{ borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: `${statusTone(item.status)}18` }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: statusTone(item.status) }}>{item.status}</Text>
          </View>
        </View>

        <SectionHeader title="Patient" />
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 4, borderWidth: 1, borderColor: colors.line }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>{item.patients?.name || 'N/A'}</Text>
        </View>

        {item.lab_request_tests?.map((test) => {
          const val = formValues[test.id] || { result_value: '', unit: '', reference_range: '', abnormal_flag: '', comments: '' };
          const result = resultMap[test.id];
          const rStatus = result?.status;

          return (
            <View key={test.id} style={{ marginTop: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink, flex: 1 }}>{test.test_name}</Text>
                {rStatus ? (
                  <View style={{ borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: `${statusTone(rStatus)}18` }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: statusTone(rStatus) }}>{rStatus}</Text>
                  </View>
                ) : null}
              </View>
              {test.clinical_notes ? (
                <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 10 }}>Notes: {test.clinical_notes}</Text>
              ) : null}

              <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.line }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 6 }}>Result Value *</Text>
                <TextInput
                  placeholder="e.g. 5.2"
                  placeholderTextColor="#8b97a8"
                  value={val.result_value}
                  onChangeText={(v) => updateField(test.id, 'result_value', v)}
                  style={inputStyle}
                />

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 6 }}>Unit</Text>
                    <TextInput
                      placeholder="e.g. mg/dL"
                      placeholderTextColor="#8b97a8"
                      value={val.unit}
                      onChangeText={(v) => updateField(test.id, 'unit', v)}
                      style={inputStyle}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 6 }}>Reference Range</Text>
                    <TextInput
                      placeholder="e.g. 3.5-5.5"
                      placeholderTextColor="#8b97a8"
                      value={val.reference_range}
                      onChangeText={(v) => updateField(test.id, 'reference_range', v)}
                      style={inputStyle}
                    />
                  </View>
                </View>

                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 6, marginTop: 12 }}>Abnormal Flag</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {ABNORMAL_FLAGS.map((flag) => {
                    const active = val.abnormal_flag === flag;
                    const isClear = flag === '';
                    return (
                      <TouchableOpacity
                        key={flag}
                        onPress={() => updateField(test.id, 'abnormal_flag', isClear ? '' : flag)}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 10,
                          backgroundColor: active ? colors.teal : colors.bg,
                          borderWidth: 1,
                          borderColor: active ? colors.teal : colors.line,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : colors.muted }}>
                          {isClear ? 'None' : flag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 6, marginTop: 12 }}>Comments</Text>
                <TextInput
                  placeholder="Optional notes..."
                  placeholderTextColor="#8b97a8"
                  value={val.comments}
                  onChangeText={(v) => updateField(test.id, 'comments', v)}
                  multiline
                  numberOfLines={3}
                  style={[inputStyle, { height: 72, paddingTop: 12, textAlignVertical: 'top' }]}
                />
              </View>
            </View>
          );
        })}

        <View style={{ marginTop: 28, gap: 12 }}>
          <TouchableOpacity
            onPress={handleSaveDraft}
            disabled={saving}
            style={{ height: 52, borderRadius: 16, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' }}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>Save Draft</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleComplete}
            disabled={saving}
            style={{ height: 52, borderRadius: 16, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>Complete Results</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}
