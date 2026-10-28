import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  BackHandler,
  Switch,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { supabase } from '../lib/supabase';
import { Dog } from '../types';
import { useProfile } from '../lib/hooks/useProfile';
import { useDogs } from '../lib/hooks/useDogs';
import { useAllVaccines } from '../lib/hooks/useAllVaccines';
import { useNotifications } from '../lib/hooks/useNotifications';
import VaccineCard from '../components/VaccineCard';
import ReportPickerScreen from './ReportPickerScreen';
import NotificationsScreen from './NotificationsScreen';
import VetFinderScreen from './VetFinderScreen';
import ChangePasswordScreen from './ChangePasswordScreen';
import ChangeEmailScreen from './ChangeEmailScreen';
import DeleteAccountScreen from './DeleteAccountScreen';
import LegalDocScreen from './LegalDocScreen';
import ProfileScreen from './ProfileScreen';
import { RootTabParamList } from './AppTabs';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { useSubscription } from '../lib/SubscriptionContext';
import { SUPPORTED_LANGS, LANG_LABELS } from '../lib/i18n';
import { ThemeTokens } from '../lib/themes';
import SwipeBackWrapper from '../components/SwipeBackWrapper';
import TabTour from '../components/TabTour';
import { resetAllTours } from '../lib/hooks/useTourState';
import { cancelAllLocalNotifications } from '../lib/notifications';

const ROADMAP_VOTES_KEY = '@bisco_roadmap_votes';
const LEGACY_ROADMAP_VOTES_KEY = '@pawcare_roadmap_votes';

type Props = BottomTabScreenProps<RootTabParamList, 'More'> & {
  dogs: ReturnType<typeof useDogs>['dogs'];
  profile: ReturnType<typeof useProfile>['profile'];
  updateProfile?: ReturnType<typeof useProfile>['updateProfile'];
  checkUsernameAvailable?: ReturnType<typeof useProfile>['checkUsernameAvailable'];
  notificationsState?: ReturnType<typeof useNotifications>;
};

type WishlistItem = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  baseVotes: number;
};

const WISHLIST_ITEMS: WishlistItem[] = [
  {
    id: 'food_scanner',
    icon: '🔍',
    title: 'Smart Barcode & Food Scanner',
    subtitle: 'Scan ingredient labels to detect allergens, low-grade fillers & safety ratings',
    baseVotes: 142,
  },
  {
    id: 'community_qa',
    icon: '👥',
    title: 'Pet Parent Community Q&A',
    subtitle: 'Connect with verified owners of the same breed and local playdate groups',
    baseVotes: 98,
  },
  {
    id: 'prescription_tracker',
    icon: '💊',
    title: 'Medication Refill Tracker',
    subtitle: 'Auto-countdown doses and alert you before prescription refills run out',
    baseVotes: 87,
  },
  {
    id: 'telehealth_chat',
    icon: '🩺',
    title: 'Vet Telehealth Quick-Chat',
    subtitle: '24/7 triage guidance with certified veterinary technicians',
    baseVotes: 165,
  },
];

