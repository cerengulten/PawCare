import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  BackHandler,
  StyleSheet,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useProfile } from '../lib/hooks/useProfile';
import { useDogs } from '../lib/hooks/useDogs';
import { useSelectedPet } from '../lib/hooks/useSelectedPet';
import { useOverallStreak } from '../lib/hooks/useOverallStreak';
import { useVetAppointments } from '../lib/hooks/useVetAppointments';
import { VetAppointment, getAppointmentDateTime } from '../lib/vetAppointments';
import { getDailyVetTip } from '../lib/vetTips';
import { computeAge } from '../lib/petAge';
import { useHabits, getHabitTarget } from '../lib/hooks/useHabits';
import { useAllVaccines } from '../lib/hooks/useAllVaccines';
import { useDogMood } from '../lib/hooks/useDogMood';
import { getMoodStatus } from '../lib/moodStatus';
import { detectTreatmentType } from '../lib/treatmentLogic';
import { renderHabitVectorIcon } from '../lib/habitIcons';
import { triggerLightHaptic, triggerSuccessHaptic } from '../lib/haptics';
import VetAppointmentModal from '../components/VetAppointmentModal';
import TabTour from '../components/TabTour';
import { checkAndCreateStreakAlert } from '../lib/notificationService';
import ProfileScreen from './ProfileScreen';
import { RootTabParamList } from './AppTabs';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { localeTag } from '../lib/i18n';
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

