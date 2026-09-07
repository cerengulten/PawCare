import { useMemo, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useProfile } from '../lib/hooks/useProfile';
import { useDogs } from '../lib/hooks/useDogs';
import { useOverallStreak } from '../lib/hooks/useOverallStreak';
import PetSummaryCard from '../components/PetSummaryCard';
import NearbyVetsSection from '../components/NearbyVetsSection';
import ProfileScreen from './ProfileScreen';
import { RootTabParamList } from './AppTabs';
import { useTheme } from '../lib/ThemeContext';
import { ThemeTokens } from '../lib/themes';

type ProfileState = ReturnType<typeof useProfile>;

type Props = BottomTabScreenProps<RootTabParamList, 'Home'> & {
  dogs: ReturnType<typeof useDogs>['dogs'];
  profile: ProfileState['profile'];
  updateProfile: ProfileState['updateProfile'];
  checkUsernameAvailable: ProfileState['checkUsernameAvailable'];
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen({ navigation, dogs, profile, updateProfile, checkUsernameAvailable }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { streak } = useOverallStreak();
  const [showProfile, setShowProfile] = useState(false);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';
  const firstDogName = dogs[0]?.name ?? 'your pet';

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingLabel}>{greeting()}</Text>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip}>
          {dogs.map(dog => (
            <PetSummaryCard
              key={dog.id}
              dog={dog}
              onPress={() => navigation.navigate('Pets', { dogId: dog.id })}
            />
          ))}
        </ScrollView>
      ) : null}

      {streak > 0 ? (
        <View style={styles.streakPill}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <View style={styles.streakTextGroup}>
            <Text style={styles.streakTitle}>{streak}-day streak</Text>
            <Text style={styles.streakSubtitle}>Keep it going today</Text>
          </View>
          <View style={styles.weekChip}>
            <Text style={styles.weekChipText}>Week {Math.ceil(streak / 7)}</Text>
          </View>
        </View>
      ) : null}

      <NearbyVetsSection
        dog={dogs[0] ?? null}
        onOpenVetFinder={() => navigation.navigate('More', { openVetFinder: true })}
      />

      <View style={styles.aiBar}>
        <Text style={styles.aiIcon}>💬</Text>
        <Text style={styles.aiText} numberOfLines={1}>Ask about {firstDogName}'s nutrition...</Text>
        <View style={styles.grayChip}><Text style={styles.grayChipText}>Soon</Text></View>
      </View>

      <Text style={styles.sectionTitle}>Community tip</Text>
      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>Toy poodle tip 🐩</Text>
        <Text style={styles.tipBody}>
          Hypoallergenic diets work best when introduced gradually to avoid GI upset.
        </Text>
        <View style={styles.blueChip}>
          <Text style={styles.blueChipText}>Community · Soon</Text>
        </View>
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
      padding: 20,
      paddingTop: 60,
      paddingBottom: 32,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 22,
    },
    greetingLabel: {
      fontSize: 14,
      color: theme.textMuted,
    },
    greetingName: {
      fontSize: 24,
      fontWeight: '600',
      color: theme.textDark,
    },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
    },
    avatarPlaceholder: {
      width: 46,
      height: 46,
      borderRadius: 23,
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
      marginBottom: 20,
    },
    streakPill: {
      backgroundColor: theme.streakBg,
      borderWidth: 0.5,
      borderColor: theme.streakBorder,
      borderRadius: 14,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 24,
    },
    streakEmoji: {
      fontSize: 20,
    },
    streakTextGroup: {
      flex: 1,
    },
    streakTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.pendingAmberText,
    },
    streakSubtitle: {
      fontSize: 13,
      color: theme.pendingAmberText,
    },
    weekChip: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    weekChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.pendingAmberText,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    aiBar: {
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      borderWidth: 0.5,
      borderColor: theme.border,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 24,
    },
    aiIcon: {
      fontSize: 20,
    },
    aiText: {
      flex: 1,
      fontSize: 14,
      color: theme.textMuted,
    },
    tipCard: {
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      borderWidth: 0.5,
      borderColor: theme.border,
      padding: 16,
    },
    tipTitle: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.textDark,
      marginBottom: 6,
    },
    tipBody: {
      fontSize: 13,
      color: theme.textMuted,
      lineHeight: 19,
      marginBottom: 8,
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
    blueChip: {
      backgroundColor: theme.communityBlueBg,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
      alignSelf: 'flex-start',
    },
    blueChipText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.communityBlueText,
    },
  });
}
