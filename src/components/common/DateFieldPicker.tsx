import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';

interface DateFieldPickerProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  modalTitle?: string;
  disabled?: boolean;
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(value?: string) {
  if (!value) {
    return new Date();
  }

  const normalized = value.replace(/\./g, '-').replace(/\//g, '-');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

const DateFieldPicker: React.FC<DateFieldPickerProps> = ({
  label,
  value,
  onChange,
  placeholder = '选择日期',
  modalTitle = '选择日期',
  disabled = false,
}) => {
  const { colors, isDark } = useAppTheme();
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [tempDate, setTempDate] = React.useState(() => parseDate(value));

  React.useEffect(() => {
    if (showDatePicker) {
      setTempDate(parseDate(value));
    }
  }, [showDatePicker, value]);

  const pickerThemeVariant = (isDark ? 'dark' : 'light') as 'dark' | 'light';
  const pickerProps = {
    value: tempDate,
    mode: 'date' as const,
    themeVariant: pickerThemeVariant,
    locale: 'zh-CN',
  };

  const handleOpen = () => {
    if (disabled) {
      return;
    }

    setTempDate(parseDate(value));
    setShowDatePicker(true);
  };

  const handleClose = () => {
    setTempDate(parseDate(value));
    setShowDatePicker(false);
  };

  const handleConfirm = () => {
    onChange(formatDate(tempDate));
    setShowDatePicker(false);
  };

  const handleIOSChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const handleAndroidChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }

    if (selectedDate) {
      onChange(formatDate(selectedDate));
    }

    setShowDatePicker(false);
  };

  const renderDatePicker = () => {
    if (!showDatePicker) {
      return null;
    }

    if (Platform.OS === 'android') {
      return (
        <DateTimePicker
          {...pickerProps}
          display="default"
          onChange={handleAndroidChange}
        />
      );
    }

    return (
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>{modalTitle}</Text>
            <View style={styles.pickerBody}>
              <DateTimePicker
                {...pickerProps}
                display="spinner"
                onChange={handleIOSChange}
                style={styles.pickerControl}
              />
            </View>
            <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
              <Pressable
                onPress={handleClose}
                style={[
                  styles.actionButton,
                  styles.cancelButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FBFF',
                  },
                ]}
              >
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>取消</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirm}
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.confirmText}>确定</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={handleOpen}
        style={[
          styles.dateButton,
          {
            borderColor: colors.border,
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FBFF',
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        <Text style={[styles.dateButtonIcon, { color: colors.textSecondary }]}>日期</Text>
        <Text style={[styles.dateButtonText, { color: value ? colors.text : colors.textSecondary }]}>
          {value || placeholder}
        </Text>
      </Pressable>
      {renderDatePicker()}
    </>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  dateButton: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateButtonIcon: {
    fontSize: 13,
    fontWeight: '700',
  },
  dateButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  pickerBody: {
    minHeight: 216,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  pickerControl: {
    width: '100%',
    height: 216,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 14,
  },
  actionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});

export default DateFieldPicker;
