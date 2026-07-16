import { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useDogs } from '../lib/hooks/useDogs';
import { useProfile } from '../lib/hooks/useProfile';
import { Dog } from '../types';
import DogCard from '../components/DogCard';
import PetFormScreen from './PetFormScreen';
import DogDetailScreen from './DogDetailScreen';

type Props = {
  session: Session;
};

export default function HomeScreen({ session }: Props) {
  const { dogs, loading, addDog, updateDog } = useDogs();
  const { profile } = useProfile();
  const [mode, setMode] = useState<'list' | 'form' | 'detail'>('list');
  const [editingDog, setEditingDog] = useState<Dog | null>(null);
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const selectedDog = selectedDogId ? dogs.find((d) => d.id === selectedDogId) ?? null : null;

  if (mode === 'detail' && selectedDog) {
    return (
      <DogDetailScreen
        dog={selectedDog}
        onEdit={() => {
          setEditingDog(selectedDog);
          setMode('form');
        }}
        onBack={() => {
          setSelectedDogId(null);
          setMode('list');
        }}
      />
    );
  }

  if (mode === 'form') {
    return (
      <PetFormScreen
        dog={editingDog}
        addDog={addDog}
        updateDog={updateDog}
        onDone={() => {
          setMode(selectedDog ? 'detail' : 'list');
          setEditingDog(null);
        }}
        onCancel={() => {
          setMode(selectedDog ? 'detail' : 'list');
          setEditingDog(null);
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🐾 PawCare</Text>
      <Text style={styles.subtitle}>Hi {profile?.full_name ?? 'there'}, welcome back!</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          setEditingDog(null);
          setMode('form');
        }}
      >
        <Text style={styles.buttonText}>+ Add dog</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator color="#5C3D22" style={styles.loading} />
      ) : (
        <FlatList
          data={dogs}
          keyExtractor={(d) => d.id}
          renderItem={({ item }) => (
            <DogCard
              dog={item}
              onPress={() => {
                setSelectedDogId(item.id);
                setMode('detail');
              }}
            />
          )}
          ListEmptyComponent={<Text style={styles.subtitle}>No dogs yet. Add one!</Text>}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      )}

      <TouchableOpacity style={styles.signOutButton} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#5C3D22',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#8B6343',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#5C3D22',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loading: {
    marginTop: 24,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  signOutButton: {
    alignItems: 'center',
    padding: 12,
  },
  signOutText: {
    color: '#8B6343',
    fontSize: 14,
  },
});
