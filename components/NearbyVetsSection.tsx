import { useMemo } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Dog, DogMood, VetResult } from '../types';
import { useMoodHistory } from '../lib/hooks/useMoodHistory';
import { useHomeVetPreview } from '../lib/hooks/useHomeVetPreview';
import { buildVetMapHtml } from '../lib/vetMapHtml';
import { useTheme } from '../lib/ThemeContext';
import { ThemeTokens } from '../lib/themes';

const ALERT_MOODS: DogMood['mood'][] = ['off', 'sick'];
const ALERT_LOOKBACK_DAYS = 7;
const ALERT_STREAK_DAYS = 3;

function dateStringDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

const MOOD_LABEL: Record<DogMood['mood'], string> = {
  sleepy: 'sleepy',
  off: 'off',
  good: 'good',
  great: 'great',
  sick: 'sick',
};

function openDirections(vet: VetResult) {
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${vet.lat},${vet.lon}`);
}

type Props = {
  dog: Dog | null;
  onOpenVetFinder: () => void;
};

export default function NearbyVetsSection({ dog, onOpenVetFinder }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { historyByDate } = useMoodHistory(dog?.id ?? null, ALERT_LOOKBACK_DAYS);
  const { vets, userLocation, loading, available } = useHomeVetPreview();

  const alert = useMemo(() => {
    const streakDates = Array.from({ length: ALERT_STREAK_DAYS }, (_, i) => dateStringDaysAgo(i));
    const streakMoods = streakDates.map(d => historyByDate.get(d));
    const isAlert = streakMoods.every(mood => mood != null && ALERT_MOODS.includes(mood));
    return {
      isAlert,
      streakDays: ALERT_STREAK_DAYS,
      latestMood: streakMoods[0] ?? null,
    };
  }, [historyByDate]);

  if (loading) {
    return (
      <>
        <Text style={styles.sectionTitle}>Nearby vets</Text>
        <View style={styles.skeleton} />
      </>
    );
  }

  if (!available || !userLocation) {
    return (
      <>
        <Text style={styles.sectionTitle}>Nearby vets</Text>
        <TouchableOpacity style={styles.placeholder} onPress={onOpenVetFinder}>
          <Text style={styles.placeholderArrow}>➜</Text>
          <Text style={styles.placeholderText}>Tap to find vets near you</Text>
        </TouchableOpacity>
      </>
    );
  }

  const nearest = vets[0] ?? null;
  const secondNearest = vets[1] ?? null;

  if (alert.isAlert && dog && nearest) {
    return (
      <>
        <View style={styles.alertHeaderRow}>
          <Text style={styles.alertSectionTitle}>⚠️ Vet recommended</Text>
          <TouchableOpacity onPress={onOpenVetFinder} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.seeAllText}>See all →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.alertCard}>
          <TouchableOpacity style={styles.mapTile} onPress={onOpenVetFinder} activeOpacity={0.85}>
            <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
              <WebView
                originWhitelist={['*']}
                source={{
                  html: buildVetMapHtml(userLocation, vets, {
                    interactive: false,
                    variant: 'alert',
                    highlightVetId: nearest.id,
                  }),
                }}
                style={styles.map}
              />
              <View style={styles.mapTintOverlay} />
            </View>
            <View style={styles.openMapBtnAlert}>
              <Text style={styles.openMapBtnText}>Open map →</Text>
            </View>
            <View style={styles.alertBanner}>
              <Text style={styles.alertBannerIcon}>⚠️</Text>
              <Text style={styles.alertBannerText} numberOfLines={1}>
                {dog.name} feeling {MOOD_LABEL[alert.latestMood ?? 'off']} for {alert.streakDays} days
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.alertVetList}>
            <VetRow vet={nearest} primary onOpenVetFinder={onOpenVetFinder} styles={styles} />
            {secondNearest ? (
              <>
                <View style={styles.alertDivider} />
                <VetRow vet={secondNearest} primary={false} onOpenVetFinder={onOpenVetFinder} styles={styles} />
              </>
            ) : null}
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Text style={styles.sectionTitle}>Nearby vets</Text>
      <TouchableOpacity style={styles.normalCard} onPress={onOpenVetFinder} activeOpacity={0.85}>
        <View style={styles.mapTile}>
          <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
            <WebView
              originWhitelist={['*']}
              source={{ html: buildVetMapHtml(userLocation, vets, { interactive: false }) }}
              style={styles.map}
            />
          </View>
          <View style={styles.nearbyBadge}>
            <Text style={styles.nearbyBadgeText}>
              {vets.length} vet{vets.length === 1 ? '' : 's'} nearby
            </Text>
          </View>
          <View style={styles.openMapBtn}>
            <Text style={styles.openMapBtnText}>Open map →</Text>
          </View>
        </View>
        {nearest ? (
          <View style={styles.nearestRow}>
            <View style={styles.vetIcon}>
              <Text style={styles.vetIconText}>🏥</Text>
            </View>
            <View style={styles.vetInfo}>
              <Text style={styles.vetName} numberOfLines={1}>{nearest.name}</Text>
              <Text style={styles.vetMeta}>{nearest.distanceKm.toFixed(1)} km away</Text>
            </View>
            <View style={styles.nearestChip}>
              <Text style={styles.nearestChipText}>Nearest</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.emptyRowText}>No vets found nearby.</Text>
        )}
      </TouchableOpacity>
    </>
  );
}

function VetRow({
  vet,
  primary,
  onOpenVetFinder,
  styles,
}: {
  vet: VetResult;
  primary: boolean;
  onOpenVetFinder: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <TouchableOpacity style={styles.alertVetRow} onPress={onOpenVetFinder} activeOpacity={0.7}>
      <View style={[styles.vetIcon, styles.vetIconAlert]}>
        <Text style={styles.vetIconText}>🏥</Text>
      </View>
      <View style={styles.vetInfo}>
        <Text style={styles.vetName} numberOfLines={1}>{vet.name}</Text>
        <Text style={styles.vetMeta}>{vet.distanceKm.toFixed(1)} km away</Text>
      </View>
      {vet.phone ? (
        <TouchableOpacity
          style={primary ? styles.callBtnPrimary : styles.callBtnSecondary}
          onPress={() => Linking.openURL(`tel:${vet.phone}`)}
        >
          <Text style={primary ? styles.callBtnPrimaryText : styles.callBtnSecondaryText}>Call</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.callBtnSecondary} onPress={() => openDirections(vet)}>
          <Text style={styles.callBtnSecondaryText}>Directions</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    sectionTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    skeleton: {
      height: 168,
      borderRadius: theme.radiiCard,
      backgroundColor: theme.notStartedBg,
      marginBottom: 24,
    },
    placeholder: {
      backgroundColor: theme.moodSelBg,
      borderRadius: theme.radiiCard,
      borderWidth: 0.5,
      borderColor: theme.border,
      height: 110,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    placeholderArrow: {
      fontSize: 22,
      color: theme.primary,
    },
    placeholderText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.primary,
      marginTop: 6,
    },
    alertHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    alertSectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.allergenText,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    seeAllText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.allergenText,
    },
    normalCard: {
      borderRadius: theme.radiiCard,
      borderWidth: 0.5,
      borderColor: theme.border,
      overflow: 'hidden',
      marginBottom: 24,
      backgroundColor: theme.surface,
    },
    alertCard: {
      borderRadius: theme.radiiCard,
      borderWidth: 0.5,
      borderColor: theme.alertBorder,
      overflow: 'hidden',
      marginBottom: 24,
      backgroundColor: theme.alertBg,
    },
    mapTile: {
      height: 130,
    },
    map: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    mapTintOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(140,26,26,0.06)',
    },
    nearbyBadge: {
      position: 'absolute',
      bottom: 8,
      left: 10,
      backgroundColor: 'rgba(255,255,255,0.92)',
      borderRadius: 7,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    nearbyBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textDark,
    },
    openMapBtn: {
      position: 'absolute',
      top: 8,
      right: 10,
      backgroundColor: theme.primary,
      borderRadius: 7,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    openMapBtnAlert: {
      position: 'absolute',
      top: 8,
      right: 10,
      backgroundColor: theme.allergenText,
      borderRadius: 7,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    openMapBtnText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    alertBanner: {
      position: 'absolute',
      bottom: 8,
      left: 10,
      right: 10,
      backgroundColor: theme.allergenBg,
      borderRadius: 7,
      paddingHorizontal: 9,
      paddingVertical: 5,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    alertBannerIcon: {
      fontSize: 12,
    },
    alertBannerText: {
      flex: 1,
      fontSize: 11,
      fontWeight: '600',
      color: theme.allergenText,
    },
    nearestRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
      backgroundColor: theme.surface,
    },
    alertVetList: {
      backgroundColor: theme.alertBg,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    alertVetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
    },
    alertDivider: {
      height: 0.5,
      backgroundColor: theme.alertBorder,
    },
    vetIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: theme.divider,
      alignItems: 'center',
      justifyContent: 'center',
    },
    vetIconAlert: {
      backgroundColor: theme.allergenBg,
    },
    vetIconText: {
      fontSize: 16,
    },
    vetInfo: {
      flex: 1,
      minWidth: 0,
    },
    vetName: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.textDark,
    },
    vetMeta: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 2,
    },
    nearestChip: {
      backgroundColor: theme.moodSelBg,
      borderRadius: 20,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    nearestChipText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.primary,
    },
    emptyRowText: {
      fontSize: 13,
      color: theme.textMuted,
      padding: 14,
      backgroundColor: theme.surface,
    },
    callBtnPrimary: {
      backgroundColor: theme.allergenText,
      borderRadius: 9,
      paddingHorizontal: 11,
      paddingVertical: 6,
    },
    callBtnPrimaryText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    callBtnSecondary: {
      backgroundColor: theme.surface,
      borderWidth: 0.5,
      borderColor: theme.alertBorder,
      borderRadius: 9,
      paddingHorizontal: 11,
      paddingVertical: 6,
    },
    callBtnSecondaryText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.allergenText,
    },
  });
}
