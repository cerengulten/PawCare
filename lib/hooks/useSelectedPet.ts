import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dog } from '../../types';

const STORAGE_KEY = '@pawcare/selected_pet_id';

export function useSelectedPet(dogs: Dog[], userId?: string | null) {
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const storageKey = userId ? `@bisco/selected_pet_id_${userId}` : STORAGE_KEY;

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(storageKey);
      setSelectedDogId(stored);
      setLoading(false);
    })();
  }, [storageKey]);

  useEffect(() => {
    if (loading || dogs.length === 0) return;
    const stillExists = selectedDogId && dogs.some(d => d.id === selectedDogId);
    if (!stillExists) selectDog(dogs[0].id);
  }, [loading, dogs, selectedDogId]);

  async function selectDog(id: string) {
    setSelectedDogId(id);
    await AsyncStorage.setItem(storageKey, id);
  }

  return { selectedDogId, selectDog, loading };
}
