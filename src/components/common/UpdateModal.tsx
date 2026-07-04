import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Dimensions,
  Modal,
} from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';

interface UpdateModalProps {
  visible: boolean;
  currentVersion: string;
  latestVersion: string;
  onClose: () => void;
}

const { width } = Dimensions.get('window');
const APP_STORE_URL = 'itms-apps://itunes.apple.com/app/id6781326899';

export const UpdateModal: React.FC<UpdateModalProps> = ({
  visible,
  currentVersion,
  latestVersion,
  onClose,
}) => {
  const { isDark, colors } = useAppTheme();

  const handleUpdate = () => {
    Linking.openURL(APP_STORE_URL);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView
        intensity={isDark ? 40 : 20}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(255,155,122,0.14)' : 'rgba(255,122,89,0.08)' }]}>
            <Ionicons name="rocket" size={48} color={colors.primary} />
          </View>
          
          <Text style={[styles.title, { color: colors.text }]}>
            发现新版本
          </Text>
          
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            当前版本: {currentVersion}{'\n'}最新版本: {latestVersion}{'\n'}快去更新体验最新功能吧！
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5' }]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
                稍后再说
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.updateButton, { backgroundColor: colors.primary }]}
              onPress={handleUpdate}
            >
              <Text style={[styles.buttonText, { color: '#FFF', fontWeight: '600' }]}>
                立即更新
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  container: {
    width: Math.min(width - 48, 340),
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    marginRight: 12,
  },
  updateButton: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});