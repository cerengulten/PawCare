import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Alert, BackHandler, Linking, StyleSheet } from 'react-native';
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
import { RootTabParamList } from './AppTabs';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { SUPPORTED_LANGS, LANG_LABELS } from '../lib/i18n';
import { ThemeTokens } from '../lib/themes';
import SwipeBackWrapper from '../components/SwipeBackWrapper';
import TabTour from '../components/TabTour';
import { resetAllTours } from '../lib/hooks/useTourState';
import { cancelAllLocalNotifications } from '../lib/notifications';

type Props = BottomTabScreenProps<RootTabParamList, 'More'> & {
  dogs: ReturnType<typeof useDogs>['dogs'];
  profile: ReturnType<typeof useProfile>['profile'];
  notificationsState?: ReturnType<typeof useNotifications>;
};

export default function MoreScreen({ route, navigation, dogs, profile, notificationsState: passedNotifications }: Props) {
  const { theme } = useTheme();
  const { t, lang, setLang } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { upcoming, overdue } = useAllVaccines();
  const localNotifications = useNotifications(profile?.id ?? null);
  const notificationsState = passedNotifications ?? localNotifications;
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [reportDog, setReportDog] = useState<Dog | null>(null);
  const [showVetFinder, setShowVetFinder] = useState(false);
  const [vetFinderFromHome, setVetFinderFromHome] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [legalDoc, setLegalDoc] = useState<'terms' | 'privacy' | null>(null);
  const upcomingRef = useRef<View>(null);
  const comingSoonRef = useRef<View>(null);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
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
    }, [legalDoc, reportDog, showVetFinder, vetFinderFromHome, showChangePassword, showChangeEmail, showDeleteAccount, showNotifications, showLanguage, navigation])
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

  const allUpcoming = [...overdue, ...upcoming];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('more.title')}</Text>

      <View style={styles.profileCard}>
        <View style={styles.profileRow}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarEmoji}>🐾</Text>
            </View>
          )}
          <View>
            <Text style={styles.profileName}>{profile?.full_name ?? t('more.biscoUser')}</Text>
            <Text style={styles.profileMeta}>
              {profile?.username ? `@${profile.username} · ` : ''}{t('more.petCount', { count: dogs.length })}
            </Text>
          </View>
        </View>
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

      <Text style={styles.sectionTitle}>{t('more.comingSoonSection')}</Text>
      <View ref={comingSoonRef} collapsable={false} style={styles.card}>
        <View style={[styles.row, styles.rowDisabled]}>
          <View style={styles.iconBox}><Text style={styles.iconText}>🛡️</Text></View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>{t('more.allergyScanner')}</Text>
            <Text style={styles.rowSubtitle}>{t('more.allergyScannerSubtitle')}</Text>
          </View>
          <View style={styles.grayChip}><Text style={styles.grayChipText}>{t('more.soon')}</Text></View>
        </View>
        <View style={styles.divider} />
        <View style={[styles.row, styles.rowDisabled]}>
          <View style={styles.iconBox}><Text style={styles.iconText}>👥</Text></View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>{t('more.community')}</Text>
            <Text style={styles.rowSubtitle}>{t('more.communitySubtitle')}</Text>
          </View>
          <View style={styles.grayChip}><Text style={styles.grayChipText}>{t('more.soon')}</Text></View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('settings.title')}</Text>
      <View style={styles.card}>
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
          { targetRef: comingSoonRef, position: 'top', title: t('tour.more.s2Title'), body: t('tour.more.s2Body') },
        ]}
      />
    </ScrollView>
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
      fontSize: 18,
      fontWeight: '500',
      color: theme.textDark,
      marginBottom: 16,
    },
    profileCard: {
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      borderWidth: 0.5,
      borderColor: theme.border,
      padding: 16,
      marginBottom: 12,
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
    },
    avatarPlaceholder: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.moodSelBg,
      borderWidth: 1.5,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarEmoji: {
      fontSize: 26,
    },
    profileName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textDark,
    },
    profileMeta: {
      fontSize: 13,
      color: theme.textMuted,
      marginTop: 2,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textMuted,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      paddingHorizontal: 2,
      paddingBottom: 6,
      paddingTop: 8,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 14,
      borderWidth: 0.5,
      borderColor: theme.border,
      padding: 14,
      marginBottom: 12,
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
    rowDisabled: {
      opacity: 0.55,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 11,
      backgroundColor: theme.divider,
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
    grayChip: {
      backgroundColor: theme.notStartedBg,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    grayChipText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.notStartedText,
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
