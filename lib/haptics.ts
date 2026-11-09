import { Platform, Vibration } from 'react-native';

/**
 * Safe tactile haptic wrappers with graceful fallback for OTA clients
 * where the native ExpoHaptics module may not yet be compiled into the binary.
 */
export async function triggerLightHaptic(): Promise<void> {
  try {
    const Haptics = await import('expo-haptics');
    if (Haptics && typeof Haptics.impactAsync === 'function') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
  } catch {
    // Fallback if native module is unavailable in current OTA runtime
    if (Platform.OS === 'android') {
      try {
        Vibration.vibrate(10);
      } catch {}
    }
  }
}

export async function triggerSuccessHaptic(): Promise<void> {
  try {
    const Haptics = await import('expo-haptics');
    if (Haptics && typeof Haptics.notificationAsync === 'function') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
  } catch {
    if (Platform.OS === 'android') {
      try {
        Vibration.vibrate([0, 15, 40, 20]);
      } catch {}
    }
  }
}
