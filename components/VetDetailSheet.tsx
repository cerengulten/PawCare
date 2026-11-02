import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Platform,
  Share,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dog, VetResult } from '../types';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';
import { reverseGeocodeAddress } from '../lib/hooks/useNearbyVets';
import { formatOpeningHours } from '../lib/openingHoursFormatter';

type Props = {
  visible: boolean;
  vet: VetResult | null;
  activeDog?: Dog | null;
  onClose: () => void;
  onOpenDossier?: (dog: Dog) => void;
};

export function openVetDirections(vet: VetResult) {
  const scheme = Platform.select({
    ios: `maps:0,0?q=${encodeURIComponent(vet.name)}@${vet.lat},${vet.lon}`,
    android: `geo:0,0?q=${vet.lat},${vet.lon}(${encodeURIComponent(vet.name)})`,
  });
  const fallback = `https://www.google.com/maps/dir/?api=1&destination=${vet.lat},${vet.lon}`;

  if (scheme) {
    Linking.canOpenURL(scheme)
      .then((supported) => {
        if (supported) {
          Linking.openURL(scheme);
        } else {
          Linking.openURL(fallback);
        }
      })
      .catch(() => {
        Linking.openURL(fallback);
      });
  } else {
    Linking.openURL(fallback);
  }
}

