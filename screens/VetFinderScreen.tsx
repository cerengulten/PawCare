import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { Dog, VetResult } from '../types';
import { useNearbyVets } from '../lib/hooks/useNearbyVets';
import { buildVetMapHtml } from '../lib/vetMapHtml';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';
import SwipeBackWrapper from '../components/SwipeBackWrapper';
import VetDetailSheet, { openVetDirections } from '../components/VetDetailSheet';
import { formatOpeningHours } from '../lib/openingHoursFormatter';

type Props = {
  onBack: () => void;
  activeDog?: Dog | null;
  onOpenDossier?: (dog: Dog) => void;
};

export default function VetFinderScreen({ onBack, activeDog, onOpenDossier }: Props) {
  const { theme, isDarkMode } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme, isDarkMode), [theme, isDarkMode]);
  const { vets, userLocation, loading, error, permissionDenied, searchNearMe, searchByAddress } =
    useNearbyVets();
  const [addressInput, setAddressInput] = useState('');

  const webViewRef = useRef<WebView>(null);
  const [selectedVet, setSelectedVet] = useState<VetResult | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  useEffect(() => {
    searchNearMe();
  }, []);

  const mapHtml = useMemo(() => {
    if (!userLocation) return '';
    return buildVetMapHtml(userLocation, vets);
  }, [userLocation, vets]);

  const handleSelectVet = (v: VetResult) => {
    setSelectedVet(v);
    setSheetVisible(true);
    const safeId = JSON.stringify(v.id);
    const safeLat = Number.isFinite(Number(v.lat)) ? Number(v.lat) : 0;
    const safeLon = Number.isFinite(Number(v.lon)) ? Number(v.lon) : 0;
    webViewRef.current?.injectJavaScript(`
      if (typeof map !== 'undefined') {
        map.setView([${safeLat}, ${safeLon}], 15, { animate: true });
      }
      if (typeof highlightVetMarker === 'function') {
        highlightVetMarker(${safeId});
      }
      true;
    `);
  };

  const handleMapMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SELECT_VET' && data.id) {
        const found = vets.find((item) => item.id === String(data.id));
        if (found) {
          setSelectedVet(found);
          setSheetVisible(true);
        }
      }
    } catch {
      // ignore non-json messages
    }
  };

  return (
    <SwipeBackWrapper onBack={onBack}>
      <View style={styles.container}>
        <TouchableOpacity onPress={onBack} style={styles.backRow} activeOpacity={0.7}>
          <Feather name="chevron-left" size={20} color={theme.primary} />
          <Text style={styles.backText}>{t('common.back')}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{t('vetFinder.title')}</Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.emptyText}>{t('vetFinder.findingVets')}</Text>
          </View>
        ) : permissionDenied ? (
          <View style={styles.content}>
            <Text style={styles.emptyText}>{t('vetFinder.permissionDenied')}</Text>
            <View style={styles.addressRow}>
              <TextInput
                style={styles.addressInput}
                placeholder={t('vetFinder.cityOrAddress')}
                placeholderTextColor={theme.textMuted}
                value={addressInput}
                onChangeText={setAddressInput}
                onSubmitEditing={() => searchByAddress(addressInput)}
              />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={() => searchByAddress(addressInput)}
              >
                <Text style={styles.searchButtonText}>{t('vetFinder.search')}</Text>
              </TouchableOpacity>
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Feather name="wifi-off" size={32} color={theme.textMuted} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={searchNearMe} activeOpacity={0.85}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="refresh-cw" size={14} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>{t('vetFinder.tryAgain')}</Text>
              </View>
            </TouchableOpacity>
            <View style={[styles.addressRow, { width: '100%', marginTop: 16 }]}>
              <TextInput
                style={styles.addressInput}
                placeholder={t('vetFinder.cityOrAddress')}
                placeholderTextColor={theme.textMuted}
                value={addressInput}
                onChangeText={setAddressInput}
                onSubmitEditing={() => searchByAddress(addressInput)}
              />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={() => searchByAddress(addressInput)}
              >
                <Text style={styles.searchButtonText}>{t('vetFinder.search')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {userLocation ? (
              <View style={styles.mapContainer}>
                <WebView
                  ref={webViewRef}
                  originWhitelist={['https://*', 'about:blank']}
                  source={{ html: mapHtml }}
                  style={styles.map}
                  onMessage={handleMapMessage}
                />
              </View>
            ) : null}

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {vets.length === 0 ? (
                <View style={{ alignItems: 'center', gap: 12, paddingVertical: 20 }}>
                  <Text style={styles.emptyText}>{t('vetFinder.noVetsNearby')}</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={searchNearMe} activeOpacity={0.85}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Feather name="refresh-cw" size={14} color="#FFFFFF" />
                      <Text style={styles.retryButtonText}>{t('vetFinder.tryAgain')}</Text>
                    </View>
                  </TouchableOpacity>
                  <View style={[styles.addressRow, { width: '100%' }]}>
                    <TextInput
                      style={styles.addressInput}
                      placeholder={t('vetFinder.cityOrAddress')}
                      placeholderTextColor={theme.textMuted}
                      value={addressInput}
                      onChangeText={setAddressInput}
                      onSubmitEditing={() => searchByAddress(addressInput)}
                    />
                    <TouchableOpacity
                      style={styles.searchButton}
                      onPress={() => searchByAddress(addressInput)}
                    >
                      <Text style={styles.searchButtonText}>{t('vetFinder.search')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                vets.map((v) => {
                  const hoursInfo = formatOpeningHours(v.openingHours);
                  const isSelected = selectedVet?.id === v.id;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.vetCard, isSelected && styles.vetCardSelected]}
                      onPress={() => handleSelectVet(v)}
                      activeOpacity={0.82}
                    >
                      <View style={styles.vetTopRow}>
                        <View style={styles.clinicBadge}>
                          <Ionicons name="medkit-outline" size={18} color={theme.primary} />
                        </View>

                        <View style={styles.vetInfo}>
                          <View style={styles.nameRow}>
                            <Text style={styles.vetName} numberOfLines={1}>
                              {v.name}
                            </Text>
                            <View style={styles.distancePill}>
                              <Text style={styles.distancePillText}>
                                {v.distanceKm.toFixed(1)} km
                              </Text>
                            </View>
                          </View>

                          {/* Status & Emergency Badges */}
                          {hoursInfo.isOpenNow != null || v.isEmergency ? (
                            <View style={styles.statusBadgesRow}>
                              {hoursInfo.isOpenNow === true ? (
                                <View style={styles.openBadge}>
                                  <View style={styles.openDot} />
                                  <Text style={styles.openBadgeText}>
                                    {t('vetFinder.openNowBadge')}
                                  </Text>
                                </View>
                              ) : hoursInfo.isOpenNow === false ? (
                                <View style={styles.closedBadge}>
                                  <View style={styles.closedDot} />
                                  <Text style={styles.closedBadgeText}>
                                    {t('vetFinder.closedBadge')}
                                  </Text>
                                </View>
                              ) : null}

                              {v.isEmergency ? (
                                <View style={styles.emergencyBadge}>
                                  <Ionicons name="shield-checkmark" size={12} color="#DC2626" />
                                  <Text style={styles.emergencyBadgeText}>
                                    {t('vetFinder.emergencyBadge')}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          ) : null}

                          {v.address ? (
                            <View style={styles.metaInlineRow}>
                              <Feather name="map-pin" size={13} color={theme.textMuted} />
                              <Text style={styles.vetSubtitle} numberOfLines={1}>
                                {v.address}
                              </Text>
                            </View>
                          ) : null}

                          {hoursInfo.summary ? (
                            <View style={styles.metaInlineRow}>
                              <Feather name="clock" size={13} color={theme.textMuted} />
                              <Text style={styles.hoursSnippet} numberOfLines={1}>
                                {hoursInfo.summary}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>

                      {/* Tactile Action Pills Row */}
                      <View style={styles.cardActionsRow}>
                        {v.phone ? (
                          <TouchableOpacity
                            style={styles.callPillBtn}
                            onPress={(e) => {
                              e.stopPropagation();
                              Linking.openURL(`tel:${v.phone}`);
                            }}
                            activeOpacity={0.85}
                          >
                            <Feather name="phone" size={15} color="#FFFFFF" />
                            <Text style={styles.callPillText} numberOfLines={1}>
                              {t('vetFinder.callClinic')}
                            </Text>
                          </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity
                          style={styles.directionsPillBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            openVetDirections(v);
                          }}
                          activeOpacity={0.85}
                        >
                          <Feather name="navigation" size={15} color={theme.primary} />
                          <Text style={styles.directionsPillText} numberOfLines={1}>
                            {t('vetFinder.directions')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </>
        )}

        {/* Rich Clinic Detail Bottom Sheet */}
        <VetDetailSheet
          visible={sheetVisible}
          vet={selectedVet}
          activeDog={activeDog}
          onClose={() => setSheetVisible(false)}
          onOpenDossier={onOpenDossier}
        />
      </View>
    </SwipeBackWrapper>
  );
}

function makeStyles(theme: ThemeTokens, isDarkMode = false) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      paddingHorizontal: 16,
    },
    backRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 12,
    },
    backText: {
      color: theme.primary,
      fontSize: 16,
      fontWeight: '600',
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.textDark,
      paddingHorizontal: 16,
      marginBottom: 12,
      letterSpacing: -0.3,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingHorizontal: 16,
    },
    emptyText: {
      fontSize: 13,
      color: theme.textMuted,
      textAlign: 'center',
    },
    errorText: {
      fontSize: 13,
      color: theme.allergenText,
      textAlign: 'center',
    },
    retryButton: {
      backgroundColor: theme.primary,
      borderRadius: theme.radiiCard,
      paddingVertical: 10,
      paddingHorizontal: 20,
    },
    retryButtonText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '600',
    },
    addressRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    addressInput: {
      flex: 1,
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: theme.textDark,
    },
    searchButton: {
      backgroundColor: theme.primary,
      borderRadius: theme.radiiCard,
      paddingHorizontal: 16,
      justifyContent: 'center',
    },
    searchButtonText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '600',
    },
    mapContainer: {
      height: 250,
      marginHorizontal: 16,
      borderRadius: 20,
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    map: {
      flex: 1,
    },
    list: {
      flex: 1,
      marginTop: 12,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 28,
      gap: 12,
    },
    vetCard: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.2 : 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    vetCardSelected: {
      borderColor: theme.primary,
      backgroundColor: isDarkMode ? '#281E1A' : '#FFFDFB',
    },
    vetTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    clinicBadge: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: isDarkMode ? '#2E1E19' : '#FFF3EC',
      borderWidth: 1,
      borderColor: isDarkMode ? '#4D3228' : '#F6D9C9',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    vetInfo: {
      flex: 1,
      minWidth: 0,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    vetName: {
      flex: 1,
      fontSize: 15.5,
      fontWeight: '700',
      color: theme.textDark,
    },
    distancePill: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: theme.border,
    },
    distancePillText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: theme.primary,
    },
    statusBadgesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 5,
    },
    openBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: isDarkMode ? '#1F3327' : '#EAF3ED',
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 2.5,
      borderWidth: 1,
      borderColor: isDarkMode ? '#2F523D' : '#C6DFCE',
    },
    openDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.done,
    },
    openBadgeText: {
      fontSize: 10.5,
      fontWeight: '700',
      color: theme.done,
    },
    closedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: theme.allergenBg,
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 2.5,
    },
    closedDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.allergenText,
    },
    closedBadgeText: {
      fontSize: 10.5,
      fontWeight: '700',
      color: theme.allergenText,
    },
    emergencyBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#FEE2E2',
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 2.5,
      borderWidth: 0.5,
      borderColor: '#FCA5A5',
    },
    emergencyBadgeText: {
      fontSize: 10.5,
      fontWeight: '700',
      color: '#DC2626',
    },
    metaInlineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 5,
    },
    vetSubtitle: {
      flex: 1,
      fontSize: 12.5,
      color: theme.textMuted,
    },
    hoursSnippet: {
      flex: 1,
      fontSize: 12,
      color: theme.textMuted,
    },
    cardActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.divider,
    },
    callPillBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingVertical: 9,
      paddingHorizontal: 12,
    },
    callPillText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    directionsPillBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      backgroundColor: theme.surfaceAlt,
      borderRadius: 12,
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    directionsPillText: {
      color: theme.primary,
      fontSize: 13,
      fontWeight: '700',
    },
  });
}
