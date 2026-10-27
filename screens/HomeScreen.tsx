import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, BackHandler, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useProfile } from '../lib/hooks/useProfile';
import { useDogs } from '../lib/hooks/useDogs';
import { useSelectedPet } from '../lib/hooks/useSelectedPet';
import { useOverallStreak } from '../lib/hooks/useOverallStreak';
import { useVetAppointments } from '../lib/hooks/useVetAppointments';
import { VetAppointment } from '../lib/vetAppointments';
import { getDailyVetTip } from '../lib/vetTips';
import PetSummaryCard from '../components/PetSummaryCard';
import NearbyVetsSection from '../components/NearbyVetsSection';
import VetAppointmentCard from '../components/VetAppointmentCard';
import VetAppointmentModal from '../components/VetAppointmentModal';
import TabTour from '../components/TabTour';
import { checkAndCreateStreakAlert } from '../lib/notificationService';
import ProfileScreen from './ProfileScreen';
import { RootTabParamList } from './AppTabs';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';

type ProfileState = ReturnType<typeof useProfile>;
type SelectedPetState = ReturnType<typeof useSelectedPet>;

type Props = BottomTabScreenProps<RootTabParamList, 'Home'> & {
  dogs: ReturnType<typeof useDogs>['dogs'];
  selectedDogId: SelectedPetState['selectedDogId'];
  profile: ProfileState['profile'];
  updateProfile: ProfileState['updateProfile'];
  checkUsernameAvailable: ProfileState['checkUsernameAvailable'];
};

