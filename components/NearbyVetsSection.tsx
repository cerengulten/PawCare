import { useEffect, useMemo, useState } from 'react';
import { InteractionManager, View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { Dog, DogMood, VetResult } from '../types';
import { useMoodHistory } from '../lib/hooks/useMoodHistory';
import { useHomeVetPreview } from '../lib/hooks/useHomeVetPreview';
import { buildVetMapHtml } from '../lib/vetMapHtml';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { i18n } from '../lib/i18n';
import { ThemeTokens } from '../lib/themes';
import { localDateDaysAgo } from '../lib/dateUtils';
import { openVetDirections } from './VetDetailSheet';

const ALERT_MOODS: DogMood['mood'][] = ['off', 'sick'];
const ALERT_LOOKBACK_DAYS = 7;
const ALERT_STREAK_DAYS = 3;

function dateStringDaysAgo(days: number): string {
  return localDateDaysAgo(days);
}

type Props = {
  dog: Dog | null;
  onOpenVetFinder: () => void;
};

export default function NearbyVetsSection({ dog, onOpenVetFinder }: Props) {
  const { theme, isDarkMode } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme, isDarkMode), [theme, isDarkMode]);
  const { historyByDate } = useMoodHistory(dog?.id ?? null, ALERT_LOOKBACK_DAYS);
  const { vets, userLocation, loading, available } = useHomeVetPreview();
  const [mounted, setMounted] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setMounted(true));
    return () => task.cancel();
  }, []);

  const alert = useMemo(() => {
    const streakDates = Array.from({ length: ALERT_STREAK_DAYS }, (_, i) => dateStringDaysAgo(i));
    const streakMoods = streakDates.map((d) => historyByDate.get(d));
    const isAlert = streakMoods.every((mood) => mood != null && ALERT_MOODS.includes(mood));
    return {
      isAlert,
      streakDays: ALERT_STREAK_DAYS,
      latestMood: streakMoods[0] ?? null,
    };
  }, [historyByDate]);

  if (loading || !mounted) {
    return (
      <>
        <Text style={styles.sectionTitle}>{t('nearbyVets.sectionTitle')}</Text>
        <View style={styles.skeleton} />
      </>
    );
  }

  if (!available || !userLocation) {
    return (
      <>
        <Text style={styles.sectionTitle}>{t('nearbyVets.sectionTitle')}</Text>
        <TouchableOpacity style={styles.placeholder} onPress={onOpenVetFinder} activeOpacity={0.8}>
          <View style={styles.placeholderBadge}>
            <Ionicons name="medkit-outline" size={20} color={theme.primary} />
          </View>
          <Text style={styles.placeholderText}>{t('nearbyVets.tapToFind')}</Text>
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
          <View style={styles.alertTitleInline}>
            <Feather name="alert-triangle" size={14} color={theme.allergenText} />
            <Text style={styles.alertSectionTitle}>
              {t('nearbyVets.vetRecommended').replace(/^⚠️\s*/, '')}
            </Text>
          </View>
          <TouchableOpacity onPress={onOpenVetFinder} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.seeAllText}>{t('common.seeAll')} →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.alertCard}>
          <TouchableOpacity style={styles.mapTile} onPress={onOpenVetFinder} activeOpacity={0.85}>
            <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
              {mapFailed ? (
                <View style={styles.mapFallback}>
                  <Feather name="map" size={28} color={theme.textMuted} />
                </View>
              ) : (
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
                  onError={() => setMapFailed(true)}
                  onHttpError={() => setMapFailed(true)}
                />
              )}
              <View style={styles.mapTintOverlay} />
            </View>
            <View style={styles.openMapBtnAlert}>
              <Text style={styles.openMapBtnText}>{t('nearbyVets.openMap')}</Text>
            </View>
            <View style={styles.alertBanner}>
              <Feather name="alert-triangle" size={13} color={theme.allergenText} />
              <Text style={styles.alertBannerText} numberOfLines={1}>
                {t('nearbyVets.alertBanner', {
                  name: dog.name,
                  mood: t('mood.' + (alert.latestMood ?? 'off')).toLowerCase(),
                  days: alert.streakDays,
                })}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.alertVetList}>
            <VetRow
              vet={nearest}
              primary
              onOpenVetFinder={onOpenVetFinder}
              theme={theme}
              styles={styles}
            />
            {secondNearest ? (
              <>
                <View style={styles.alertDivider} />
                <VetRow
                  vet={secondNearest}
                  primary={false}
                  onOpenVetFinder={onOpenVetFinder}
                  theme={theme}
                  styles={styles}
                />
              </>
            ) : null}
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Text style={styles.sectionTitle}>{t('nearbyVets.sectionTitle')}</Text>
      <TouchableOpacity style={styles.normalCard} onPress={onOpenVetFinder} activeOpacity={0.85}>
        <View style={styles.mapTile}>
          <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
            {mapFailed ? (
              <View style={styles.mapFallback}>
                <Feather name="map" size={28} color={theme.textMuted} />
              </View>
            ) : (
              <WebView
                originWhitelist={['*']}
                source={{ html: buildVetMapHtml(userLocation, vets, { interactive: false }) }}
                style={styles.map}
                onError={() => setMapFailed(true)}
                onHttpError={() => setMapFailed(true)}
              />
            )}
          </View>
          <View style={styles.nearbyBadge}>
            <Feather name="map-pin" size={11} color={theme.primary} />
            <Text style={styles.nearbyBadgeText}>
              {t('nearbyVets.vetsNearby', { count: vets.length })}
            </Text>
          </View>
          <View style={styles.openMapBtn}>
            <Text style={styles.openMapBtnText}>{t('nearbyVets.openMap')}</Text>
          </View>
        </View>
        {nearest ? (
          <View style={styles.nearestRow}>
            <View style={styles.vetIcon}>
              <Ionicons name="medkit-outline" size={18} color={theme.primary} />
            </View>
            <View style={styles.vetInfo}>
              <Text style={styles.vetName} numberOfLines={1}>
                {nearest.name}
              </Text>
              <View style={styles.metaInline}>
                <Feather name="map-pin" size={12} color={theme.textMuted} />
                <Text style={styles.vetMeta}>
                  {t('nearbyVets.kmAway', { km: nearest.distanceKm.toFixed(1) })}
                </Text>
              </View>
            </View>
            {nearest.phone ? (
              <TouchableOpacity
                style={styles.callBtnBrand}
                onPress={(e) => {
                  e.stopPropagation();
                  Linking.openURL(`tel:${nearest.phone}`);
                }}
                activeOpacity={0.8}
              >
                <Feather name="phone" size={14} color="#FFFFFF" />
                <Text style={styles.callBtnBrandText}>{t('nearbyVets.call')}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.directionsPill}
              onPress={(e) => {
                e.stopPropagation();
                openVetDirections(nearest);
              }}
              activeOpacity={0.8}
            >
              <Feather name="navigation" size={14} color={theme.primary} />
              <Text style={styles.directionsPillText}>{t('nearbyVets.directions')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.emptyRowText}>{t('nearbyVets.noVetsNearby')}</Text>
        )}
      </TouchableOpacity>
    </>
  );
}

