import { View, Text, StyleSheet } from 'react-native';

export default function ComingSoonScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🚧</Text>
      <Text style={styles.title}>Coming soon</Text>
      <Text style={styles.subtitle}>
        Chat with an AI assistant and find nearby vets — coming in a future update.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5C3D22',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#8B6343',
    textAlign: 'center',
  },
});
