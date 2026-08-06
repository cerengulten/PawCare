import { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { useProfile } from '../lib/hooks/useProfile';
import { useDogs } from '../lib/hooks/useDogs';
import { useAllVaccines } from '../lib/hooks/useAllVaccines';
import VaccineCard from '../components/VaccineCard';
import { colors, radii } from '../lib/theme';

export default function MoreScreen() {
  const { profile } = useProfile();
  const { dogs } = useDogs();
  const { upcoming, overdue } = useAllVaccines();
  const [showNotifPlaceholder, setShowNotifPlaceholder] = useState(false);

  if (showNotifPlaceholder) {
    return (
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
            <Text style={styles.profileName}>{profile?.full_name ?? 'PawCare user'}</Text>
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

      <Text style={styles.sectionTitle}>Coming soon</Text>
      <View style={styles.card}>
        <View style={[styles.row, styles.rowDisabled]}>
          <View style={styles.iconBox}><Text style={styles.iconText}>📍</Text></View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Vet Finder</Text>
            <Text style={styles.rowSubtitle}>Find vets near you</Text>
          </View>
          <View style={styles.grayChip}><Text style={styles.grayChipText}>Soon</Text></View>
        </View>
        <View style={styles.divider} />
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
        <TouchableOpacity style={styles.row} onPress={() => supabase.auth.signOut()}>
          <View style={styles.iconBox}><Text style={styles.iconText}>🚪</Text></View>
          <View style={styles.rowInfo}>
            <Text style={styles.signOutTitle}>Sign out</Text>
          </View>
        </TouchableOpacity>
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
    color: colors.primaryGreen,
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
    color: colors.textDark,
    marginBottom: 4,
  },
  placeholderSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
  title: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.textDark,
    marginBottom: 16,
  },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 0.5,
    borderColor: colors.cardBorder,
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
    backgroundColor: colors.moodSelectedBg,
    borderWidth: 1.5,
    borderColor: '#A8C89A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 26,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
  },
  profileMeta: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 2,
    paddingBottom: 6,
    paddingTop: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.cardBorder,
    padding: 14,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
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
    backgroundColor: '#EAF3E4',
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
    color: colors.textDark,
  },
  rowSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  signOutTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.pendingAmberText,
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
  chevron: {
    fontSize: 16,
    color: '#A8C89A',
  },
  divider: {
    height: 0.5,
    backgroundColor: '#EAF3E4',
    marginVertical: 4,
  },
});