function VetRow({
  vet,
  primary,
  onOpenVetFinder,
  theme,
  styles,
}: {
  vet: VetResult;
  primary: boolean;
  onOpenVetFinder: () => void;
  theme: ThemeTokens;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <TouchableOpacity style={styles.alertVetRow} onPress={onOpenVetFinder} activeOpacity={0.7}>
      <View style={[styles.vetIcon, styles.vetIconAlert]}>
        <Ionicons name="medkit-outline" size={18} color={theme.primary} />
      </View>
      <View style={styles.vetInfo}>
        <Text style={styles.vetName} numberOfLines={1}>
          {vet.name}
        </Text>
        <View style={styles.metaInline}>
          <Feather name="map-pin" size={12} color={theme.textMuted} />
          <Text style={styles.vetMeta}>
            {i18n.t('nearbyVets.kmAway', { km: vet.distanceKm.toFixed(1) })}
          </Text>
        </View>
      </View>
      {vet.phone ? (
        <TouchableOpacity
          style={primary ? styles.callBtnPrimary : styles.callBtnBrand}
          onPress={(e) => {
            e.stopPropagation();
            Linking.openURL(`tel:${vet.phone}`);
          }}
        >
          <Feather name="phone" size={13} color="#FFFFFF" />
          <Text style={styles.callBtnPrimaryText}>{i18n.t('nearbyVets.call')}</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        style={styles.directionsPill}
        onPress={(e) => {
          e.stopPropagation();
          openVetDirections(vet);
        }}
      >
        <Feather name="navigation" size={13} color={theme.primary} />
        <Text style={styles.directionsPillText}>{i18n.t('nearbyVets.directions')}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function makeStyles(theme: ThemeTokens, isDarkMode = false) {
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
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      borderWidth: 1,
      borderColor: theme.border,
      height: 110,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      gap: 6,
    },
    placeholderBadge: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: isDarkMode ? '#2E1E19' : '#FFF3EC',
      borderWidth: 1,
      borderColor: isDarkMode ? '#4D3228' : '#F6D9C9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholderText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.primary,
    },
    alertHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    alertTitleInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
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
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
      marginBottom: 24,
      backgroundColor: theme.surface,
    },
    alertCard: {
      borderRadius: theme.radiiCard,
      borderWidth: 1,
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
    mapFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.divider,
    },
    mapTintOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(140,26,26,0.06)',
    },
    nearbyBadge: {
      position: 'absolute',
      bottom: 8,
      left: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(255,255,255,0.94)',
      borderRadius: 8,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    nearbyBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#1F1A17',
    },
    openMapBtn: {
      position: 'absolute',
      top: 8,
      right: 10,
      backgroundColor: theme.primary,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    openMapBtnAlert: {
      position: 'absolute',
      top: 8,
      right: 10,
      backgroundColor: theme.allergenText,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    openMapBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    alertBanner: {
      position: 'absolute',
      bottom: 8,
      left: 10,
      right: 10,
      backgroundColor: theme.allergenBg,
      borderRadius: 8,
      paddingHorizontal: 9,
      paddingVertical: 5,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
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
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: isDarkMode ? '#2E1E19' : '#FFF3EC',
      borderWidth: 1,
      borderColor: isDarkMode ? '#4D3228' : '#F6D9C9',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    vetIconAlert: {
      backgroundColor: theme.allergenBg,
      borderColor: theme.alertBorder,
    },
    vetInfo: {
      flex: 1,
      minWidth: 0,
    },
    vetName: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textDark,
    },
    metaInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    vetMeta: {
      fontSize: 12,
      color: theme.textMuted,
    },
    emptyRowText: {
      fontSize: 13,
      color: theme.textMuted,
      padding: 14,
      backgroundColor: theme.surface,
    },
    callBtnBrand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: theme.primary,
      borderRadius: 10,
      paddingHorizontal: 11,
      paddingVertical: 7,
    },
    callBtnBrandText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    callBtnPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: theme.allergenText,
      borderRadius: 10,
      paddingHorizontal: 11,
      paddingVertical: 7,
    },
    callBtnPrimaryText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    directionsPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      paddingHorizontal: 11,
      paddingVertical: 7,
    },
    directionsPillText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: theme.primary,
    },
  });
}
