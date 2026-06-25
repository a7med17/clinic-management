import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  DoctorAppointment,
  Prescription,
  PrescriptionItem,
  finalizeDoctorPrescription,
  getDoctorAppointment,
  getDoctorAppointmentPrescription,
  saveDoctorPrescription,
} from '../../services/doctorService';
import { getMedicines, Medicine } from '../../services/pharmacyService';
import { Content, Header, ListRow, Screen, SectionHeader, colors } from '../../ui/ClinicComponents';

type ItemForm = {
  key: string;
  medicine_id: string | null;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
};

let keyCounter = 0;
const nextKey = () => `rx_${++keyCounter}_${Date.now()}`;

const emptyItem = (): ItemForm => ({
  key: nextKey(),
  medicine_id: null,
  medicine_name: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: '',
});

export default function PrescriptionScreen({ navigation, route }: any) {
  const appointmentId = route.params?.appointmentId;
  const [appointment, setAppointment] = useState<DoctorAppointment | null>(null);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [items, setItems] = useState<ItemForm[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const [searchResults, setSearchResults] = useState<Record<string, Medicine[]>>({});
  const [searchingItems, setSearchingItems] = useState<Record<string, boolean>>({});
  const searchTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const finalized = prescription?.status === 'Finalized';

  const load = useCallback(async () => {
    if (!appointmentId) {
      setLoading(false);
      setIsError(true);
      setMessage('Appointment ID is required.');
      return;
    }
    try {
      setLoading(true);
      setMessage('');
      setIsError(false);

      const [appt, rx] = await Promise.all([
        getDoctorAppointment(appointmentId),
        getDoctorAppointmentPrescription(appointmentId).catch(() => null),
      ]);
      setAppointment(appt);

      if (rx) {
        setPrescription(rx);
        setItems(
          (rx.prescription_items || []).map((item: PrescriptionItem) => ({
            key: nextKey(),
            medicine_id: item.medicine_id || null,
            medicine_name: item.medicine_name,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            instructions: item.instructions || '',
          }))
        );
        setNotes(rx.notes || '');
      } else {
        setPrescription(null);
        setItems([]);
        setNotes('');
      }
    } catch (err: any) {
      console.error('[PrescriptionScreen] Load error:', err.response?.data || err.message);
      setIsError(true);
      setMessage(err.response?.data?.message || 'Unable to load prescription data.');
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      Object.values(searchTimers.current).forEach(clearTimeout);
    };
  }, []);

  const handleMedicineSearch = (itemKey: string, query: string) => {
    setItems((prev) =>
      prev.map((item) => (item.key === itemKey ? { ...item, medicine_name: query, medicine_id: null } : item))
    );

    if (searchTimers.current[itemKey]) clearTimeout(searchTimers.current[itemKey]);
    setSearchResults((prev) => ({ ...prev, [itemKey]: [] }));

    if (!query.trim()) return;

    setSearchingItems((prev) => ({ ...prev, [itemKey]: true }));
    searchTimers.current[itemKey] = setTimeout(async () => {
      try {
        const results = await getMedicines({ search: query.trim() });
        setSearchResults((prev) => ({ ...prev, [itemKey]: results }));
      } catch {
        setSearchResults((prev) => ({ ...prev, [itemKey]: [] }));
      } finally {
        setSearchingItems((prev) => ({ ...prev, [itemKey]: false }));
      }
    }, 350);
  };

  const selectMedicine = (itemKey: string, med: Medicine) => {
    setItems((prev) =>
      prev.map((item) => (item.key === itemKey ? { ...item, medicine_name: med.name, medicine_id: med.id } : item))
    );
    setSearchResults((prev) => ({ ...prev, [itemKey]: [] }));
    if (searchTimers.current[itemKey]) clearTimeout(searchTimers.current[itemKey]);
  };

  const updateItem = (itemKey: string, field: keyof ItemForm, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.key === itemKey ? { ...item, [field]: value } : item))
    );
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const removeItem = (itemKey: string) => {
    setItems((prev) => prev.filter((item) => item.key !== itemKey));
    setSearchResults((prev) => {
      const next = { ...prev };
      delete next[itemKey];
      return next;
    });
  };

  const validate = () => {
    if (!appointmentId) return 'Appointment ID is required.';
    if (items.length === 0) return 'Add at least one medicine item.';
    for (const item of items) {
      if (!item.medicine_name.trim()) return 'Each item must have a medicine name.';
      if (!item.dosage.trim()) return 'Each item must have a dosage.';
      if (!item.frequency.trim()) return 'Each item must have a frequency.';
      if (!item.duration.trim()) return 'Each item must have a duration.';
    }
    return '';
  };

  const submit = async (finalize: boolean) => {
    const validationMessage = validate();
    if (validationMessage) {
      setIsError(true);
      setMessage(validationMessage);
      return;
    }

    try {
      setSaving(true);
      setMessage('');
      setIsError(false);

      const payload = {
        notes,
        items: items.map((item) => ({
          medicine_id: item.medicine_id,
          medicine_name: item.medicine_name.trim(),
          dosage: item.dosage.trim(),
          frequency: item.frequency.trim(),
          duration: item.duration.trim(),
          instructions: item.instructions.trim(),
        })),
      };

      let rx: Prescription;
      if (finalize) {
        const draft = await saveDoctorPrescription(appointmentId, payload);
        rx = await finalizeDoctorPrescription(draft.id);
      } else {
        rx = await saveDoctorPrescription(appointmentId, payload);
      }

      setPrescription(rx);
      setItems(
        (rx.prescription_items || []).map((item: PrescriptionItem) => ({
          key: nextKey(),
          medicine_id: item.medicine_id || null,
          medicine_name: item.medicine_name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions || '',
        }))
      );
      setNotes(rx.notes || '');
      setMessage(finalize ? 'Prescription finalized.' : 'Prescription saved.');
    } catch (err: any) {
      console.error('[PrescriptionScreen] Save error:', err.response?.data || err.message);
      setIsError(true);
      setMessage(err.response?.data?.message || 'Unable to save prescription.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Content>
        <Header title="Prescription" subtitle={appointment?.patients?.name || 'Doctor workflow'} navigation={navigation} />
        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={colors.teal} />
            <Text style={styles.stateText}>Loading prescription...</Text>
          </View>
        ) : null}
        {message && isError ? (
          <TouchableOpacity activeOpacity={0.82} style={styles.stateCard} onPress={load}>
            <Text style={styles.errorText}>{message}</Text>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        ) : null}
        {appointment ? (
          <>
            <SectionHeader title="Patient" />
            <ListRow title="Name" subtitle={appointment.patients?.name || 'Patient'} icon="person-outline" tone={colors.teal} />
            <ListRow title="Date" subtitle={new Date(appointment.appointment_date).toLocaleDateString()} icon="calendar-outline" tone={colors.blue} />
            <ListRow title="Status" subtitle={finalized ? 'Finalized' : 'Draft'} icon="pulse-outline" tone={finalized ? colors.green : colors.orange} />

            <SectionHeader title="Notes" />
            <TextInput
              editable={!finalized && !saving}
              multiline
              placeholder="Prescription notes (e.g. allergies, special instructions)"
              placeholderTextColor="#8b97a8"
              value={notes}
              onChangeText={setNotes}
              style={[styles.input, finalized && styles.disabledInput]}
            />

            <SectionHeader
              title="Medicine Items"
              action={!finalized ? 'Add Item' : undefined}
              onPress={!finalized ? addItem : undefined}
            />
            {items.map((item, index) => (
              <View key={item.key} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemLabel}>Item {index + 1}</Text>
                  {!finalized ? (
                    <TouchableOpacity onPress={() => removeItem(item.key)}>
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Medicine</Text>
                  <TextInput
                    editable={!finalized && !saving}
                    placeholder="Search or type medicine name"
                    placeholderTextColor="#8b97a8"
                    value={item.medicine_name}
                    onChangeText={(text) => handleMedicineSearch(item.key, text)}
                    style={[styles.input, finalized && styles.disabledInput]}
                  />
                  {searchResults[item.key]?.length > 0 ? (
                    <View style={styles.searchResults}>
                      {searchResults[item.key].map((med) => (
                        <TouchableOpacity
                          key={med.id}
                          style={styles.searchResultItem}
                          onPress={() => selectMedicine(item.key, med)}
                        >
                          <Text style={styles.searchResultText}>{med.name}</Text>
                          {med.price ? <Text style={styles.searchResultMeta}>${med.price}</Text> : null}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                  {searchingItems[item.key] && item.medicine_name.trim() ? (
                    <Text style={styles.searchingText}>Searching...</Text>
                  ) : null}
                </View>
                <View style={styles.inlineFields}>
                  <View style={styles.inlineField}>
                    <Text style={styles.label}>Dosage</Text>
                    <TextInput
                      editable={!finalized && !saving}
                      placeholder="e.g. 500mg"
                      placeholderTextColor="#8b97a8"
                      value={item.dosage}
                      onChangeText={(text) => updateItem(item.key, 'dosage', text)}
                      style={[styles.input, finalized && styles.disabledInput]}
                    />
                  </View>
                  <View style={styles.inlineField}>
                    <Text style={styles.label}>Frequency</Text>
                    <TextInput
                      editable={!finalized && !saving}
                      placeholder="e.g. 3x daily"
                      placeholderTextColor="#8b97a8"
                      value={item.frequency}
                      onChangeText={(text) => updateItem(item.key, 'frequency', text)}
                      style={[styles.input, finalized && styles.disabledInput]}
                    />
                  </View>
                </View>
                <View style={styles.inlineFields}>
                  <View style={styles.inlineField}>
                    <Text style={styles.label}>Duration</Text>
                    <TextInput
                      editable={!finalized && !saving}
                      placeholder="e.g. 5 days"
                      placeholderTextColor="#8b97a8"
                      value={item.duration}
                      onChangeText={(text) => updateItem(item.key, 'duration', text)}
                      style={[styles.input, finalized && styles.disabledInput]}
                    />
                  </View>
                  <View style={styles.inlineField}>
                    <Text style={styles.label}>Instructions</Text>
                    <TextInput
                      editable={!finalized && !saving}
                      placeholder="e.g. After meals"
                      placeholderTextColor="#8b97a8"
                      value={item.instructions}
                      onChangeText={(text) => updateItem(item.key, 'instructions', text)}
                      style={[styles.input, finalized && styles.disabledInput]}
                    />
                  </View>
                </View>
              </View>
            ))}
            {message && !isError ? <Text style={styles.successText}>{message}</Text> : null}
            {!finalized ? (
              <>
                <TouchableOpacity
                  disabled={saving || items.length === 0}
                  style={[styles.primaryButton, (saving || items.length === 0) && styles.disabledButton]}
                  onPress={() => submit(false)}
                >
                  <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save Draft'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={saving || items.length === 0}
                  style={[styles.outlineButton, (saving || items.length === 0) && styles.disabledButton]}
                  onPress={() => submit(true)}
                >
                  <Text style={styles.outlineButtonText}>Finalize</Text>
                </TouchableOpacity>
              </>
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
    marginBottom: 12,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  removeText: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '800',
  },
  fieldGroup: {
    gap: 6,
  },
  inlineFields: {
    flexDirection: 'row',
    gap: 10,
  },
  inlineField: {
    flex: 1,
    gap: 6,
  },
  label: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
  },
  input: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    color: colors.ink,
    backgroundColor: colors.surface,
    fontSize: 13,
  },
  disabledInput: {
    backgroundColor: colors.faint,
    color: colors.muted,
  },
  searchResults: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    overflow: 'hidden',
  },
  searchResultItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchResultText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  searchResultMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  searchingText: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
  },
  primaryButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
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
    marginBottom: 10,
  },
  outlineButtonText: {
    color: colors.ink,
    fontWeight: '900',
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.55,
  },
});