export default function HomeScreen({ navigation, dogs, selectedDogId, profile, updateProfile, checkUsernameAvailable }: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { streak } = useOverallStreak();
  const [showProfile, setShowProfile] = useState(false);
  const [showVetModal, setShowVetModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<VetAppointment | null>(null);
  const [tipOffset, setTipOffset] = useState(0);

  const {
    nextAppointment,
    addAppointment,
    editAppointment,
    removeAppointment,
    markCompleted,
  } = useVetAppointments();

  const currentTip = useMemo(() => getDailyVetTip(tipOffset), [tipOffset]);

  const petStripRef = useRef<View>(null);
  const streakRef = useRef<View>(null);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (showVetModal) {
          setShowVetModal(false);
          setEditingAppointment(null);
          return true;
        }
        if (showProfile) {
          setShowProfile(false);
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [showProfile, showVetModal])
  );

  useEffect(() => {
    if (profile?.id) checkAndCreateStreakAlert(profile.id);
  }, [profile?.id]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('home.goodMorning') : hour < 18 ? t('home.goodAfternoon') : t('home.goodEvening');
  const firstName = profile?.full_name?.split(' ')[0] ?? t('home.there');
  const activeDog = dogs.find(d => d.id === selectedDogId) ?? dogs[0] ?? null;
  const activeDogName = activeDog?.name ?? t('home.yourPet');

  if (showProfile) {
    return (
      <ProfileScreen
        profile={profile}
        updateProfile={updateProfile}
        checkUsernameAvailable={checkUsernameAvailable}
        onDone={() => setShowProfile(false)}
        onCancel={() => setShowProfile(false)}
      />
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingLabel}>{greeting}</Text>
            <Text style={styles.greetingName}>{firstName} 👋</Text>
          </View>
          <TouchableOpacity onPress={() => setShowProfile(true)}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarEmoji}>🐾</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {dogs.length > 0 ? (
          <View ref={petStripRef} collapsable={false}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip}>
              {dogs.map(dog => (
                <PetSummaryCard
                  key={dog.id}
                  dog={dog}
                  onPress={() => navigation.navigate('Pets', { dogId: dog.id })}
                />
              ))}
            </ScrollView>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.emptyPetCard}
            onPress={() => navigation.navigate('Pets')}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyPetIcon}>🐾</Text>
            <View style={styles.emptyPetTextGroup}>
              <Text style={styles.emptyPetTitle}>{t('pets.addFirstPet')}</Text>
              <Text style={styles.emptyPetSubtitle}>{t('pets.noPetsSubtitle')}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}

        {streak > 0 ? (
          <View ref={streakRef} collapsable={false} style={styles.streakPill}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <View style={styles.streakTextGroup}>
              <Text style={styles.streakTitle}>{t('home.streakTitle', { count: streak })}</Text>
              <Text style={styles.streakSubtitle}>{t('home.streakSubtitle')}</Text>
            </View>
            <View style={styles.weekChip}>
              <Text style={styles.weekChipText}>{t('home.week', { count: Math.ceil(streak / 7) })}</Text>
            </View>
          </View>
        ) : null}

        {/* Vet Appointment Reminder Section */}
        <VetAppointmentCard
          appointment={nextAppointment}
          onSchedulePress={() => {
            setEditingAppointment(null);
            setShowVetModal(true);
          }}
          onEditPress={(appt) => {
            setEditingAppointment(appt);
            setShowVetModal(true);
          }}
          onCompletePress={(id) => markCompleted(id)}
        />

        <NearbyVetsSection
          dog={activeDog}
          onOpenVetFinder={() => navigation.navigate('More', { openVetFinder: true })}
        />

        <TouchableOpacity style={styles.aiBar} onPress={() => navigation.navigate('Chat', { fromLink: true })}>
          <Text style={styles.aiIcon}>💬</Text>
          <Text style={styles.aiText} numberOfLines={1}>{t('home.askNutrition', { name: activeDogName })}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {/* Curated Daily Vet Bite & Nutrition Tip (Replaces old 'Community Soon' placeholder) */}
        <View style={styles.tipCard}>
          <View style={styles.tipHeaderRow}>
            <View style={styles.tipBadge}>
              <Text style={styles.tipBadgeText}>
                {currentTip.emoji} {currentTip.badge}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setTipOffset((prev) => prev + 1)}
              style={styles.nextTipBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.nextTipText}>↻ Next tip</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.tipTitle}>{currentTip.title}</Text>
          <Text style={styles.tipBody}>{currentTip.body}</Text>

          <TouchableOpacity
            style={styles.tipAiRow}
            onPress={() => navigation.navigate('Chat', { fromLink: true })}
            activeOpacity={0.7}
          >
            <Text style={styles.tipAiText}>💬 Ask Bisco AI about this</Text>
            <Text style={styles.tipAiChevron}>›</Text>
          </TouchableOpacity>
        </View>

        <TabTour
          tab="home"
          enabled={dogs.length > 0}
          steps={[
            { targetRef: petStripRef, position: 'bottom', title: t('tour.home.s1Title'), body: t('tour.home.s1Body') },
            ...(streak > 0
              ? [{ targetRef: streakRef, position: 'bottom' as const, title: t('tour.home.s2Title'), body: t('tour.home.s2Body') }]
              : []),
          ]}
        />
      </ScrollView>

      {/* Vet Appointment Schedule & Edit Modal */}
      <VetAppointmentModal
        visible={showVetModal}
        appointment={editingAppointment}
        dogs={dogs}
        selectedDogId={selectedDogId}
        onClose={() => {
          setShowVetModal(false);
          setEditingAppointment(null);
        }}
        onSave={async (data) => {
          if (editingAppointment) {
            await editAppointment({ ...editingAppointment, ...data });
          } else {
            await addAppointment(data);
          }
        }}
        onDelete={async (id) => {
          await removeAppointment(id);
        }}
      />
    </>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 16,
      paddingTop: 56,
      paddingBottom: 32,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    greetingLabel: {
      fontSize: 13,
      color: theme.textMuted,
    },
    greetingName: {
      fontSize: 22,
      fontWeight: '600',
      color: theme.textDark,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    avatarPlaceholder: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.moodSelBg,
      borderWidth: 1.5,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarEmoji: {
      fontSize: 20,
    },
    strip: {
      marginBottom: 16,
    },
    emptyPetCard: {
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderStyle: 'dashed',
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 18,
    },
    emptyPetIcon: {
      fontSize: 24,
    },
    emptyPetTextGroup: {
      flex: 1,
    },
    emptyPetTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.primary,
      marginBottom: 2,
    },
    emptyPetSubtitle: {
      fontSize: 13,
      color: theme.textMuted,
    },
    streakPill: {
      backgroundColor: theme.streakBg,
      borderWidth: 0.5,
      borderColor: theme.streakBorder,
      borderRadius: 14,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16,
    },
    streakEmoji: {
      fontSize: 20,
    },
    streakTextGroup: {
      flex: 1,
    },
    streakTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.pendingAmberText,
    },
    streakSubtitle: {
      fontSize: 12,
      color: theme.pendingAmberText,
    },
    weekChip: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    weekChipText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.pendingAmberText,
    },
    aiBar: {
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      borderWidth: 0.5,
      borderColor: theme.border,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 18,
    },
    aiIcon: {
      fontSize: 18,
    },
    aiText: {
      flex: 1,
      fontSize: 14,
      color: theme.textMuted,
    },
    chevron: {
      fontSize: 18,
      color: theme.textMuted,
    },
    tipCard: {
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      borderWidth: 0.5,
      borderColor: theme.border,
      padding: 15,
      marginBottom: 18,
    },
    tipHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    tipBadge: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 12,
      paddingHorizontal: 9,
      paddingVertical: 3,
    },
    tipBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.primaryDark,
    },
    nextTipBtn: {
      paddingHorizontal: 4,
    },
    nextTipText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.primary,
    },
    tipTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.textDark,
      marginBottom: 5,
    },
    tipBody: {
      fontSize: 13,
      color: theme.textMuted,
      lineHeight: 18,
      marginBottom: 10,
    },
    tipAiRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 8,
      borderTopWidth: 0.5,
      borderTopColor: theme.divider,
    },
    tipAiText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.primary,
    },
    tipAiChevron: {
      fontSize: 14,
      color: theme.primary,
    },
  });
}
