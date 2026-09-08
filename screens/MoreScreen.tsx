import { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet } from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { supabase } from '../lib/supabase';
import { Dog } from '../types';
import { useProfile } from '../lib/hooks/useProfile';
import { useDogs } from '../lib/hooks/useDogs';
import { useAllVaccines } from '../lib/hooks/useAllVaccines';
import VaccineCard from '../components/VaccineCard';
import ReportPickerScreen from './ReportPickerScreen';
import VetFinderScreen from './VetFinderScreen';
import ChangePasswordScreen from './ChangePasswordScreen';
import ChangeEmailScreen from './ChangeEmailScreen';
import DeleteAccountScreen from './DeleteAccountScreen';
import { RootTabParamList } from './AppTabs';
import { useTheme } from '../lib/ThemeContext';
import { ThemeTokens } from '../lib/themes';
import SwipeBackWrapper from '../components/SwipeBackWrapper';

type Props = BottomTabScreenProps<RootTabParamList, 'More'> & {
  dogs: ReturnType<typeof useDogs>['dogs'];
  profile: ReturnType<typeof useProfile>['profile'];
};

export default function MoreScreen({ route, navigation, dogs, profile }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { upcoming, overdue } = useAllVaccines();
  const [showNotifPlaceholder, setShowNotifPlaceholder] = useState(false);
  const [reportDog, setReportDog] = useState<Dog | null>(null);
  const [showVetFinder, setShowVetFinder] = useState(false);
  const [vetFinderFromHome, setVetFinderFromHome] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  useEffect(() => {
    if (route.params?.openVetFinder) {
      setShowVetFinder(true);
      setVetFinderFromHome(true);
      navigation.setParams({ openVetFinder: undefined });
    }
  }, [route.params?.openVetFinder]);

  if (reportDog) {
    return <ReportPickerScreen dog={reportDog} onBack={() => setReportDog(null)} />;
  }

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

  if (showChangePassword) {
    return <ChangePasswordScreen onDone={() => setShowChangePassword(false)} onCancel={() => setShowChangePassword(false)} />;
  }

  if (showChangeEmail) {
    return <ChangeEmailScreen onDone={() => setShowChangeEmail(false)} onCancel={() => setShowChangeEmail(false)} />;
  }

  if (showDeleteAccount) {
    return <DeleteAccountScreen onCancel={() => setShowDeleteAccount(false)} />;
  }

  if (showNotifPlaceholder) {
    return (
      <SwipeBackWrapper onBack={() => setShowNotifPlaceholder(false)}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => setShowNotifPlaceholder(false)} style={styles.backRow}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.center}>
          <Text style={styles.placeholderEmoji}>🔔</Text>
          <Text style={styles.placeholderTitle}>Notification settings</Text>
          <Text style={styles.placeholderSubtitle}>Coming soon.</Text>
        </View>
      </View>
      </SwipeBackWrapper>
    );
  }

  const allUpcoming = [...overdue, ...upcoming];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>More</Text>

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
            <Text style={styles.profileName}>{profile?.full_name ?? 'Bisco user'}</Text>
            <Text style={styles.profileMeta}>
              {profile?.username ? `@${profile.username} · ` : ''}{dogs.length} pet{dogs.length === 1 ? '' : 's'}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Upcoming</Text>
      <View style={styles.card}>
        {allUpcoming.length === 0 ? (
          <Text style={styles.emptyText}>No vaccines tracked yet.</Text>
        ) : (
          allUpcoming.map((v, idx) => (
            <View key={v.id}>
              <VaccineCard
                vaccine={v}
                isOverdue={overdue.includes(v)}
                dogName={v.dogName}
                onPress={() => {}}
              />
              {idx < allUpcoming.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))
        )}
      </View>

      {dogs.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Download report</Text>
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

      <Text style={styles.sectionTitle}>Vet Finder</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.row} onPress={() => setShowVetFinder(true)}>
          <View style={styles.iconBox}><Text style={styles.iconText}>📍</Text></View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Vet Finder</Text>
            <Text style={styles.rowSubtitle}>Find vets near you</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Coming soon</Text>
      <View style={styles.card}>
        <View style={[styles.row, styles.rowDisabled]}>
          <View style={styles.iconBox}><Text style={styles.iconText}>💬</Text></View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>AI Care Chat</Text>
            <Text style={styles.rowSubtitle}>Ask anything about your pets</Text>
          </View>
          <View style={styles.grayChip}><Text style={styles.grayChipText}>Soon</Text></View>
        </View>
        <View style={styles.divider} />
        <View style={[styles.row, styles.rowDisabled]}>
          <View style={styles.iconBox}><Text style={styles.iconText}>🛡️</Text></View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Allergy Scanner</Text>
            <Text style={styles.rowSubtitle}>Check food ingredients</Text>
          </View>
          <View style={styles.grayChip}><Text style={styles.grayChipText}>Soon</Text></View>
        </View>
        <View style={styles.divider} />
        <View style={[styles.row, styles.rowDisabled]}>
          <View style={styles.iconBox}><Text style={styles.iconText}>👥</Text></View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Community</Text>
            <Text style={styles.rowSubtitle}>Tips from dog owners</Text>
          </View>
          <View style={styles.grayChip}><Text style={styles.grayChipText}>Soon</Text></View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Settings</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.row} onPress={() => setShowNotifPlaceholder(true)}>
          <View style={styles.iconBox}><Text style={styles.iconText}>🔔</Text></View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Notifications</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.row} onPress={() => setShowChangePassword(true)}>
          <View style={styles.iconBox}><Text style={styles.iconText}>🔒</Text></View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Change password</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.row} onPress={() => setShowChangeEmail(true)}>
          <View style={styles.iconBox}><Text style={styles.iconText}>✉️</Text></View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Change email</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.row} onPress={() => supabase.auth.signOut()}>
          <View style={styles.iconBox}><Text style={styles.iconText}>🚪</Text></View>
          <View style={styles.rowInfo}>
            <Text style={styles.signOutTitle}>Sign out</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Danger zone</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.row} onPress={() => setShowDeleteAccount(true)}>
          <View style={styles.iconBox}><Text style={styles.iconText}>⚠️</Text></View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitleDanger}>Delete account</Text>
            <Text style={styles.rowSubtitle}>Permanently delete your account and all data</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>
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
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
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
    placeholderEmoji: {
      fontSize: 40,
      marginBottom: 12,
    },
    placeholderTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textDark,
      marginBottom: 4,
    },
    placeholderSubtitle: {
      fontSize: 13,
      color: theme.textMuted,
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
    divider: {
      height: 0.5,
      backgroundColor: theme.divider,
      marginVertical: 4,
    },
  });
}
