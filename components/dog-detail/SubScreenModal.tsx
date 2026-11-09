import React, { ReactNode } from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

export default function SubScreenModal({ visible, onClose, children }: Props) {
  const { theme } = useTheme();
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>{children}</View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
