import { Ionicons } from '@expo/vector-icons';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';

type ToastType = 'success' | 'error' | 'info' | 'loading';

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (options: ToastOptions | string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  loading: (message: string) => void;
  hide: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<ToastOptions>({ message: '', type: 'info' });
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible && options.type === 'loading') {
      Animated.loop(
        Animated.timing(rotateValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateValue.stopAnimation();
      rotateValue.setValue(0);
    }
  }, [options.type, rotateValue, visible]);

  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });
  }, [opacity, translateY]);

  const showToast = useCallback(
    (nextOptions: ToastOptions | string) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const parsedOptions =
        typeof nextOptions === 'string'
          ? { message: nextOptions, type: 'info' as ToastType }
          : nextOptions;
      const type = parsedOptions.type || 'info';
      const duration = parsedOptions.duration || (type === 'loading' ? 0 : 2500);

      setOptions({ ...parsedOptions, type });
      setVisible(true);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      if (duration > 0) {
        timerRef.current = setTimeout(() => {
          hide();
        }, duration);
      }
    },
    [hide, opacity, translateY]
  );

  const getIcon = () => {
    switch (options.type) {
      case 'success':
        return <Ionicons name="checkmark-circle" size={24} color="#10B981" style={styles.icon} />;
      case 'error':
        return <Ionicons name="close-circle" size={24} color="#EF4444" style={styles.icon} />;
      case 'loading': {
        const spin = rotateValue.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        });

        return (
          <Animated.View style={[styles.icon, { transform: [{ rotate: spin }] }]}>
            <Ionicons name="sync" size={24} color="#3B82F6" />
          </Animated.View>
        );
      }
      case 'info':
      default:
        return <Ionicons name="information-circle" size={24} color="#3B82F6" style={styles.icon} />;
    }
  };

  return (
    <ToastContext.Provider
      value={{
        showToast,
        success: (message) => showToast({ message, type: 'success' }),
        error: (message) => showToast({ message, type: 'error' }),
        info: (message) => showToast({ message, type: 'info' }),
        loading: (message) => showToast({ message, type: 'loading' }),
        hide,
      }}
    >
      {children}
      {visible ? (
        <View
          style={[styles.container, { top: Math.max(insets.top, 20) + 10 }]}
          pointerEvents="none"
        >
          <Animated.View
            style={[
              styles.toast,
              {
                backgroundColor: isDark ? colors.surface : '#FFFFFF',
                opacity,
                transform: [{ translateY }],
              },
            ]}
          >
            {getIcon()}
            <Text style={[styles.message, { color: colors.text }]}>{options.message}</Text>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    elevation: 99999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    maxWidth: '85%',
  },
  icon: {
    marginRight: 8,
  },
  message: {
    fontSize: 15,
    fontWeight: '500',
  },
});
