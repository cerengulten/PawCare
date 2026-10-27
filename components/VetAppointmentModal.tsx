import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
  Platform,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Dog } from '../types';
import { VetAppointment, getAppointmentDateTime } from '../lib/vetAppointments';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';

type Props = {
  visible: boolean;
  appointment?: VetAppointment | null;
  dogs: Dog[];
  selectedDogId?: string | null;
  onClose: () => void;
  onSave: (data: Omit<VetAppointment, 'id' | 'createdAt' | 'status'>) => Promise<any>;
  onDelete?: (id: string) => Promise<void>;
};

const COMMON_TYPES = [
  'Wellness Checkup',
  'Vaccination',
  'Dental Cleaning',
  'Bloodwork',
  'Follow-up Exam',
  'Skin / Allergy',
  'Spay / Neuter',
];

export default function VetAppointmentModal({
  visible,
  appointment,
  dogs,
  selectedDogId,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [petId, setPetId] = useState<string>(selectedDogId || dogs[0]?.id || '');
  const [title, setTitle] = useState<string>('Wellness Checkup');
  const [clinicName, setClinicName] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [timeStr, setTimeStr] = useState<string>('10:00');
  const [notes, setNotes] = useState<string>('');
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // iOS picker state
  const [showIosDatePicker, setShowIosDatePicker] = useState(false);
  const [showIosTimePicker, setShowIosTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  useEffect(() => {
    if (appointment) {
      setPetId(appointment.petId);
      setTitle(appointment.title);
      setClinicName(appointment.clinicName);
      setDateStr(appointment.appointmentDate);
      setTimeStr(appointment.appointmentTime);
      setNotes(appointment.notes || '');
      setReminderEnabled(appointment.reminderEnabled);
    } else {
      const defaultPet = dogs.find((d) => d.id === selectedDogId) || dogs[0];
      setPetId(defaultPet?.id || '');
      setTitle('Wellness Checkup');
      setClinicName('');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 3);
      const y = tomorrow.getFullYear();
      const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const d = String(tomorrow.getDate()).padStart(2, '0');
      setDateStr(`${y}-${m}-${d}`);
      setTimeStr('10:00');
      setNotes('');
      setReminderEnabled(true);
    }
  }, [appointment, visible, selectedDogId, dogs]);

  const selectedDog = dogs.find((d) => d.id === petId) || dogs[0];

  const openDatePicker = () => {
    const current = dateStr ? new Date(dateStr) : new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        onChange: (event: DateTimePickerEvent, selected?: Date) => {
          if (event.type === 'set' && selected) {
            const y = selected.getFullYear();
            const m = String(selected.getMonth() + 1).padStart(2, '0');
            const d = String(selected.getDate()).padStart(2, '0');
            setDateStr(`${y}-${m}-${d}`);
          }
        },
      });
    } else {
      setTempDate(current);
      setShowIosDatePicker(true);
    }
  };

  const openTimePicker = () => {
    const [h, m] = (timeStr || '10:00').split(':').map(Number);
    const current = new Date();
    current.setHours(h || 10, m || 0, 0, 0);

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'time',
        is24Hour: true,
        onChange: (event: DateTimePickerEvent, selected?: Date) => {
          if (event.type === 'set' && selected) {
            const hours = String(selected.getHours()).padStart(2, '0');
            const minutes = String(selected.getMinutes()).padStart(2, '0');
            setTimeStr(`${hours}:${minutes}`);
          }
        },
      });
    } else {
      setTempDate(current);
      setShowIosTimePicker(true);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t('common.error') || 'Required', 'Please enter a visit reason or title.');
      return;
    }
    if (!dateStr.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      Alert.alert(t('common.error') || 'Required', 'Please select a valid date (YYYY-MM-DD).');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        petId: selectedDog?.id || 'pet',
        petName: selectedDog?.name || 'My Pet',
        title: title.trim(),
        clinicName: clinicName.trim() || 'Veterinary Clinic',
        appointmentDate: dateStr,
        appointmentTime: timeStr || '10:00',
        notes: notes.trim() || null,
        reminderEnabled,
      });
      onClose();
    } catch (err: any) {
      Alert.alert(t('common.error') || 'Error', err?.message || 'Could not save appointment.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!appointment || !onDelete) return;
    Alert.alert(
      t('vetAppointments.deleteAppointment') || 'Cancel Appointment',
      t('vetAppointments.deleteConfirm') || 'Are you sure you want to remove this appointment reminder?',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('common.delete') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await onDelete(appointment.id);
              onClose();
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {appointment
                ? t('vetAppointments.editTitle') || 'Edit Vet Visit'
                : t('vetAppointments.scheduleTitle') || 'Schedule Vet Visit'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Pet Selector if multiple dogs */}
            {dogs.length > 1 ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('vetAppointments.petLabel') || 'Pet'}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.petStrip}>
                  {dogs.map((dog) => {
                    const isSelected = dog.id === petId;
                    return (
                      <TouchableOpacity
                        key={dog.id}
                        onPress={() => setPetId(dog.id)}
                        style={[styles.petChip, isSelected && styles.petChipSelected]}
                      >
                        <Text style={[styles.petChipText, isSelected && styles.petChipTextSelected]}>
                          🐾 {dog.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {/* Visit Type Chips */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('vetAppointments.visitTypeLabel') || 'Visit Reason'}</Text>
              <View style={styles.chipsWrap}>
                {COMMON_TYPES.map((type) => {
                  const isSelected = title === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setTitle(type)}
                      style={[styles.typeChip, isSelected && styles.typeChipSelected]}
                    >
                      <Text style={[styles.typeChipText, isSelected && styles.typeChipTextSelected]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="or custom reason..."
                placeholderTextColor={theme.textMuted}
                style={styles.textInput}
              />
            </View>

            {/* Clinic / Vet Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('vetAppointments.clinicLabel') || 'Clinic or Doctor'}</Text>
              <TextInput
                value={clinicName}
                onChangeText={setClinicName}
                placeholder="e.g. City Animal Hospital, Dr. Roberts"
                placeholderTextColor={theme.textMuted}
                style={styles.textInput}
              />
            </View>

            {/* Date & Time Row */}
            <View style={styles.rowTwoCol}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>{t('vetAppointments.dateLabel') || 'Date'}</Text>
                <TouchableOpacity style={styles.pickerBtn} onPress={openDatePicker}>
                  <Text style={styles.pickerBtnText}>📅 {dateStr || 'Select Date'}</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>{t('vetAppointments.timeLabel') || 'Time'}</Text>
                <TouchableOpacity style={styles.pickerBtn} onPress={openTimePicker}>
                  <Text style={styles.pickerBtnText}>⏰ {timeStr || '10:00'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* iOS Date Picker Inline Modal */}
            {Platform.OS === 'ios' && showIosDatePicker ? (
              <View style={styles.iosPickerWrap}>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="inline"
                  onChange={(_, d) => {
                    if (d) {
                      setTempDate(d);
                      const y = d.getFullYear();
                      const m = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      setDateStr(`${y}-${m}-${day}`);
                    }
                  }}
                />
                <TouchableOpacity
                  style={styles.iosPickerDone}
                  onPress={() => setShowIosDatePicker(false)}
                >
                  <Text style={styles.iosPickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* iOS Time Picker Inline Modal */}
            {Platform.OS === 'ios' && showIosTimePicker ? (
              <View style={styles.iosPickerWrap}>
                <DateTimePicker
                  value={tempDate}
                  mode="time"
                  display="spinner"
                  onChange={(_, d) => {
                    if (d) {
                      setTempDate(d);
                      const hours = String(d.getHours()).padStart(2, '0');
                      const minutes = String(d.getMinutes()).padStart(2, '0');
                      setTimeStr(`${hours}:${minutes}`);
                    }
                  }}
                />
                <TouchableOpacity
                  style={styles.iosPickerDone}
                  onPress={() => setShowIosTimePicker(false)}
                >
                  <Text style={styles.iosPickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Reminder Toggle */}
            <View style={styles.reminderRow}>
              <View style={styles.reminderInfo}>
                <Text style={styles.reminderTitle}>
                  {t('vetAppointments.remindMe') || 'Remind me 2 hours before'}
                </Text>
                <Text style={styles.reminderSubtitle}>
                  Device push notification before appointment
                </Text>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={setReminderEnabled}
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            </View>

            {/* Notes */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('vetAppointments.notesLabel') || 'Notes (Optional)'}</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Questions to ask vet, fasting instructions, vaccination records..."
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={3}
                style={[styles.textInput, styles.notesInput]}
              />
            </View>

            {/* Actions */}
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.btnDisabled]}
              disabled={saving}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={styles.saveBtnText}>
                {saving
                  ? 'Saving…'
                  : appointment
                  ? t('common.save') || 'Save Changes'
                  : t('vetAppointments.saveAppointment') || 'Schedule Appointment'}
              </Text>
            </TouchableOpacity>

            {appointment && onDelete ? (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDelete}
                activeOpacity={0.8}
              >
                <Text style={styles.deleteBtnText}>
                  {t('vetAppointments.deleteAppointment') || 'Cancel Appointment'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingTop: 12,
      maxHeight: '90%',
    },
    handleBar: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.border,
      alignSelf: 'center',
      marginBottom: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.textDark,
    },
    closeBtn: {
      fontSize: 18,
      color: theme.textMuted,
      padding: 4,
    },
    scroll: {
      marginBottom: 16,
    },
    fieldGroup: {
      marginBottom: 16,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    petStrip: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    petChip: {
      backgroundColor: theme.background,
      borderWidth: 0.5,
      borderColor: theme.border,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginRight: 8,
    },
    petChipSelected: {
      backgroundColor: theme.primaryLight,
      borderColor: theme.primary,
    },
    petChipText: {
      fontSize: 13,
      color: theme.textMuted,
    },
    petChipTextSelected: {
      color: theme.primary,
      fontWeight: '600',
    },
    chipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 8,
    },
    typeChip: {
      backgroundColor: theme.background,
      borderWidth: 0.5,
      borderColor: theme.border,
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    typeChipSelected: {
      backgroundColor: theme.primaryLight,
      borderColor: theme.primary,
    },
    typeChipText: {
      fontSize: 12,
      color: theme.textDark,
    },
    typeChipTextSelected: {
      color: theme.primary,
      fontWeight: '600',
    },
    textInput: {
      backgroundColor: theme.background,
      borderWidth: 0.5,
      borderColor: theme.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: theme.textDark,
    },
    notesInput: {
      minHeight: 72,
      textAlignVertical: 'top',
    },
    rowTwoCol: {
      flexDirection: 'row',
      gap: 12,
    },
    pickerBtn: {
      backgroundColor: theme.background,
      borderWidth: 0.5,
      borderColor: theme.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
    },
    pickerBtnText: {
      fontSize: 14,
      color: theme.textDark,
      fontWeight: '500',
    },
    iosPickerWrap: {
      backgroundColor: theme.background,
      borderRadius: 12,
      padding: 10,
      marginBottom: 16,
    },
    iosPickerDone: {
      alignSelf: 'flex-end',
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    iosPickerDoneText: {
      color: theme.primary,
      fontWeight: '600',
    },
    reminderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      marginBottom: 16,
      borderTopWidth: 0.5,
      borderBottomWidth: 0.5,
      borderColor: theme.divider,
    },
    reminderInfo: {
      flex: 1,
      paddingRight: 10,
    },
    reminderTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.textDark,
    },
    reminderSubtitle: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 2,
    },
    saveBtn: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
      marginTop: 6,
    },
    btnDisabled: {
      opacity: 0.6,
    },
    saveBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '600',
    },
    deleteBtn: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    deleteBtnText: {
      color: theme.allergenText,
      fontSize: 14,
      fontWeight: '600',
    },
  });
}