export default function MoreScreen({
  route,
  navigation,
  dogs,
  profile,
  updateProfile,
  checkUsernameAvailable,
  notificationsState: passedNotifications,
}: Props) {
  const { theme, isDarkMode, toggleDarkMode } = useTheme();
  const { isPro, plan, openPaywall } = useSubscription();
  const { t, lang, setLang } = useT();
  const styles = useMemo(() => makeStyles(theme, isDarkMode), [theme, isDarkMode]);
  const { upcoming, overdue } = useAllVaccines();
  const localNotifications = useNotifications(profile?.id ?? null);
  const notificationsState = passedNotifications ?? localNotifications;
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [reportDog, setReportDog] = useState<Dog | null>(null);
  const [showVetFinder, setShowVetFinder] = useState(false);
  const [vetFinderFromHome, setVetFinderFromHome] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [legalDoc, setLegalDoc] = useState<'terms' | 'privacy' | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, boolean>>({});

  const upcomingRef = useRef<View>(null);
  const roadmapRef = useRef<View>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = (await AsyncStorage.getItem(ROADMAP_VOTES_KEY)) || (await AsyncStorage.getItem(LEGACY_ROADMAP_VOTES_KEY));
        if (raw) setUserVotes(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  const toggleVote = async (id: string) => {
    const nextState = { ...userVotes, [id]: !userVotes[id] };
    setUserVotes(nextState);
    try {
      await AsyncStorage.setItem(ROADMAP_VOTES_KEY, JSON.stringify(nextState));
      if (nextState[id]) {
        Alert.alert(
          'Vote Recorded! 🎉',
          'Thank you for helping shape Bisco! We prioritize upcoming features based on your votes.'
        );
      }
    } catch {
      // ignore persistence error
    }
  };

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (showProfile) {
          setShowProfile(false);
          return true;
        }
        if (legalDoc !== null) {
          setLegalDoc(null);
          return true;
        }
        if (reportDog !== null) {
          setReportDog(null);
          return true;
        }
        if (showVetFinder) {
          setShowVetFinder(false);
          if (vetFinderFromHome) {
            setVetFinderFromHome(false);
            navigation.navigate('Home');
          }
          return true;
        }
        if (showChangePassword) {
          setShowChangePassword(false);
          return true;
        }
        if (showChangeEmail) {
          setShowChangeEmail(false);
          return true;
        }
        if (showDeleteAccount) {
          setShowDeleteAccount(false);
          return true;
        }
        if (showNotifications) {
          setShowNotifications(false);
          return true;
        }
        if (showLanguage) {
          setShowLanguage(false);
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [showProfile, legalDoc, reportDog, showVetFinder, vetFinderFromHome, showChangePassword, showChangeEmail, showDeleteAccount, showNotifications, showLanguage, navigation])
  );

  useEffect(() => {
    if (route.params?.openVetFinder) {
      setReportDog(null);
      setShowNotifications(false);
      setShowLanguage(false);
      setShowChangePassword(false);
      setShowChangeEmail(false);
      setShowDeleteAccount(false);
      setLegalDoc(null);
      setShowVetFinder(true);
      setVetFinderFromHome(true);
      navigation.setParams({ openVetFinder: undefined });
    }
  }, [route.params?.openVetFinder]);

  if (showVetFinder) {
    return (
      <VetFinderScreen
        onBack={() => {
          setShowVetFinder(false);
          if (vetFinderFromHome) {
            setVetFinderFromHome(false);
            navigation.navigate('Home');
          }
        }}
      />
    );
  }

  if (legalDoc !== null) {
    return <LegalDocScreen type={legalDoc} onBack={() => setLegalDoc(null)} />;
  }

  if (reportDog) {
    return <ReportPickerScreen dog={reportDog} onBack={() => setReportDog(null)} />;
  }

  if (showChangePassword) {
    return <ChangePasswordScreen onDone={() => setShowChangePassword(false)} onCancel={() => setShowChangePassword(false)} />;
  }

  if (showChangeEmail) {
    return <ChangeEmailScreen onDone={() => setShowChangeEmail(false)} onCancel={() => setShowChangeEmail(false)} />;
  }

  if (showDeleteAccount) {
    return <DeleteAccountScreen onCancel={() => setShowDeleteAccount(false)} />;
  }

  if (showNotifications) {
    return (
      <NotificationsScreen
        notificationsState={notificationsState}
        onBack={() => setShowNotifications(false)}
        onNavigateToPet={(dogId) => { setShowNotifications(false); navigation.navigate('Pets', { dogId }); }}
        onOpenVetFinder={() => { setShowNotifications(false); setShowVetFinder(true); }}
      />
    );
  }

  if (showLanguage) {
    return (
      <SwipeBackWrapper onBack={() => setShowLanguage(false)}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => setShowLanguage(false)} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{t('language.title')}</Text>
          <Text style={styles.sectionTitle}>{t('language.subtitle')}</Text>
          <View style={styles.card}>
            {SUPPORTED_LANGS.map((code, idx) => (
              <View key={code}>
                <TouchableOpacity style={styles.row} onPress={() => setLang(code)}>
                  <View style={styles.iconBox}><Text style={styles.iconText}>🌐</Text></View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle}>{LANG_LABELS[code]}</Text>
                  </View>
                  {lang === code ? <Text style={styles.langCheck}>✓</Text> : null}
                </TouchableOpacity>
                {idx < SUPPORTED_LANGS.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
      </SwipeBackWrapper>
    );
  }

  if (showProfile && updateProfile && checkUsernameAvailable) {
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

  const allUpcoming = [...overdue, ...upcoming];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('more.title')}</Text>

      <TouchableOpacity
        style={styles.profileCard}
        onPress={() => {
          if (updateProfile && checkUsernameAvailable) setShowProfile(true);
        }}
        activeOpacity={0.8}
        disabled={!updateProfile || !checkUsernameAvailable}
      >
        <View style={styles.profileRow}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarEmoji}>🐾</Text>
            </View>
          )}
          <View style={styles.profileInfoCol}>
            <Text style={styles.profileName}>{profile?.full_name ?? t('more.biscoUser')}</Text>
            <Text style={styles.profileMeta}>
              {profile?.username ? `@${profile.username} · ` : ''}{t('more.petCount', { count: dogs.length })}
            </Text>
          </View>
          {updateProfile && checkUsernameAvailable ? (
            <View style={styles.editProfileBadge}>
              <Text style={styles.editProfileBadgeText}>✏️ {t('common.edit')}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>

      {/* Bisco Pro Membership Card (Freemium & Premium System) */}
      <View style={isPro ? styles.proCardActive : styles.proCardUpgrade}>
        <View style={styles.proRow}>
          <View style={isPro ? styles.proIconBoxActive : styles.proIconBox}>
            <Text style={styles.proIconText}>👑</Text>
          </View>
          <View style={styles.proInfo}>
            <View style={styles.proTitleRow}>
              <Text style={styles.proTitle}>{isPro ? 'Bisco Pro Member' : 'Upgrade to Bisco Pro'}</Text>
              <View style={isPro ? styles.proTagActive : styles.proTagUpgrade}>
                <Text style={isPro ? styles.proTagTextActive : styles.proTagText}>
                  {isPro ? (plan === 'annual' ? 'ANNUAL' : 'PRO') : 'SAVE 58%'}
                </Text>
              </View>
            </View>
            <Text style={styles.proSubtitle}>
              {isPro
                ? 'All premium capabilities unlocked: unlimited pets, 24/7 AI, and Vet PDF dossiers.'
                : 'Unlimited pets, 24/7 AI triage consultations & 1-tap Vet PDF dossiers.'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={isPro ? styles.proBtnActive : styles.proBtnUpgrade}
          onPress={() => openPaywall('general')}
          activeOpacity={0.85}
        >
          <Text style={isPro ? styles.proBtnTextActive : styles.proBtnTextUpgrade}>
            {isPro ? 'Manage Membership →' : 'Explore Plans (7-Day Trial) →'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>{t('more.upcoming')}</Text>
      <View ref={upcomingRef} collapsable={false} style={styles.card}>
        {allUpcoming.length === 0 ? (
          <Text style={styles.emptyText}>{t('more.noVaccinesTracked')}</Text>
        ) : (
          allUpcoming.map((v, idx) => (
            <View key={v.id}>
              <VaccineCard
                vaccine={v}
                isOverdue={overdue.includes(v)}
                dogName={v.dogName}
                compact
                onPress={() => navigation.navigate('Pets', { dogId: v.dog_id })}
              />
              {idx < allUpcoming.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))
        )}
      </View>

      {dogs.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>{t('more.downloadReport')}</Text>
          <View style={styles.card}>
            {dogs.map((dog, idx) => (
              <View key={dog.id}>
                <TouchableOpacity style={styles.row} onPress={() => setReportDog(dog)}>
                  <View style={styles.iconBox}><Text style={styles.iconText}>📄</Text></View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle}>{dog.name}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
                {idx < dogs.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </View>
        </>
      ) : null}

      <Text style={styles.sectionTitle}>{t('more.vetFinder')}</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.row} onPress={() => setShowVetFinder(true)}>
          <View style={styles.iconBox}><Text style={styles.iconText}>📍</Text></View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>{t('more.vetFinder')}</Text>
            <Text style={styles.rowSubtitle}>{t('more.vetFinderSubtitle')}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Feature Wishlist & Roadmap Section (Eliminates dead 'Coming Soon' gray block) */}
      <Text style={styles.sectionTitle}>PawCare Roadmap & Wishlist</Text>
      <View ref={roadmapRef} collapsable={false} style={styles.card}>
        <Text style={styles.wishlistHeaderSubtitle}>
          Vote for upcoming capabilities you want our team to build next:
        </Text>
        {WISHLIST_ITEMS.map((item, idx) => {
          const hasVoted = !!userVotes[item.id];
          const voteCount = item.baseVotes + (hasVoted ? 1 : 0);
          return (
            <View key={item.id}>
              <View style={styles.wishlistRow}>
                <View style={styles.iconBox}><Text style={styles.iconText}>{item.icon}</Text></View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.voteButton, hasVoted && styles.voteButtonActive]}
                  onPress={() => toggleVote(item.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.voteButtonText, hasVoted && styles.voteButtonTextActive]}>
                    {hasVoted ? `✓ ${voteCount}` : `👍 ${voteCount}`}
                  </Text>
                </TouchableOpacity>
              </View>
              {idx < WISHLIST_ITEMS.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>{t('settings.title')}</Text>
      <View style={styles.card}>
        {updateProfile && checkUsernameAvailable ? (
          <>
            <TouchableOpacity style={styles.row} onPress={() => setShowProfile(true)}>
              <View style={styles.iconBox}><Text style={styles.iconText}>👤</Text></View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle}>{t('more.editProfile')}</Text>
                <Text style={styles.rowSubtitle}>{t('more.editProfileSubtitle')}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
          </>
        ) : null}

        {/* Dark Theme Toggle */}
        <View style={styles.row}>
          <View style={styles.iconBox}>
            <Text style={styles.iconText}>{isDarkMode ? '🌙' : '☀️'}</Text>
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Dark Mode</Text>
            <Text style={styles.rowSubtitle}>
              {isDarkMode ? 'Warm charcoal & midnight' : 'Warm oat linen & terracotta'}
            </Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.row} onPress={() => setShowNotifications(true)}>
          <View style={styles.iconBox}><Text style={styles.iconText}>🔔</Text></View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>{t('settings.notifications')}</Text>
          </View>
          {notificationsState.unreadCount > 0 ? (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{notificationsState.unreadCount}</Text>
            </View>
          ) : null}
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.row}
          onPress={async () => {
            await resetAllTours();
            Alert.alert(t('tour.replayDoneTitle'), t('tour.replayDoneBody'));
          }}
        >
          <View style={styles.iconBox}><Text style={styles.iconText}>🎯</Text></View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>{t('tour.replay')}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.row} onPress={() => setShowLanguage(true)}>
          <View style={styles.iconBox}><Text style={styles.iconText}>🌐</Text></View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>{t('settings.language')}</Text>
          </View>
          <Text style={styles.rowValue}>{LANG_LABELS[lang]}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.row} onPress={() => setShowChangePassword(true)}>
          <View style={styles.iconBox}><Text style={styles.iconText}>🔒</Text></View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>{t('settings.changePassword')}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.row} onPress={() => setShowChangeEmail(true)}>
          <View style={styles.iconBox}><Text style={styles.iconText}>✉️</Text></View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>{t('settings.changeEmail')}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.row} onPress={() => setLegalDoc('privacy')}>
          <View style={styles.iconBox}><Text style={styles.iconText}>🛡️</Text></View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>{t('settings.privacyPolicy')}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.row} onPress={() => setLegalDoc('terms')}>
          <View style={styles.iconBox}><Text style={styles.iconText}>📜</Text></View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>{t('settings.termsOfService')}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.row}
          onPress={async () => {
            await cancelAllLocalNotifications();
            await supabase.auth.signOut();
          }}
        >
          <View style={styles.iconBox}><Text style={styles.iconText}>🚪</Text></View>
          <View style={styles.rowInfo}>
            <Text style={styles.signOutTitle}>{t('settings.signOut')}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>{t('settings.dangerZone')}</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.row} onPress={() => setShowDeleteAccount(true)}>
          <View style={styles.iconBox}><Text style={styles.iconText}>⚠️</Text></View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitleDanger}>{t('settings.deleteAccount')}</Text>
            <Text style={styles.rowSubtitle}>{t('settings.deleteAccountSubtitle')}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <TabTour
        tab="more"
        enabled
        steps={[
          { targetRef: upcomingRef, position: 'bottom', title: t('tour.more.s1Title'), body: t('tour.more.s1Body') },
          { targetRef: roadmapRef, position: 'top', title: 'Feature Wishlist', body: 'Vote on features you want us to add to Bisco next!' },
        ]}
      />
    </ScrollView>
  );
}

