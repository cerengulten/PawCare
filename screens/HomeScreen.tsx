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
import { computeAge } from '../lib/petAge';
import { useHabits, getHabitTarget } from '../lib/hooks/useHabits';
import { useAllVaccines } from '../lib/hooks/useAllVaccines';
import { useDogMood } from '../lib/hooks/useDogMood';
import PetSummaryCard from '../components/PetSummaryCard';
import NearbyVetsSection from '../components/NearbyVetsSection';
import PreventiveCareCard from '../components/PreventiveCareCard';
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
  const { theme, isDarkMode } = useTheme();
  const { t, lang } = useT();
  const styles = useMemo(() => makeStyles(theme, isDarkMode), [theme, isDarkMode]);
  const { streak } = useOverallStreak();
  const [showProfile, setShowProfile] = useState(false);
  const [showVetModal, setShowVetModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<VetAppointment | null>(null);
  const [tipOffset, setTipOffset] = useState(0);

  const activeDog = dogs.find(d => d.id === selectedDogId) ?? dogs[0] ?? null;
  const activeDogName = activeDog?.name ?? t('home.yourPet');
  const { habits, completedToday, completedCounts, logHabitToday, logWaterAmount, undoHabitToday, resetWaterToday } = useHabits(activeDog?.id ?? '');
  const { upcoming: upcomingVaccines, overdue: overdueVaccines } = useAllVaccines();
  const { mood } = useDogMood(activeDog?.id ?? '');
  const age = computeAge(activeDog?.birth_date ?? null);

  const nextPreventiveTreatment = useMemo(() => {
    const activeOverdue = overdueVaccines.find(v => v.dog_id === activeDog?.id);
    if (activeOverdue) return activeOverdue;
    const anyOverdue = overdueVaccines[0];
    if (anyOverdue) return anyOverdue;
    const activeUpcoming = upcomingVaccines.find(v => v.dog_id === activeDog?.id);
    if (activeUpcoming) return activeUpcoming;
    return upcomingVaccines[0] ?? null;
  }, [overdueVaccines, upcomingVaccines, activeDog?.id]);

  const formattedDate = useMemo(() => {
    try {
      return new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Today';
    }
  }, []);

  const {
    nextAppointment,
    addAppointment,
    editAppointment,
    removeAppointment,
    markCompleted,
  } = useVetAppointments();

  const currentTip = useMemo(() => getDailyVetTip(tipOffset, lang), [tipOffset, lang]);

  const petStripRef = useRef<View>(null);
  const streakRef = useRef<View>(null);
  const rhythmRef = useRef<View>(null);
  const preventiveRef = useRef<View>(null);
  const vetCardRef = useRef<View>(null);
  const aiRef = useRef<View>(null);

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
        {/* 1. Warm Editorial Header */}
        <View style={styles.header}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.dateLabel}>{formattedDate.toUpperCase()}</Text>
            <Text style={styles.greetingName}>{greeting}, {firstName} 👋</Text>
          </View>
          <TouchableOpacity onPress={() => setShowProfile(true)} activeOpacity={0.8}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarEmoji}>🐾</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Multi-Pet Selector Strip (when > 1 pet) */}
        {dogs.length > 1 && (
          <View style={styles.petSelectorStrip}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.petSelectorContent}>
              {dogs.map(dog => {
                const isSelected = dog.id === activeDog?.id;
                return (
                  <TouchableOpacity
                    key={dog.id}
                    style={[styles.petSelectorChip, isSelected && styles.petSelectorChipSelected]}
                    onPress={() => navigation.navigate('Pets', { dogId: dog.id })}
                    activeOpacity={0.8}
                  >
                    {dog.photo_url ? (
                      <Image source={{ uri: dog.photo_url }} style={styles.petSelectorPhoto} />
                    ) : (
                      <Text style={styles.petSelectorEmoji}>🐾</Text>
                    )}
                    <Text
                      style={[styles.petSelectorName, isSelected && styles.petSelectorNameSelected]}
                      numberOfLines={1}
                    >
                      {dog.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 2. Centerpiece: The Warm Companion Passport & Care Rhythm Card */}
        {activeDog ? (
          <View ref={petStripRef} collapsable={false} style={styles.passportCard}>
            <TouchableOpacity
              style={styles.passportHeader}
              onPress={() => navigation.navigate('Pets', { dogId: activeDog.id })}
              activeOpacity={0.85}
            >
              {activeDog.photo_url ? (
                <Image source={{ uri: activeDog.photo_url }} style={styles.passportAvatar} />
              ) : (
                <View style={styles.passportAvatarPlaceholder}>
                  <Text style={styles.passportAvatarEmoji}>🐾</Text>
                </View>
              )}
              <View style={styles.passportInfo}>
                <View style={styles.passportTitleRow}>
                  <Text style={styles.passportName} numberOfLines={1}>{activeDog.name}</Text>
                  <View style={styles.stampBadge}>
                    <View style={styles.stampDot} />
                    <Text style={styles.stampText}>
                      {mood?.mood === 'sick' ? (t('mood.sick') || 'Needs Care') : mood?.mood === 'off' ? (t('mood.off') || 'A Bit Off') : (t('mood.great') || 'Thriving')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.passportMeta} numberOfLines={1}>
                  {[activeDog.breed, age].filter(Boolean).join(' · ') || 'Beloved Companion'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Daily Care Rhythm Inside the Passport Card */}
            <View ref={rhythmRef} collapsable={false} style={styles.rhythmContainer}>
              <View style={styles.rhythmHeader}>
                <Text style={styles.rhythmTitle}>{t('home.careRhythmTitle') || "TODAY'S CARE RHYTHM"}</Text>
                <Text style={styles.rhythmCount}>
                  {habits.length > 0
                    ? t('home.careRhythmCompleted', { completed: completedToday.size, total: habits.length })
                    : t('home.careRhythmEmpty')}
                </Text>
              </View>

              {habits.length > 0 ? (
                <View style={styles.rhythmProgressBar}>
                  <View
                    style={[
                    styles.rhythmProgressFill,
                    { width: `${Math.round((completedToday.size / habits.length) * 100)}%` },
                  ]}
                />
              </View>
            ) : null}

              <View style={styles.habitTokensRow}>
                {habits.length > 0 ? (
                  habits.slice(0, 3).map((habit) => {
                    const isWater = habit.habit_type === 'water';
                    const target = getHabitTarget(habit);
                    const count = completedCounts.get(habit.id) ?? 0;
                    const isDone = completedToday.has(habit.id);
                    const icon = isWater ? '💧' : habit.habit_type === 'feeding' ? '🥩' : habit.habit_type === 'walking' ? '🦮' : '⭐';

                    return (
                      <TouchableOpacity
                        key={habit.id}
                        style={[
                          styles.habitToken,
                          isDone && styles.habitTokenDone,
                        ]}
                        onPress={() => {
                          if (isWater) {
                            if (isDone) {
                              resetWaterToday(habit.id);
                            } else {
                              logWaterAmount(habit.id, 150);
                            }
                          } else {
                            if (isDone) {
                              undoHabitToday(habit.id);
                            } else {
                              logHabitToday(habit.id);
                            }
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.habitTokenIconBox, isDone && styles.habitTokenIconBoxDone]}>
                          <Text style={styles.habitTokenIcon}>{isDone ? '✓' : icon}</Text>
                        </View>
                        <View style={styles.habitTokenTextCol}>
                          <Text style={[styles.habitTokenTitle, isDone && styles.habitTokenTitleDone]} numberOfLines={1}>
                            {habit.title}
                          </Text>
                          <Text style={styles.habitTokenSubtitle} numberOfLines={1}>
                            {isWater ? `${count}/${target}ml` : isDone ? `${t('common.done') || 'Done'} ✓` : `${count}/${target}`}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.habitToken}
                      onPress={() => navigation.navigate('Pets', { dogId: activeDog.id })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.habitTokenIconBox}>
                        <Text style={styles.habitTokenIcon}>🥩</Text>
                      </View>
                      <View style={styles.habitTokenTextCol}>
                        <Text style={styles.habitTokenTitle}>{t('home.defaultMeal') || 'Meals'}</Text>
                        <Text style={styles.habitTokenSubtitle}>{t('home.setRoutine') || 'Set routine'}</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.habitToken}
                      onPress={() => navigation.navigate('Pets', { dogId: activeDog.id })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.habitTokenIconBox}>
                        <Text style={styles.habitTokenIcon}>🦮</Text>
                      </View>
                      <View style={styles.habitTokenTextCol}>
                        <Text style={styles.habitTokenTitle}>{t('home.defaultWalk') || 'Daily Walk'}</Text>
                        <Text style={styles.habitTokenSubtitle}>{t('home.trackOutdoors') || 'Track outdoors'}</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.habitToken}
                      onPress={() => navigation.navigate('Pets', { dogId: activeDog.id })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.habitTokenIconBox}>
                        <Text style={styles.habitTokenIcon}>💧</Text>
                      </View>
                      <View style={styles.habitTokenTextCol}>
                        <Text style={styles.habitTokenTitle}>{t('home.defaultWater') || 'Clean Water'}</Text>
                        <Text style={styles.habitTokenSubtitle}>{t('home.freshBowl') || 'Fresh bowl'}</Text>
                      </View>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.emptyPetCard}
            onPress={() => navigation.navigate('Pets')}
            activeOpacity={0.8}
          >
            <View style={styles.emptyPetIconBox}>
              <Text style={styles.emptyPetIcon}>🐾</Text>
            </View>
            <View style={styles.emptyPetTextGroup}>
              <Text style={styles.emptyPetTitle}>{t('pets.addFirstPet')}</Text>
              <Text style={styles.emptyPetSubtitle}>{t('pets.noPetsSubtitle')}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}

        {/* 3. Streak Card */}
        {streak > 0 ? (
          <View ref={streakRef} collapsable={false} style={styles.streakCard}>
            <View style={styles.streakIconCircle}>
              <Text style={styles.streakEmoji}>🔥</Text>
            </View>
            <View style={styles.streakTextGroup}>
              <Text style={styles.streakTitle}>{t('home.streakTitle', { count: streak })}</Text>
              <Text style={styles.streakSubtitle}>
                Consistent care keeps {activeDogName} healthy & thriving
              </Text>
            </View>
            <View style={styles.weekChip}>
              <Text style={styles.weekChipText}>{t('home.week', { count: Math.ceil(streak / 7) })}</Text>
            </View>
          </View>
        ) : null}

        {/* 4. Immunity & Parasite Shield Reminder Card */}
        <View ref={preventiveRef} collapsable={false}>
          <PreventiveCareCard
            treatment={nextPreventiveTreatment}
            onPress={() => {
              if (activeDog) {
                navigation.navigate('Pets', { dogId: activeDog.id });
              } else {
                navigation.navigate('Pets');
              }
            }}
            onSchedulePress={() => {
              if (activeDog) {
                navigation.navigate('Pets', { dogId: activeDog.id });
              } else {
                navigation.navigate('Pets');
              }
            }}
          />
        </View>

        {/* 5. Cozy "Next Up" Vet Appointment Card (Butter-Cream squircle) */}
        <View ref={vetCardRef} collapsable={false}>
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
        </View>

        {/* 6. Curated Daily Vet Bite & Care Insight (Pistachio Whisper card) */}
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
              <Text style={styles.nextTipText}>↻ {t('home.nextTip') || 'Next tip'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.tipTitle}>{currentTip.title}</Text>
          <Text style={styles.tipBody}>{currentTip.body}</Text>

          <TouchableOpacity
            style={styles.tipAiRow}
            onPress={() => navigation.navigate('Chat', { fromLink: true })}
            activeOpacity={0.7}
          >
            <Text style={styles.tipAiText}>💬 {t('home.askBiscoAboutInsight') || 'Ask Bisco AI about this insight'}</Text>
            <Text style={styles.tipAiChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 7. Warm AI Care Companion Card (Replaces the generic gray bar) */}
        <View ref={aiRef} collapsable={false}>
          <TouchableOpacity
            style={styles.aiCompanionCard}
            onPress={() => navigation.navigate('Chat', { fromLink: true })}
            activeOpacity={0.85}
          >
            <View style={styles.aiCompanionRow}>
              <View style={styles.aiCompanionIconBox}>
                <Text style={styles.aiCompanionIcon}>✨</Text>
              </View>
              <View style={styles.aiCompanionTextCol}>
                <Text style={styles.aiCompanionTitle}>{t('home.careConsultationPrompt') || 'Have a symptom or food question?'}</Text>
                <Text style={styles.aiCompanionSubtitle}>
                  {t('home.aiQuestionSubtitle', { name: activeDogName }) || `Ask Bisco AI for fast, vet-informed guidance for ${activeDogName}.`}
                </Text>
              </View>
            </View>
            <View style={styles.aiCompanionActionRow}>
              <Text style={styles.aiCompanionActionText}>{t('home.startCareConsultation') || 'Start Care Consultation →'}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 8. Nearby Vet Clinics Preview */}
        <NearbyVetsSection
          dog={activeDog}
          onOpenVetFinder={() => navigation.navigate('More', { openVetFinder: true })}
        />

        <TabTour
          tab="home"
          enabled={dogs.length > 0}
          steps={[
            { targetRef: petStripRef, position: 'bottom', title: t('tour.home.s1Title'), body: t('tour.home.s1Body') },
            { targetRef: rhythmRef, position: 'bottom', title: t('tour.home.s2Title'), body: t('tour.home.s2Body') },
            { targetRef: preventiveRef, position: 'bottom', title: t('tour.home.s3Title'), body: t('tour.home.s3Body') },
            { targetRef: vetCardRef, position: 'bottom', title: t('tour.home.s4Title'), body: t('tour.home.s4Body') },
            { targetRef: aiRef, position: 'top', title: t('tour.home.s5Title'), body: t('tour.home.s5Body') },
            ...(streak > 0
              ? [{ targetRef: streakRef, position: 'bottom' as const, title: t('tour.home.streakTitle'), body: t('tour.home.streakBody') }]
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

function makeStyles(theme: ThemeTokens, isDarkMode = false) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 16,
      paddingTop: 56,
      paddingBottom: 36,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerTextGroup: {
      flex: 1,
      paddingRight: 12,
    },
    dateLabel: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
      color: theme.textMuted,
      marginBottom: 3,
    },
    greetingName: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.textDark,
      letterSpacing: -0.3,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 2,
      borderColor: isDarkMode ? '#352D27' : '#FFFFFF',
    },
    avatarPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: isDarkMode ? '#2A2420' : '#F4EDE4',
      borderWidth: 1.5,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarEmoji: {
      fontSize: 22,
    },
    petSelectorStrip: {
      marginBottom: 14,
    },
    petSelectorContent: {
      gap: 8,
      paddingRight: 8,
    },
    petSelectorChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: theme.surface,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    petSelectorChipSelected: {
      backgroundColor: isDarkMode ? '#332019' : '#FDF1EB',
      borderColor: theme.primary,
    },
    petSelectorPhoto: {
      width: 22,
      height: 22,
      borderRadius: 11,
    },
    petSelectorEmoji: {
      fontSize: 14,
    },
    petSelectorName: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textMuted,
    },
    petSelectorNameSelected: {
      color: theme.primary,
      fontWeight: '700',
    },
    // Centerpiece: The Warm Companion Passport Card
    passportCard: {
      backgroundColor: theme.surface,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 18,
      marginBottom: 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDarkMode ? 0.25 : 0.05,
      shadowRadius: 12,
      elevation: 3,
    },
    passportHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 16,
    },
    passportAvatar: {
      width: 58,
      height: 58,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    passportAvatarPlaceholder: {
      width: 58,
      height: 58,
      borderRadius: 20,
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1.5,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    passportAvatarEmoji: {
      fontSize: 28,
    },
    passportInfo: {
      flex: 1,
    },
    passportTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 3,
    },
    passportName: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.textDark,
      letterSpacing: -0.3,
    },
    passportMeta: {
      fontSize: 13,
      color: theme.textMuted,
      fontWeight: '500',
    },
    stampBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: isDarkMode ? '#1F3327' : '#EAF3ED',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDarkMode ? '#2F523D' : '#C6DFCE',
    },
    stampDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.done,
    },
    stampText: {
      fontSize: 10,
      fontWeight: '800',
      color: theme.done,
      letterSpacing: 0.3,
    },
    rhythmContainer: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
    },
    rhythmHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    rhythmTitle: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
      color: theme.textMuted,
    },
    rhythmCount: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textDark,
    },
    rhythmProgressBar: {
      height: 6,
      backgroundColor: isDarkMode ? '#352D27' : '#E6DECE',
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: 12,
    },
    rhythmProgressFill: {
      height: '100%',
      backgroundColor: theme.done,
      borderRadius: 3,
    },
    habitTokensRow: {
      flexDirection: 'row',
      gap: 8,
    },
    habitToken: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.surface,
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    habitTokenDone: {
      backgroundColor: isDarkMode ? '#1B2721' : '#F0F7F1',
      borderColor: isDarkMode ? '#2D4438' : '#C7DFC9',
    },
    habitTokenIconBox: {
      width: 26,
      height: 26,
      borderRadius: 8,
      backgroundColor: theme.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    habitTokenIconBoxDone: {
      backgroundColor: theme.done,
    },
    habitTokenIcon: {
      fontSize: 13,
    },
    habitTokenTextCol: {
      flex: 1,
    },
    habitTokenTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textDark,
      lineHeight: 14,
    },
    habitTokenTitleDone: {
      color: theme.done,
    },
    habitTokenSubtitle: {
      fontSize: 9,
      color: theme.textMuted,
      lineHeight: 12,
    },
    // Empty Pet Card
    emptyPetCard: {
      backgroundColor: theme.surface,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderStyle: 'dashed',
      padding: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 18,
    },
    emptyPetIconBox: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyPetIcon: {
      fontSize: 24,
    },
    emptyPetTextGroup: {
      flex: 1,
    },
    emptyPetTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.primary,
      marginBottom: 3,
    },
    emptyPetSubtitle: {
      fontSize: 13,
      color: theme.textMuted,
      lineHeight: 17,
    },
    // Streak Milestone Card
    streakCard: {
      backgroundColor: isDarkMode ? '#2D2319' : '#FEF8EE',
      borderWidth: 1.5,
      borderColor: isDarkMode ? '#543F2A' : '#F5E2C4',
      borderRadius: 20,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 18,
    },
    streakIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDarkMode ? '#44321E' : '#FFF0D4',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDarkMode ? '#6B4F2E' : '#E8CFA6',
    },
    streakEmoji: {
      fontSize: 20,
    },
    streakTextGroup: {
      flex: 1,
    },
    streakTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.pendingAmberText,
      marginBottom: 2,
    },
    streakSubtitle: {
      fontSize: 12,
      color: theme.textMuted,
      lineHeight: 16,
    },
    weekChip: {
      backgroundColor: theme.surface,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: isDarkMode ? '#543F2A' : '#EAD5B8',
    },
    weekChipText: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.pendingAmberText,
    },
    // Daily Vet Bite & Care Insight (Soft Pistachio Whisper Card)
    tipCard: {
      backgroundColor: isDarkMode ? '#1B2721' : '#F3F7F2',
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: isDarkMode ? '#2D4438' : '#DDE8DC',
      padding: 16,
      marginBottom: 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    tipHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    tipBadge: {
      backgroundColor: isDarkMode ? '#243C2E' : '#E5F0E4',
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: isDarkMode ? '#355944' : '#CCE0CB',
    },
    tipBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: isDarkMode ? '#86EFAC' : '#2D5A3E',
      letterSpacing: 0.4,
    },
    nextTipBtn: {
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    nextTipText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.primary,
    },
    tipTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.textDark,
      marginBottom: 6,
      letterSpacing: -0.2,
    },
    tipBody: {
      fontSize: 13,
      color: theme.textMuted,
      lineHeight: 19,
      marginBottom: 12,
    },
    tipAiRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#2D4438' : '#DDE8DC',
    },
    tipAiText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
    },
    tipAiChevron: {
      fontSize: 14,
      color: theme.primary,
      fontWeight: '700',
    },
    // Warm AI Care Companion Card
    aiCompanionCard: {
      backgroundColor: isDarkMode ? '#281F1A' : '#FFF9EE',
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: isDarkMode ? '#4D3627' : '#F6E5CC',
      padding: 16,
      marginBottom: 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    aiCompanionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 12,
    },
    aiCompanionIconBox: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: isDarkMode ? '#3B291E' : '#FFF2DB',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDarkMode ? '#5E3E2A' : '#F2D7AE',
    },
    aiCompanionIcon: {
      fontSize: 20,
    },
    aiCompanionTextCol: {
      flex: 1,
    },
    aiCompanionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.textDark,
      marginBottom: 3,
      letterSpacing: -0.2,
    },
    aiCompanionSubtitle: {
      fontSize: 12,
      color: theme.textMuted,
      lineHeight: 17,
    },
    aiCompanionActionRow: {
      backgroundColor: theme.primary,
      borderRadius: 14,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    aiCompanionActionText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },
    chevron: {
      fontSize: 18,
      color: theme.textMuted,
    },
  });
}
