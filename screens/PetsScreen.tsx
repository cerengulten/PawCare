import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useDogs } from '../lib/hooks/useDogs';
import { useSelectedPet } from '../lib/hooks/useSelectedPet';
import { Dog } from '../types';
import PetFormScreen from './PetFormScreen';
import DogDetailScreen from './DogDetailScreen';
import TabTour from '../components/TabTour';
import { RootTabParamList } from './AppTabs';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';

type DogsState = ReturnType<typeof useDogs>;
type SelectedPetState = ReturnType<typeof useSelectedPet>;

type Props = BottomTabScreenProps<RootTabParamList, 'Pets'> & {
  session: Session;
  dogs: DogsState['dogs'];
  dogsLoading: DogsState['loading'];
  addDog: DogsState['addDog'];
  updateDog: DogsState['updateDog'];
  deleteDog: DogsState['deleteDog'];
  selectedDogId: SelectedPetState['selectedDogId'];
  selectDog: SelectedPetState['selectDog'];
};

export default function PetsScreen({
  route,
  navigation,
  dogs,
  dogsLoading: loading,
  addDog,
  updateDog,
  deleteDog,
  selectedDogId,
  selectDog,
}: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [mode, setMode] = useState<'switch' | 'form'>('switch');
  const [editingDog, setEditingDog] = useState<Dog | null>(null);
  const switcherRef = useRef<View>(null);
  const habitsSectionRef = useRef<View>(null);
  const addHabitRef = useRef<View>(null);

  useEffect(() => {
    const paramDogId = route.params?.dogId;
    if (paramDogId) {
      selectDog(paramDogId);
      navigation.setParams({ dogId: undefined });
    }
  }, [route.params?.dogId]);

  const selectedDog = selectedDogId ? dogs.find(d => d.id === selectedDogId) ?? null : null;

  if (mode === 'form') {
    return (
      <PetFormScreen
        dog={editingDog}
        addDog={addDog}
        updateDog={updateDog}
        onDone={() => setMode('switch')}
        onCancel={() => setMode('switch')}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View ref={switcherRef} collapsable={false} style={styles.switcherRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcherContent}>
          {dogs.map(d => {
            const active = d.id === selectedDogId;
            return (
              <TouchableOpacity
                key={d.id}
                style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}
                onPress={() => selectDog(d.id)}
              >
                {d.photo_url ? (
                  <Image source={{ uri: d.photo_url }} style={styles.pillPhoto} />
                ) : (
                  <Text style={styles.pillEmoji}>🐾</Text>
                )}
                <Text style={[styles.pillText, active ? styles.pillTextActive : styles.pillTextInactive]} numberOfLines={1}>
                  {d.name}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[styles.pill, styles.pillInactive, styles.addPill]}
            onPress={() => { setEditingDog(null); setMode('form'); }}
          >
            <Text style={styles.addPillText}>＋</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.primary} style={styles.loading} />
      ) : selectedDog ? (
        <DogDetailScreen
          dog={selectedDog}
          updateDog={updateDog}
          onEdit={() => { setEditingDog(selectedDog); setMode('form'); }}
          onDelete={async () => { await deleteDog(selectedDog.id); }}
          tourRefs={{ habitsSectionRef, addHabitRef }}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{t('pets.noPetsYet')}</Text>
          <Text style={styles.emptyText}>{t('pets.noPetsSubtitle')}</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => { setEditingDog(null); setMode('form'); }}
          >
            <Text style={styles.emptyButtonText}>{t('pets.addFirstPet')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <TabTour
        tab="pets"
        enabled={!loading && !!selectedDog}
        steps={[
          { targetRef: switcherRef, position: 'bottom', title: t('tour.pets.s1Title'), body: t('tour.pets.s1Body') },
          { targetRef: habitsSectionRef, position: 'top', title: t('tour.pets.s2Title'), body: t('tour.pets.s2Body') },
          { targetRef: addHabitRef, position: 'bottom', title: t('tour.pets.s3Title'), body: t('tour.pets.s3Body') },
        ]}
      />
    </View>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    switcherRow: {
      paddingTop: 56,
      paddingBottom: 8,
    },
    switcherContent: {
      paddingHorizontal: 16,
      gap: 6,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 7,
      paddingHorizontal: 14,
      borderRadius: 20,
    },
    pillActive: {
      backgroundColor: theme.primary,
    },
    pillInactive: {
      backgroundColor: theme.surface,
      borderWidth: 0.5,
      borderColor: theme.border,
    },
    pillPhoto: {
      width: 16,
      height: 16,
      borderRadius: 8,
    },
    pillEmoji: {
      fontSize: 13,
    },
    pillText: {
      fontSize: 13,
      fontWeight: '500',
      maxWidth: 100,
    },
    pillTextActive: {
      color: 'white',
    },
    pillTextInactive: {
      color: theme.textDark,
    },
    addPill: {
      paddingHorizontal: 12,
    },
    addPillText: {
      color: theme.primary,
      fontSize: 14,
      fontWeight: '700',
    },
    loading: {
      marginTop: 40,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.textDark,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 13,
      color: theme.textMuted,
      textAlign: 'center',
      marginBottom: 20,
    },
    emptyButton: {
      backgroundColor: theme.moodSelBg,
      borderRadius: 20,
      paddingVertical: 10,
      paddingHorizontal: 20,
    },
    emptyButtonText: {
      color: theme.primary,
      fontSize: 14,
      fontWeight: '600',
    },
  });
}
