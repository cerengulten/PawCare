import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useProfile } from '../lib/hooks/useProfile';
import { useDogs } from '../lib/hooks/useDogs';
import { useOverallStreak } from '../lib/hooks/useOverallStreak';
import PetSummaryCard from '../components/PetSummaryCard';
import NearbyVetsSection from '../components/NearbyVetsSection';
import { RootTabParamList } from './AppTabs';
import { colors, radii } from '../lib/theme';

type Props = BottomTabScreenProps<RootTabParamList, 'Home'>;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen({ navigation }: Props) {
  const { profile } = useProfile();
  const { dogs } = useDogs();
  const { streak } = useOverallStreak();

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';
  const firstDogName = dogs[0]?.name ?? 'your pet';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingLabel}>{greeting()}</Text>
          <Text style={styles.greetingName}>{firstName} 👋</Text>
        </View>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarEmoji}>🐾</Text>
          </View>
        )}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.textMuted,
  },
  greetingName: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textDark,
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
    backgroundColor: colors.moodSelectedBg,
    borderWidth: 1.5,
    borderColor: '#A8C89A',
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
    backgroundColor: colors.streakAccentBg,
    borderWidth: 0.5,
    borderColor: '#E0C090',
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
    color: colors.pendingAmberText,
  },
  streakSubtitle: {
    fontSize: 13,
    color: '#A07840',
  },
  weekChip: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  weekChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.pendingAmberText,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  aiBar: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 0.5,
    borderColor: colors.cardBorder,
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
    color: colors.textMuted,
  },
  tipCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 0.5,
    borderColor: colors.cardBorder,
    padding: 16,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textDark,
    marginBottom: 6,
  },
  tipBody: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
    marginBottom: 8,
  },
  grayChip: {
    backgroundColor: colors.notStartedBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  grayChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.notStartedText,
  },
  blueChip: {
    backgroundColor: colors.communityBlueBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  blueChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.communityBlueText,
  },
});
