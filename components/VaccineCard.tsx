import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { VaccineRecord } from '../types';

type Props = {
  vaccine: VaccineRecord;
  isOverdue: boolean;
  onPress: () => void;
};

export default function VaccineCard({ vaccine, isOverdue, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.photoPlaceholder}>
        <Text style={styles.emoji}>💉</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{vaccine.vaccine_name}</Text>
        <Text style={styles.meta}>Due {vaccine.next_due_date}</Text>
      </View>
      {isOverdue ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Overdue</Text>
        </View>
      ) : (
        <Text style={styles.upcomingText}>Upcoming</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DEC9AF',
  },
  photoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    backgroundColor: '#FFF8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 28,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5C3D22',
  },
  meta: {
    fontSize: 13,
    color: '#8B6343',
  },
  badge: {
    backgroundColor: '#B04838',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  upcomingText: {
    color: '#8B6343',
    fontSize: 12,
  },
});
