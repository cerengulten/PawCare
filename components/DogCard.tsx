import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Dog } from '../types';

type Props = {
  dog: Dog;
  onPress: () => void;
};

export default function DogCard({ dog, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {dog.photo_url ? (
        <Image source={{ uri: dog.photo_url }} style={styles.photo} />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Text style={styles.emoji}>🐾</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name}>{dog.name}</Text>
        {dog.breed ? <Text style={styles.meta}>{dog.breed}</Text> : null}
        {dog.weight_kg != null ? <Text style={styles.meta}>{dog.weight_kg} kg</Text> : null}
      </View>
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
  photo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
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
});
