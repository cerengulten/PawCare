import React, { ReactNode } from 'react';
import { Modal, View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { useKeyboardHeight } from '../../lib/hooks/useKeyboardHeight';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

export default function SubScreenModal({ visible, onClose, children }: Props) {
  const { theme } = useTheme();
  const keyboardHeight = useKeyboardHeight();
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: theme.background },
          Platform.OS === 'android' ? { paddingBottom: keyboardHeight } : null,
        ]}
      >
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