function makeStyles(theme: ThemeTokens, isDarkMode = false) {
  return StyleSheet.create({
    proCardUpgrade: {
      backgroundColor: isDarkMode ? '#281F1A' : '#FFF9EE',
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: isDarkMode ? '#4D3627' : '#F6E5CC',
      padding: 16,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    proCardActive: {
      backgroundColor: isDarkMode ? '#1B2721' : '#F3F7F2',
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: isDarkMode ? '#2D4438' : '#DDE8DC',
      padding: 16,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    proRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 12,
    },
    proIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDarkMode ? '#3B291E' : '#FFF2DB',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDarkMode ? '#5E3E2A' : '#F2D7AE',
    },
    proIconBoxActive: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDarkMode ? '#23382C' : '#E5EFE4',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDarkMode ? '#365A45' : '#CCDDCB',
    },
    proIconText: {
      fontSize: 20,
    },
    proInfo: {
      flex: 1,
    },
    proTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    proTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.textDark,
      letterSpacing: -0.2,
    },
    proTagUpgrade: {
      backgroundColor: isDarkMode ? '#3D2418' : '#FDF0E8',
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.primary,
    },
    proTagActive: {
      backgroundColor: isDarkMode ? '#1F3627' : '#E2EFE3',
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.done,
    },
    proTagText: {
      fontSize: 9,
      fontWeight: '800',
      color: theme.primary,
      letterSpacing: 0.4,
    },
    proTagTextActive: {
      fontSize: 9,
      fontWeight: '800',
      color: theme.done,
      letterSpacing: 0.4,
    },
    proSubtitle: {
      fontSize: 12,
      lineHeight: 17,
      color: theme.textMuted,
    },
    proBtnUpgrade: {
      backgroundColor: theme.primary,
      borderRadius: 14,
      paddingVertical: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    proBtnActive: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 14,
      paddingVertical: 11,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    proBtnTextUpgrade: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.2,
    },
    proBtnTextActive: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textDark,
    },
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 16,
      paddingTop: 56,
      paddingBottom: 32,
    },
    backRow: {
      padding: 16,
      paddingTop: 56,
    },
    backText: {
      color: theme.primary,
      fontSize: 16,
      fontWeight: '600',
    },
    notifBadge: {
      backgroundColor: theme.primary,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      paddingHorizontal: 5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    notifBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: 'white',
    },
    title: {
      fontSize: 22,
      fontWeight: '600',
      color: theme.textDark,
      marginBottom: 16,
    },
    profileCard: {
      backgroundColor: theme.surface,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 18,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDarkMode ? 0.25 : 0.05,
      shadowRadius: 10,
      elevation: 3,
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    avatarPlaceholder: {
      width: 56,
      height: 56,
      borderRadius: 20,
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1.5,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarEmoji: {
      fontSize: 26,
    },
    profileName: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.textDark,
      letterSpacing: -0.2,
    },
    profileMeta: {
      fontSize: 13,
      color: theme.textMuted,
      marginTop: 2,
      fontWeight: '500',
    },
    profileInfoCol: {
      flex: 1,
    },
    editProfileBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.border,
    },
    editProfileBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.primary,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.textMuted,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      paddingHorizontal: 2,
      paddingBottom: 8,
      paddingTop: 12,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    emptyText: {
      fontSize: 13,
      color: theme.textMuted,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
    },
    wishlistHeaderSubtitle: {
      fontSize: 12,
      color: theme.textMuted,
      marginBottom: 10,
      lineHeight: 16,
    },
    wishlistRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 8,
    },
    voteButton: {
      backgroundColor: theme.surfaceAlt,
      borderWidth: 0.5,
      borderColor: theme.border,
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 6,
      minWidth: 54,
      alignItems: 'center',
      justifyContent: 'center',
    },
    voteButtonActive: {
      backgroundColor: theme.primaryLight,
      borderColor: theme.primary,
    },
    voteButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textDark,
    },
    voteButtonTextActive: {
      color: theme.primary,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 11,
      backgroundColor: theme.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconText: {
      fontSize: 19,
    },
    rowInfo: {
      flex: 1,
      minWidth: 0,
    },
    rowTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.textDark,
    },
    rowSubtitle: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 1,
    },
    signOutTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.pendingAmberText,
    },
    rowTitleDanger: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.allergenText,
    },
    chevron: {
      fontSize: 16,
      color: theme.border,
    },
    rowValue: {
      fontSize: 13,
      color: theme.textMuted,
      marginRight: 4,
    },
    langCheck: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.primary,
    },
    divider: {
      height: 0.5,
      backgroundColor: theme.divider,
      marginVertical: 4,
    },
  });
}