export default function VetDetailSheet({
  visible,
  vet,
  activeDog,
  onClose,
  onOpenDossier,
}: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const primaryVetKey = activeDog ? `@bisco_primary_vet_${activeDog.id}` : null;
  const [isPrimary, setIsPrimary] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(vet?.address ?? null);

  useEffect(() => {
    setResolvedAddress(vet?.address ?? null);
    if (vet && !vet.address) {
      reverseGeocodeAddress({ lat: vet.lat, lon: vet.lon }).then((geoAddr) => {
        if (geoAddr) setResolvedAddress(geoAddr);
      });
    }
  }, [vet]);

  const displayAddress = resolvedAddress || vet?.address || null;
  const formattedHours = useMemo(() => formatOpeningHours(vet?.openingHours), [vet?.openingHours]);

  useEffect(() => {
    if (!primaryVetKey || !vet) {
      setIsPrimary(false);
      return;
    }
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(primaryVetKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          setIsPrimary(parsed.id === vet.id);
        } else {
          setIsPrimary(false);
        }
      } catch {
        setIsPrimary(false);
      }
    })();
  }, [primaryVetKey, vet]);

  if (!vet) return null;

  const dogName = activeDog?.name ?? 'your pet';

  const handleSetPrimary = async () => {
    if (!primaryVetKey) return;
    try {
      await AsyncStorage.setItem(
        primaryVetKey,
        JSON.stringify({
          id: vet.id,
          name: vet.name,
          phone: vet.phone,
          address: displayAddress,
          website: vet.website,
        })
      );
      setIsPrimary(true);
      Alert.alert(
        t('vetFinder.primaryVetSaved'),
        t('vetFinder.primaryVetSavedDesc', { name: dogName })
      );
    } catch {
      // ignore
    }
  };

  const handlePrepareDossier = () => {
    if (activeDog && onOpenDossier) {
      onClose();
      onOpenDossier(activeDog);
    }
  };

  const handleShare = async () => {
    try {
      const messageParts = [
        `🏥 ${vet.name}`,
        displayAddress ? `📍 ${displayAddress}` : null,
        vet.phone ? `📞 ${vet.phone}` : null,
        formattedHours.summary ? `🕒 ${formattedHours.summary}` : (vet.openingHours ? `🕒 ${vet.openingHours}` : null),
        vet.website ? `🌐 ${vet.website}` : null,
        `🗺️ https://www.google.com/maps/dir/?api=1&destination=${vet.lat},${vet.lon}`,
      ].filter(Boolean);

      await Share.share({
        title: vet.name,
        message: messageParts.join('\n'),
      });
    } catch {
      // ignore
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header info */}
            <View style={styles.header}>
              <View style={styles.headerTextGroup}>
                <Text style={styles.clinicName}>{vet.name}</Text>
                <View style={styles.badgesRow}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      📍 {t('vetFinder.kmAway', { km: vet.distanceKm.toFixed(1) })}
                    </Text>
                  </View>
                  {vet.isEmergency ? (
                    <View style={[styles.badge, styles.emergencyBadge]}>
                      <Text style={styles.emergencyBadgeText}>
                        🚨 {t('vetFinder.emergencyBadge')}
                      </Text>
                    </View>
                  ) : null}
                  {isPrimary ? (
                    <View style={[styles.badge, styles.primaryBadge]}>
                      <Text style={styles.primaryBadgeText}>
                        ⭐ {t('vetFinder.isPrimaryVetBadge')}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <TouchableOpacity style={styles.closeCircle} onPress={onClose}>
                <Text style={styles.closeCircleText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Action Buttons (Call, Directions, Website) */}
            <View style={styles.actionsGrid}>
              <TouchableOpacity
                style={[styles.actionCard, !vet.phone && styles.actionCardDisabled]}
                onPress={() => vet.phone && Linking.openURL(`tel:${vet.phone}`)}
                disabled={!vet.phone}
                activeOpacity={0.7}
              >
                <Text style={styles.actionIcon}>📞</Text>
                <Text style={styles.actionTitle}>{t('vetFinder.callClinic')}</Text>
                <Text style={styles.actionSubtitle} numberOfLines={1}>
                  {vet.phone ?? t('vetFinder.noPhoneAvailable')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => openVetDirections(vet)}
                activeOpacity={0.7}
              >
                <Text style={styles.actionIcon}>🧭</Text>
                <Text style={styles.actionTitle}>{t('vetFinder.directions')}</Text>
                <Text style={styles.actionSubtitle} numberOfLines={1}>
                  {t('vetFinder.kmAway', { km: vet.distanceKm.toFixed(1) })}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => {
                  if (vet.website) {
                    Linking.openURL(vet.website);
                  } else {
                    const searchTarget = `${vet.name} vet ${displayAddress ?? ''}`.trim();
                    Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(searchTarget)}`);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.actionIcon}>🌐</Text>
                <Text style={styles.actionTitle}>{vet.website ? t('vetFinder.website') : 'Online Info'}</Text>
                <Text style={styles.actionSubtitle} numberOfLines={1}>
                  {vet.website ? 'Visit site' : 'Search web'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Address & Location Card */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>
                {t('vetFinder.addressAndLocation')}
              </Text>
              <Text style={styles.addressText}>
                {displayAddress ?? 'Address details not listed on OpenStreetMap'}
              </Text>
              <View style={styles.addressButtonsRow}>
                <TouchableOpacity
                  style={styles.pillButton}
                  onPress={handleShare}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pillButtonText}>
                    📤 {t('vetFinder.copyShareAddress')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pillButton, styles.pillButtonPrimary]}
                  onPress={() => openVetDirections(vet)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pillButtonPrimaryText}>
                    🗺️ {t('vetFinder.directions')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Operating Hours (if present) */}
            {formattedHours.lines.length > 0 ? (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>
                  🕒 {t('vetFinder.operatingHours')}
                </Text>
                <View style={styles.scheduleTable}>
                  {formattedHours.lines.map((line, idx) => (
                    <View key={idx} style={styles.scheduleRow}>
                      <Text style={styles.scheduleDay}>{line.days}</Text>
                      <Text
                        style={[
                          styles.scheduleHours,
                          line.isClosed && styles.scheduleClosed,
                        ]}
                      >
                        {line.hours}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : vet.openingHours ? (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>
                  🕒 {t('vetFinder.operatingHours')}
                </Text>
                <Text style={styles.hoursText}>{vet.openingHours}</Text>
              </View>
            ) : null}

            {/* Emergency Triage Callout Banner */}
            {vet.isEmergency ? (
              <View style={styles.emergencyCard}>
                <Text style={styles.emergencyCardTitle}>
                  🚨 {t('vetFinder.emergencyTriageHeader')}
                </Text>
                <Text style={styles.emergencyCardDesc}>
                  {t('vetFinder.emergencyTriageDesc')}
                </Text>
              </View>
            ) : null}

            {/* Bisco Pet Parent Shortcuts */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>
                ⭐ {t('vetFinder.shortcutsHeader')}
              </Text>

              {activeDog ? (
                <TouchableOpacity
                  style={styles.shortcutRow}
                  onPress={handleSetPrimary}
                  activeOpacity={0.7}
                >
                  <View style={styles.shortcutIconBox}>
                    <Text style={styles.shortcutIcon}>🐾</Text>
                  </View>
                  <View style={styles.shortcutTextCol}>
                    <Text style={styles.shortcutTitle}>
                      {isPrimary
                        ? `✓ ${t('vetFinder.isPrimaryVetBadge')} for ${dogName}`
                        : t('vetFinder.setPrimaryVet', { name: dogName })}
                    </Text>
                    <Text style={styles.shortcutSubtitle}>
                      {t('vetFinder.primaryVetSavedDesc', { name: dogName })}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : null}

              {activeDog && onOpenDossier ? (
                <TouchableOpacity
                  style={[styles.shortcutRow, styles.shortcutBorder]}
                  onPress={handlePrepareDossier}
                  activeOpacity={0.7}
                >
                  <View style={styles.shortcutIconBox}>
                    <Text style={styles.shortcutIcon}>📄</Text>
                  </View>
                  <View style={styles.shortcutTextCol}>
                    <Text style={styles.shortcutTitle}>
                      {t('vetFinder.prepareDossier', { name: dogName })}
                    </Text>
                    <Text style={styles.shortcutSubtitle}>
                      {t('vetFinder.prepareDossierDesc')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[styles.shortcutRow, styles.shortcutBorder]}
                onPress={handleShare}
                activeOpacity={0.7}
              >
                <View style={styles.shortcutIconBox}>
                  <Text style={styles.shortcutIcon}>📤</Text>
                </View>
                <View style={styles.shortcutTextCol}>
                  <Text style={styles.shortcutTitle}>
                    {t('vetFinder.shareClinic')}
                  </Text>
                  <Text style={styles.shortcutSubtitle}>
                    Share phone and directions with family or pet-sitter
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    backdrop: {
      flex: 1,
    },
    sheetContainer: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '85%',
      paddingTop: 12,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
        android: { elevation: 12 },
      }),
    },
    dragHandle: {
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.border,
      alignSelf: 'center',
      marginBottom: 12,
    },
    scroll: {
      flexGrow: 0,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 36,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 16,
      gap: 12,
    },
    headerTextGroup: {
      flex: 1,
    },
    clinicName: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.textDark,
      lineHeight: 26,
      marginBottom: 8,
    },
    badgesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    badge: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: theme.border,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
    },
    emergencyBadge: {
      backgroundColor: '#FEE2E2',
      borderColor: '#FCA5A5',
    },
    emergencyBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#DC2626',
    },
    primaryBadge: {
      backgroundColor: '#FEF3C7',
      borderColor: '#FCD34D',
    },
    primaryBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#D97706',
    },
    closeCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    closeCircleText: {
      fontSize: 14,
      color: theme.textMuted,
      fontWeight: '700',
    },
    actionsGrid: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    actionCard: {
      flex: 1,
      backgroundColor: theme.background,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    actionCardDisabled: {
      opacity: 0.5,
    },
    actionIcon: {
      fontSize: 22,
      marginBottom: 4,
    },
    actionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textDark,
      marginBottom: 2,
    },
    actionSubtitle: {
      fontSize: 10,
      color: theme.textMuted,
      textAlign: 'center',
    },
    sectionCard: {
      backgroundColor: theme.background,
      borderRadius: 16,
      padding: 14,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: theme.border,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
      color: theme.textMuted,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    addressText: {
      fontSize: 14,
      color: theme.textDark,
      lineHeight: 20,
      marginBottom: 12,
    },
    addressButtonsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    pillButton: {
      flex: 1,
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderRadius: 20,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pillButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textDark,
    },
    pillButtonPrimary: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    pillButtonPrimaryText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    hoursText: {
      fontSize: 13,
      color: theme.textDark,
      lineHeight: 18,
    },
    scheduleTable: {
      marginTop: 2,
      gap: 6,
    },
    scheduleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 3,
    },
    scheduleDay: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textDark,
      flex: 1,
    },
    scheduleHours: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.textMuted,
      textAlign: 'right',
    },
    scheduleClosed: {
      color: '#DC2626',
      fontWeight: '700',
    },
    emergencyCard: {
      backgroundColor: '#FEF2F2',
      borderRadius: 14,
      padding: 14,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: '#F87171',
    },
    emergencyCardTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: '#991B1B',
      marginBottom: 4,
    },
    emergencyCardDesc: {
      fontSize: 12,
      color: '#B91C1C',
      lineHeight: 16,
    },
    shortcutRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      gap: 12,
    },
    shortcutBorder: {
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    shortcutIconBox: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    shortcutIcon: {
      fontSize: 18,
    },
    shortcutTextCol: {
      flex: 1,
    },
    shortcutTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textDark,
    },
    shortcutSubtitle: {
      fontSize: 11,
      color: theme.textMuted,
      marginTop: 2,
    },
  });
}