export default function HomeScreen({
  navigation,
  dogs,
  selectedDogId,
  profile,
  updateProfile,
  checkUsernameAvailable,
}: Props) {
  const { theme, isDarkMode } = useTheme();
  const { t, lang } = useT();
  const styles = useMemo(() => makeStyles(theme, isDarkMode), [theme, isDarkMode]);
  const { streak } = useOverallStreak();
  const [showProfile, setShowProfile] = useState(false);
  const [showVetModal, setShowVetModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<VetAppointment | null>(null);
  const [tipOffset, setTipOffset] = useState(0);
  const [tipExpanded, setTipExpanded] = useState(false);

  const activeDog = dogs.find((d) => d.id === selectedDogId) ?? dogs[0] ?? null;
  const activeDogName = activeDog?.name ?? t('home.yourPet');
  const {
    habits,
    dueHabitsToday,
    weeklyTargetHabits,
    weeklyCounts,
    completedToday,
    completedCounts,
    completionRate,
    isWeeklyGoalReached,
    logHabitToday,
    logWaterAmount,
    resetHabitToday,
    undoOccurrence,
    resetWaterToday,
  } = useHabits(activeDog?.id ?? '');
  const { upcoming: upcomingVaccines, overdue: overdueVaccines } = useAllVaccines();
  const { mood } = useDogMood(activeDog?.id ?? '');
  const moodStatus = getMoodStatus(mood?.mood, theme, t);
  const age = computeAge(activeDog?.birth_date ?? null);

  const nextPreventiveTreatment = useMemo(() => {
    const activeOverdue = overdueVaccines.find((v) => v.dog_id === activeDog?.id);
    if (activeOverdue) return activeOverdue;
    const anyOverdue = overdueVaccines[0];
    if (anyOverdue) return anyOverdue;
    const activeUpcoming = upcomingVaccines.find((v) => v.dog_id === activeDog?.id);
    if (activeUpcoming) return activeUpcoming;
    return upcomingVaccines[0] ?? null;
  }, [overdueVaccines, upcomingVaccines, activeDog?.id]);

  const preventiveStatusInfo = useMemo(() => {
    if (!nextPreventiveTreatment) return null;
    const dueMs = new Date(`${nextPreventiveTreatment.next_due_date}T00:00:00`).getTime();
    const todayMs = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00').getTime();
    const diffDays = Math.round((dueMs - todayMs) / (1000 * 60 * 60 * 24));
    const isOverdue = diffDays < 0;
    const kind = detectTreatmentType(nextPreventiveTreatment.vaccine_name, nextPreventiveTreatment.notes);
    return {
      diffDays,
      isOverdue,
      kind,
      label: isOverdue
        ? `${Math.abs(diffDays)}d overdue`
        : diffDays === 0
          ? t('home.today') || 'Due today'
          : `Due in ${diffDays}d`,
    };
  }, [nextPreventiveTreatment, t]);

  const formattedDate = useMemo(() => {
    try {
      return new Date().toLocaleDateString(localeTag(), {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return t('home.today') || 'Today';
    }
  }, [lang, t]);

  const {
    appointments,
    nextAppointment,
    addAppointment,
    editAppointment,
    removeAppointment,
    markCompleted,
  } = useVetAppointments();

  const [completingAppt, setCompletingAppt] = useState<VetAppointment | null>(null);
  const [completeNotes, setCompleteNotes] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  function handleCompleteWithNotes(id: string) {
    const appt =
      appointments.find((a) => a.id === id) ||
      (nextAppointment?.id === id ? nextAppointment : null);
    if (appt) {
      setCompletingAppt(appt);
      setCompleteNotes(appt.notes || '');
      setShowCompleteModal(true);
    } else {
      markCompleted(id);
    }
  }

  async function handleSaveCompletion() {
    if (completingAppt) {
      if (editAppointment) {
        await editAppointment({
          ...completingAppt,
          notes: completeNotes.trim() || completingAppt.notes,
          status: 'completed',
        });
      }
      await markCompleted(completingAppt.id);
      triggerSuccessHaptic();
    }
    setShowCompleteModal(false);
    setCompletingAppt(null);
  }

  const currentTip = useMemo(() => getDailyVetTip(tipOffset, lang), [tipOffset, lang]);

  const homeScrollRef = useRef<ScrollView>(null);
  const petStripRef = useRef<View>(null);
  const rhythmRef = useRef<View>(null);
  const agendaRef = useRef<View>(null);
  const aiRef = useRef<View>(null);
  const homeTourY = useRef<{
    passport?: number;
    agenda?: number;
    ai?: number;
  }>({});
  const scrollToHomeTour = (y?: number) =>
    homeScrollRef.current?.scrollTo({ y: Math.max(0, (y ?? 0) - 90), animated: true });

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
  const greeting =
    hour < 12 ? t('home.goodMorning') : hour < 18 ? t('home.goodAfternoon') : t('home.goodEvening');
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

  const rhythmHabits = dueHabitsToday.length > 0 ? dueHabitsToday : habits;

  return (
    <>
      <ScrollView ref={homeScrollRef} style={styles.container} contentContainerStyle={styles.content}>
        {/* Warm Editorial Header */}
        <View style={styles.header}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.dateLabel}>{formattedDate.toUpperCase()}</Text>
            <Text style={styles.greetingName}>
              {greeting}, {firstName}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowProfile(true)} activeOpacity={0.8}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Feather name="user" size={20} color={theme.primary} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Multi-Pet Selector Strip (when > 1 pet) */}
        {dogs.length > 1 && (
          <View style={styles.petSelectorStrip}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.petSelectorContent}
            >
              {dogs.map((dog) => {
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

        {/* ================================================================== */}
        {/* SECTION 1: HERO COMPANION PASSPORT & CARE RHYTHM                   */}
        {/* ================================================================== */}
        {activeDog ? (
          <View
            style={styles.passportCard}
            onLayout={(e) => {
              homeTourY.current.passport = e.nativeEvent.layout.y;
            }}
          >
            <View ref={petStripRef} collapsable={false}>
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
                    <Text style={styles.passportName} numberOfLines={1}>
                      {activeDog.name}
                    </Text>
                    <View style={styles.passportBadgesRow}>
                      {streak > 0 ? (
                        <View style={styles.streakInlinePill}>
                          <Feather name="zap" size={13} color="#D97706" />
                          <Text style={styles.streakInlineText}>{streak}d</Text>
                        </View>
                      ) : null}
                      <TouchableOpacity
                        style={[
                          styles.stampBadge,
                          {
                            backgroundColor: moodStatus.badgeBg,
                            borderColor: moodStatus.borderColor,
                          },
                        ]}
                        onPress={() => navigation.navigate('Pets', { dogId: activeDog.id })}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.stampDot, { backgroundColor: moodStatus.dotColor }]} />
                        <Text style={[styles.stampText, { color: moodStatus.textColor }]}>
                          {moodStatus.label}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.passportMeta} numberOfLines={1}>
                    {[activeDog.breed, age].filter(Boolean).join(' · ') || 'Beloved Companion'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Daily Care Rhythm Inside the Passport Card */}
            <View ref={rhythmRef} collapsable={false} style={styles.rhythmContainer}>
              <View style={styles.rhythmHeader}>
                <Text style={styles.rhythmTitle}>
                  {t('home.careRhythmTitle') || "TODAY'S CARE RHYTHM"}
                </Text>
                <Text style={styles.rhythmCount}>
                  {rhythmHabits.length > 0
                    ? t('home.careRhythmCompleted', {
                        completed:
                          dueHabitsToday.length > 0
                            ? dueHabitsToday.filter((h) => completedToday.has(h.id)).length
                            : completedToday.size,
                        total: rhythmHabits.length,
                      })
                    : t('home.careRhythmEmpty')}
                </Text>
              </View>

              {rhythmHabits.length > 0 ? (
                <View style={styles.rhythmProgressBar}>
                  <View style={[styles.rhythmProgressFill, { width: `${completionRate}%` }]} />
                </View>
              ) : null}

              <View style={styles.habitTokensRow}>
                {rhythmHabits.length > 0 ? (
                  rhythmHabits.slice(0, 3).map((habit) => {
                    const isWater = habit.habit_type === 'water';
                    const isWeekly = habit.schedule_type === 'weekly_target';
                    const target = isWeekly
                      ? (habit.weekly_target_count ?? 1)
                      : getHabitTarget(habit);
                    const count = isWeekly
                      ? (weeklyCounts.get(habit.id) ?? 0)
                      : (completedCounts.get(habit.id) ?? 0);
                    const isDone = isWeekly
                      ? isWeeklyGoalReached(habit)
                      : completedToday.has(habit.id);

                    return (
                      <TouchableOpacity
                        key={habit.id}
                        style={[styles.habitToken, isDone && styles.habitTokenDone]}
                        onPress={() => {
                          triggerLightHaptic();
                          if (isWater) {
                            if (isDone) {
                              resetWaterToday(habit.id);
                            } else {
                              if (
                                count + 150 >= target &&
                                completedToday.size + 1 >= rhythmHabits.length
                              ) {
                                triggerSuccessHaptic();
                              }
                              logWaterAmount(habit.id, 150);
                            }
                          } else {
                            if (isDone) {
                              resetHabitToday(habit.id);
                            } else {
                              if (
                                count + 1 >= target &&
                                completedToday.size + 1 >= rhythmHabits.length
                              ) {
                                triggerSuccessHaptic();
                              }
                              logHabitToday(habit.id);
                            }
                          }
                        }}
                        onLongPress={() => {
                          if (count <= 0) return;
                          Alert.alert(
                            habit.title,
                            t('habitRow.manageProgress', { count, target }) ||
                              `${t('home.today') || 'Today'}: ${count}/${target}`,
                            [
                              { text: t('common.cancel'), style: 'cancel' },
                              target > 1 && count > 1
                                ? {
                                    text: t('habitRow.undoOne') || 'Undo one (-1)',
                                    onPress: () => undoOccurrence(habit.id),
                                  }
                                : null,
                              {
                                text: t('habitRow.resetToZero') || 'Reset to 0',
                                style: 'destructive',
                                onPress: () =>
                                  isWater
                                    ? resetWaterToday(habit.id)
                                    : resetHabitToday(habit.id),
                              },
                            ].filter(Boolean) as any
                          );
                        }}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.habitTokenIconBox,
                            isDone && styles.habitTokenIconBoxDone,
                          ]}
                        >
                          {isDone ? (
                            <Feather name="check" size={14} color="#FFFFFF" />
                          ) : (
                            renderHabitVectorIcon(habit.habit_type, theme.primary, 15)
                          )}
                        </View>
                        <View style={styles.habitTokenTextCol}>
                          <Text
                            style={[
                              styles.habitTokenTitle,
                              isDone && styles.habitTokenTitleDone,
                            ]}
                            numberOfLines={1}
                          >
                            {habit.title}
                          </Text>
                          <Text style={styles.habitTokenSubtitle} numberOfLines={1}>
                            {isWater
                              ? `${count}/${target}ml`
                              : isWeekly
                                ? `${count}/${target} wk`
                                : isDone
                                  ? `${t('common.done') || 'Done'}`
                                  : `${count}/${target}`}
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
                        <Ionicons name="restaurant-outline" size={15} color={theme.primary} />
                      </View>
                      <View style={styles.habitTokenTextCol}>
                        <Text style={styles.habitTokenTitle}>
                          {t('home.defaultMeal') || 'Meals'}
                        </Text>
                        <Text style={styles.habitTokenSubtitle}>
                          {t('home.setRoutine') || 'Set routine'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.habitToken}
                      onPress={() => navigation.navigate('Pets', { dogId: activeDog.id })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.habitTokenIconBox}>
                        <Feather name="activity" size={14} color={theme.primary} />
                      </View>
                      <View style={styles.habitTokenTextCol}>
                        <Text style={styles.habitTokenTitle}>
                          {t('home.defaultWalk') || 'Daily Walk'}
                        </Text>
                        <Text style={styles.habitTokenSubtitle}>
                          {t('home.trackOutdoors') || 'Track outdoors'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.habitToken}
                      onPress={() => navigation.navigate('Pets', { dogId: activeDog.id })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.habitTokenIconBox}>
                        <Ionicons name="water-outline" size={15} color={theme.primary} />
                      </View>
                      <View style={styles.habitTokenTextCol}>
                        <Text style={styles.habitTokenTitle}>
                          {t('home.defaultWater') || 'Clean Water'}
                        </Text>
                        <Text style={styles.habitTokenSubtitle}>
                          {t('home.freshBowl') || 'Fresh bowl'}
                        </Text>
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
            <Feather name="chevron-right" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        )}

        {/* ================================================================== */}
        {/* SECTION 2: WEEKLY ROUTINES & SUPPLEMENTS STRIP                     */}
        {/* ================================================================== */}
        {activeDog && weeklyTargetHabits.length > 0 ? (
          <View style={styles.weeklyCard}>
            <View style={styles.weeklyHeader}>
              <View style={styles.weeklyHeaderIconBox}>
                <Ionicons name="calendar-outline" size={16} color={theme.primary} />
              </View>
              <View style={styles.weeklyHeaderTextCol}>
                <Text style={styles.weeklySectionTitle}>{t('habits.weeklyRoutinesSection')}</Text>
                <Text style={styles.weeklySectionSubtitle}>
                  {weeklyTargetHabits.filter((h) => isWeeklyGoalReached(h)).length} of{' '}
                  {weeklyTargetHabits.length} {t('habits.goalReached')}
                </Text>
              </View>
            </View>

            <View style={styles.weeklyItemsList}>
              {weeklyTargetHabits.map((habit, idx) => {
                const count = weeklyCounts.get(habit.id) ?? 0;
                const target = habit.weekly_target_count ?? 1;
                const reached = count >= target;

                return (
                  <View
                    key={habit.id}
                    style={[
                      styles.weeklyItemRow,
                      idx < weeklyTargetHabits.length - 1 && styles.weeklyItemBorder,
                    ]}
                  >
                    <View style={styles.weeklyItemLeft}>
                      <View
                        style={[
                          styles.weeklyItemIconBox,
                          reached && styles.weeklyItemIconBoxDone,
                        ]}
                      >
                        {reached ? (
                          <Feather name="check" size={15} color="#FFFFFF" />
                        ) : (
                          renderHabitVectorIcon(habit.habit_type, theme.primary, 16)
                        )}
                      </View>
                      <View style={styles.weeklyItemTextCol}>
                        <Text
                          style={[
                            styles.weeklyItemTitle,
                            reached && styles.weeklyItemTitleDone,
                          ]}
                          numberOfLines={1}
                        >
                          {habit.title}
                        </Text>
                        <Text style={styles.weeklyItemSubtitle}>
                          {reached
                            ? `${count}/${target} · ${t('habits.goalReached')}`
                            : `${count}/${target} this week`}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.weeklyLogBtn, reached && styles.weeklyLogBtnDone]}
                      onPress={() => {
                        triggerLightHaptic();
                        if (reached) {
                          resetHabitToday(habit.id);
                        } else {
                          logHabitToday(habit.id);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.weeklyLogBtnText,
                          reached && styles.weeklyLogBtnTextDone,
                        ]}
                      >
                        {reached ? t('common.done') || 'Done' : t('habits.logAction')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* ================================================================== */}
        {/* SECTION 3: UPCOMING CARE AGENDA CARD (Vet Visit + Immunity Shield) */}
        {/* ================================================================== */}
        <View
          ref={agendaRef}
          collapsable={false}
          onLayout={(e) => {
            homeTourY.current.agenda = e.nativeEvent.layout.y;
          }}
          style={styles.careAgendaCard}
        >
          <View style={styles.agendaHeaderRow}>
            <View style={styles.agendaTitleGroup}>
              <View style={styles.agendaIconBadge}>
                <Ionicons name="shield-checkmark-outline" size={17} color={theme.primary} />
              </View>
              <View style={styles.agendaTitleTextCol}>
                <Text style={styles.agendaEyebrow} numberOfLines={1}>
                  {t('home.clinicalSchedule') || 'CLINICAL SCHEDULE'}
                </Text>
                <Text style={styles.agendaHeaderTitle} numberOfLines={1}>
                  {t('vetAppointments.cardTitle') || 'Upcoming Care Agenda'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.findVetsPill}
              onPress={() => navigation.navigate('More', { openVetFinder: true })}
              activeOpacity={0.75}
            >
              <Feather name="navigation" size={13} color={theme.primary} />
              <Text style={styles.findVetsPillText} numberOfLines={1}>
                {t('nearbyVets.findVets') || 'Vet Finder'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Two-Column Care Schedule Grid: Next Vet Visit + Parasite Shield */}
          <View style={styles.agendaTwoColGrid}>
            {/* Column 1: Next Vet Visit */}
            <View style={styles.agendaColCard}>
              <View style={styles.agendaColTopRow}>
                <View style={styles.agendaItemIconCircle}>
                  <Ionicons name="medkit-outline" size={16} color={theme.primary} />
                </View>
                {nextAppointment ? (
                  <TouchableOpacity
                    style={styles.agendaSecondaryBtn}
                    onPress={() => {
                      setEditingAppointment(nextAppointment);
                      setShowVetModal(true);
                    }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Feather name="edit-2" size={12} color={theme.textDark} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <Text style={styles.agendaItemTitle} numberOfLines={1}>
                {nextAppointment
                  ? nextAppointment.title
                  : t('vetAppointments.noUpcomingTitle') || 'Next Vet Visit'}
              </Text>
              <Text style={styles.agendaItemMeta} numberOfLines={2}>
                {nextAppointment
                  ? [
                      nextAppointment.clinicName,
                      `${nextAppointment.appointmentDate}`,
                      (() => {
                        const diffMs =
                          getAppointmentDateTime(
                            nextAppointment.appointmentDate,
                            nextAppointment.appointmentTime
                          ).getTime() - Date.now();
                        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                        return diffDays <= 0
                          ? t('home.today') || 'Today'
                          : `In ${diffDays}d`;
                      })(),
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : t('vetAppointments.noUpcomingSubtitle') || 'No visit scheduled'}
              </Text>

              {nextAppointment ? (
                <TouchableOpacity
                  style={[styles.agendaPrimaryBtn, { marginTop: 10, justifyContent: 'center' }]}
                  onPress={() => handleCompleteWithNotes(nextAppointment.id)}
                  activeOpacity={0.8}
                >
                  <Feather name="check" size={13} color="#FFFFFF" />
                  <Text style={styles.agendaPrimaryBtnText}>
                    {t('common.done') || 'Done'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.agendaOutlineBtn, { marginTop: 10, justifyContent: 'center' }]}
                  onPress={() => {
                    setEditingAppointment(null);
                    setShowVetModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Feather name="plus" size={13} color={theme.primary} />
                  <Text style={styles.agendaOutlineBtnText} numberOfLines={1}>
                    {t('vetAppointments.scheduleBtn') || 'Schedule'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Column 2: Vaccine & Parasite Shield */}
            <TouchableOpacity
              style={styles.agendaColCard}
              onPress={() => {
                if (activeDog) {
                  navigation.navigate('Pets', { dogId: activeDog.id, openAddParasite: true });
                } else {
                  navigation.navigate('Pets', { openAddParasite: true });
                }
              }}
              activeOpacity={0.8}
            >
              <View style={styles.agendaColTopRow}>
                <View
                  style={[
                    styles.agendaItemIconCircle,
                    preventiveStatusInfo?.isOverdue && { backgroundColor: theme.allergenBg },
                  ]}
                >
                  {preventiveStatusInfo?.kind === 'vaccine' ? (
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={16}
                      color={preventiveStatusInfo?.isOverdue ? theme.allergenText : theme.primary}
                    />
                  ) : (
                    <Feather
                      name="shield"
                      size={15}
                      color={preventiveStatusInfo?.isOverdue ? theme.allergenText : theme.primary}
                    />
                  )}
                </View>
              </View>

              <Text style={styles.agendaItemTitle} numberOfLines={1}>
                {nextPreventiveTreatment
                  ? nextPreventiveTreatment.vaccine_name
                  : t('treatments.tabs.parasiteShield') || 'Parasite Shield'}
              </Text>
              <Text
                style={[
                  styles.agendaItemMeta,
                  preventiveStatusInfo?.isOverdue && {
                    color: theme.allergenText,
                    fontWeight: '700',
                  },
                ]}
                numberOfLines={2}
              >
                {nextPreventiveTreatment && preventiveStatusInfo
                  ? `${preventiveStatusInfo.label} · ${nextPreventiveTreatment.next_due_date}`
                  : t('treatments.noParasiteTracked') || 'Flea, tick & vaccine log'}
              </Text>

              <View style={[styles.agendaOutlineBtn, { marginTop: 10, justifyContent: 'center' }]}>
                <Text style={styles.agendaOutlineBtnText} numberOfLines={1}>
                  {nextPreventiveTreatment
                    ? t('common.edit') || 'Manage'
                    : `+ ${t('common.add') || 'Add'}`}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ================================================================== */}
        {/* SECTION 4: AI COMPANION & COLLAPSIBLE DAILY INSIGHT TRAY           */}
        {/* ================================================================== */}
        <View
          ref={aiRef}
          collapsable={false}
          onLayout={(e) => {
            homeTourY.current.ai = e.nativeEvent.layout.y;
          }}
          style={styles.aiInsightTray}
        >
          {/* Top Half: Integrated AI Care Companion */}
          <View style={styles.aiCompanionRow}>
            <View style={styles.aiCompanionIconBox}>
              <Ionicons name="sparkles-outline" size={18} color={theme.primary} />
            </View>
            <View style={styles.aiCompanionTextCol}>
              <Text style={styles.aiCompanionTitle}>
                {t('home.careConsultationPrompt') || 'Have a symptom or food question?'}
              </Text>
              <Text style={styles.aiCompanionSubtitle}>
                {t('home.aiQuestionSubtitle', { name: activeDogName }) ||
                  `Ask Bisco AI for fast, vet-informed guidance for ${activeDogName}.`}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.aiCompanionActionRow}
            onPress={() => navigation.navigate('Chat', { fromLink: true })}
            activeOpacity={0.85}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={16} color="#FFFFFF" />
            <Text style={styles.aiCompanionActionText}>
              {t('home.startCareConsultation') || 'Start Care Consultation →'}
            </Text>
          </TouchableOpacity>

          <View style={styles.aiCompanionDivider} />

          {/* Bottom Half: Collapsible Curated Daily Vet Insight */}
          <TouchableOpacity
            style={styles.tipHeaderRow}
            onPress={() => {
              triggerLightHaptic();
              setTipExpanded((prev) => !prev);
            }}
            activeOpacity={0.75}
          >
            <View style={styles.tipBadge}>
              <Ionicons
                name="sparkles-outline"
                size={13}
                color={isDarkMode ? '#86EFAC' : '#2D5A3E'}
              />
              <Text style={styles.tipBadgeText}>{currentTip.badge}</Text>
            </View>
            <View style={styles.tipTitleInlineCol}>
              <Text style={styles.tipTitleInline} numberOfLines={1}>
                {currentTip.title}
              </Text>
            </View>
            <Feather
              name={tipExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={theme.textMuted}
            />
          </TouchableOpacity>

          {tipExpanded ? (
            <View style={styles.tipExpandedBox}>
              <Text style={styles.tipBody}>{currentTip.body}</Text>
              <TouchableOpacity
                onPress={() => {
                  triggerLightHaptic();
                  setTipOffset((prev) => prev + 1);
                }}
                style={styles.nextTipBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="refresh-cw" size={12} color={theme.primary} />
                <Text style={styles.nextTipText}>{t('home.nextTip') || 'Next tip'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <TabTour
          tab="home"
          enabled={dogs.length > 0}
          onFinish={() => homeScrollRef.current?.scrollTo({ y: 0, animated: true })}
          steps={[
            {
              targetRef: petStripRef,
              position: 'bottom',
              title: t('tour.home.s1Title'),
              body: t('tour.home.s1Body'),
              ensureVisible: () => homeScrollRef.current?.scrollTo({ y: 0, animated: true }),
            },
            {
              targetRef: rhythmRef,
              position: 'bottom',
              title: t('tour.home.s2Title'),
              body: t('tour.home.s2Body'),
              ensureVisible: () => scrollToHomeTour((homeTourY.current.passport ?? 80) + 40),
            },
            {
              targetRef: agendaRef,
              position: 'bottom',
              title: t('tour.home.s3Title'),
              body: t('tour.home.s3Body'),
              ensureVisible: () => scrollToHomeTour(homeTourY.current.agenda),
            },
            {
              targetRef: aiRef,
              position: 'top',
              title: t('tour.home.s5Title'),
              body: t('tour.home.s5Body'),
              ensureVisible: () => scrollToHomeTour(homeTourY.current.ai),
            },
          ]}
        />
      </ScrollView>

      {/* Vet Visit Completion & Clinical Notes Modal */}
      <Modal
        visible={showCompleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.completeModalBackdrop}
        >
          <View style={styles.completeModalCard}>
            <View style={styles.completeModalTitleRow}>
              <View style={styles.agendaIconBadge}>
                <Ionicons name="medkit-outline" size={18} color={theme.primary} />
              </View>
              <Text style={styles.completeModalTitle}>
                {t('vetAppointments.completeVisitTitle') || 'Complete Vet Visit & Add Notes'}
              </Text>
            </View>
            <Text style={styles.completeModalSub}>
              {completingAppt?.clinicName ? `${completingAppt.clinicName} · ` : ''}
              {completingAppt?.title}
            </Text>

            <Text style={styles.completeModalLabel}>
              {t('vetAppointments.clinicalNotesLabel')}
            </Text>
            <TextInput
              style={styles.completeModalInput}
              placeholder={t('vetAppointments.notesPlaceholder')}
              placeholderTextColor={theme.textMuted}
              value={completeNotes}
              onChangeText={setCompleteNotes}
              multiline
            />

            <View style={styles.completeModalNoticeRow}>
              <Feather name="file-text" size={14} color={theme.textMuted} />
              <Text style={styles.completeModalNoticeText}>
                {t('vetAppointments.savedToReportNotice')}
              </Text>
            </View>

            <View style={styles.completeModalActions}>
              <TouchableOpacity
                onPress={() => setShowCompleteModal(false)}
                style={styles.completeModalCancelBtn}
              >
                <Text style={{ color: theme.textMuted, fontWeight: '600' }}>
                  {t('common.cancel') || 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveCompletion}
                style={styles.completeModalSaveBtn}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
                  {t('vetAppointments.saveAndComplete')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
      width: 46,
      height: 46,
      borderRadius: 23,
      borderWidth: 2,
      borderColor: theme.border,
    },
    avatarPlaceholder: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1.5,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
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
      backgroundColor: theme.primaryLight,
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
    // Section 1: Hero Companion Passport & Care Rhythm
    passportCard: {
      backgroundColor: theme.surface,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 18,
      marginBottom: 16,
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
      minWidth: 0,
    },
    passportTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
      marginBottom: 3,
    },
    passportBadgesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 0,
    },
    streakInlinePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: isDarkMode ? '#3B2A1A' : '#FEF3C7',
      borderColor: isDarkMode ? '#6B4F2E' : '#FDE68A',
      borderWidth: 1,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 10,
    },
    streakInlineText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#D97706',
    },
    passportName: {
      flex: 1,
      minWidth: 0,
      fontSize: 20,
      fontWeight: '800',
      color: theme.textDark,
      letterSpacing: -0.3,
      flexShrink: 1,
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
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      borderWidth: 1,
    },
    stampDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    stampText: {
      fontSize: 10,
      fontWeight: '800',
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
      minWidth: 0,
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
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    habitTokenIconBoxDone: {
      backgroundColor: theme.done,
    },
    habitTokenTextCol: {
      flex: 1,
      minWidth: 0,
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
      marginBottom: 16,
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
    // Section 2: Weekly Routines & Supplements Strip
    weeklyCard: {
      backgroundColor: theme.surface,
      borderRadius: 22,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1.5,
      borderColor: theme.border,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        android: { elevation: 2 },
      }),
    },
    weeklyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 10,
    },
    weeklyHeaderIconBox: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    weeklyHeaderTextCol: {
      flex: 1,
    },
    weeklySectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textDark,
      letterSpacing: 0.2,
    },
    weeklySectionSubtitle: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 1,
    },
    weeklyItemsList: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    weeklyItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
    },
    weeklyItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    weeklyItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 10,
      marginRight: 10,
    },
    weeklyItemIconBox: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: theme.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    weeklyItemIconBoxDone: {
      backgroundColor: theme.done,
      borderColor: theme.done,
    },
    weeklyItemTextCol: {
      flex: 1,
    },
    weeklyItemTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textDark,
    },
    weeklyItemTitleDone: {
      color: theme.textMuted,
      textDecorationLine: 'line-through',
    },
    weeklyItemSubtitle: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 2,
    },
    weeklyLogBtn: {
      backgroundColor: theme.primary,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 14,
    },
    weeklyLogBtnDone: {
      backgroundColor: theme.done,
    },
    weeklyLogBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    weeklyLogBtnTextDone: {
      color: '#FFFFFF',
    },
    // Section 3: Upcoming Care Agenda Card
    careAgendaCard: {
      backgroundColor: theme.surface,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.2 : 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    agendaHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 14,
    },
    agendaTitleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
      minWidth: 0,
    },
    agendaTitleTextCol: {
      flex: 1,
      minWidth: 0,
    },
    agendaIconBadge: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    agendaEyebrow: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
      color: theme.textMuted,
    },
    agendaHeaderTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.textDark,
      letterSpacing: -0.2,
    },
    findVetsPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: theme.primaryLight,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      flexShrink: 0,
    },
    findVetsPillText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
    },
    agendaTwoColGrid: {
      flexDirection: 'row',
      gap: 10,
    },
    agendaColCard: {
      flex: 1,
      minWidth: 0,
      backgroundColor: theme.surfaceAlt,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.border,
      justifyContent: 'space-between',
    },
    agendaColTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    agendaItemBox: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    agendaItemTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    agendaItemIconCircle: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: theme.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      flexShrink: 0,
    },
    agendaItemTextCol: {
      flex: 1,
      minWidth: 0,
    },
    agendaItemTitle: {
      fontSize: 13.5,
      fontWeight: '700',
      color: theme.textDark,
    },
    agendaItemMeta: {
      fontSize: 11.5,
      color: theme.textMuted,
      marginTop: 2,
      lineHeight: 15,
    },
    agendaActionsInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 0,
    },
    agendaSecondaryBtn: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    agendaPrimaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.done,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
    },
    agendaPrimaryBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    agendaOutlineBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      flexShrink: 0,
    },
    agendaOutlineBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
    },
    // Section 4: AI Companion & Daily Insight Tray
    aiInsightTray: {
      backgroundColor: theme.surface,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.2 : 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    tipHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    tipTitleInlineCol: {
      flex: 1,
      minWidth: 0,
    },
    tipTitleInline: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textDark,
    },
    tipExpandedBox: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.divider,
      gap: 8,
    },
    tipBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: isDarkMode ? '#243C2E' : '#E5F0E4',
      borderRadius: 10,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: isDarkMode ? '#355944' : '#CCE0CB',
    },
    tipBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: isDarkMode ? '#86EFAC' : '#2D5A3E',
      letterSpacing: 0.3,
    },
    nextTipBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
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
      marginBottom: 5,
      letterSpacing: -0.2,
    },
    tipBody: {
      fontSize: 13,
      color: theme.textMuted,
      lineHeight: 19,
    },
    aiCompanionDivider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: 14,
    },
    aiCompanionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 12,
    },
    aiCompanionIconBox: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    aiCompanionTextCol: {
      flex: 1,
    },
    aiCompanionTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.textDark,
      marginBottom: 2,
      letterSpacing: -0.2,
    },
    aiCompanionSubtitle: {
      fontSize: 12,
      color: theme.textMuted,
      lineHeight: 17,
    },
    aiCompanionActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.primary,
      borderRadius: 14,
      paddingVertical: 11,
    },
    aiCompanionActionText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },
    // Complete Vet Visit Modal
    completeModalBackdrop: {
      flex: 1,
      backgroundColor: isDarkMode ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    completeModalCard: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: theme.surface,
      borderRadius: 22,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.border,
    },
    completeModalTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 6,
    },
    completeModalTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.textDark,
      flex: 1,
    },
    completeModalSub: {
      fontSize: 13,
      color: theme.textMuted,
      marginBottom: 14,
    },
    completeModalLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textDark,
      marginBottom: 6,
    },
    completeModalInput: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      fontSize: 14,
      color: theme.textDark,
      minHeight: 90,
      textAlignVertical: 'top',
      marginBottom: 14,
    },
    completeModalNoticeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 16,
    },
    completeModalNoticeText: {
      fontSize: 12,
      color: theme.textMuted,
      lineHeight: 16,
      flex: 1,
    },
    completeModalActions: {
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'flex-end',
    },
    completeModalCancelBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
    },
    completeModalSaveBtn: {
      backgroundColor: theme.primary,
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 10,
    },
  });
}
