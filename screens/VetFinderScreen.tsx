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
  const { theme } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vets, userLocation, loading, error, permissionDenied, searchNearMe, searchByAddress } = useNearbyVets();
  const [addressInput, setAddressInput] = useState('');

  const webViewRef = useRef<WebView>(null);
  const [selectedVet, setSelectedVet] = useState<VetResult | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  useEffect(() => {
    searchNearMe();
  }, []);

  const handleSelectVet = (v: VetResult) => {
    setSelectedVet(v);
    setSheetVisible(true);
    webViewRef.current?.injectJavaScript(`
      if (typeof map !== 'undefined') {
        map.setView([${v.lat}, ${v.lon}], 15, { animate: true });
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
        <TouchableOpacity onPress={onBack} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{t('vetFinder.title')}</Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.emptyText}>{t('vetFinder.findingVets')}</Text>
          </View>
        ) : permissionDenied ? (
          <View style={styles.content}>
            <Text style={styles.emptyText}>
              {t('vetFinder.permissionDenied')}
            </Text>
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
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={searchNearMe}>
              <Text style={styles.retryButtonText}>{t('vetFinder.tryAgain')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {userLocation ? (
              <View style={styles.mapContainer}>
                <WebView
                  ref={webViewRef}
                  originWhitelist={['*']}
                  source={{
                    html: buildVetMapHtml(userLocation, vets, {
                      highlightVetId: selectedVet?.id,
                    }),
                  }}
                  style={styles.map}
                  onMessage={handleMapMessage}
                />
              </View>
            ) : null}

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {vets.length === 0 ? (
                <Text style={styles.emptyText}>{t('vetFinder.noVetsNearby')}</Text>
              ) : (
                vets.map((v, idx) => (
                  <View key={v.id}>
                    <TouchableOpacity
                      style={styles.vetRow}
                      onPress={() => handleSelectVet(v)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.vetInfo}>
                        <View style={styles.nameRow}>
                          <Text style={styles.vetName} numberOfLines={1}>
                            {v.name}
                          </Text>
                          {v.isEmergency ? (
                            <View style={styles.emergencyBadge}>
                              <Text style={styles.emergencyBadgeText}>🚨 24/7</Text>
                            </View>
                          ) : null}
                        </View>
                        {v.address ? (
                          <Text style={styles.vetSubtitle} numberOfLines={1}>
                            {v.address}
                          </Text>
                        ) : null}
                        <View style={styles.metaRow}>
                          <Text style={styles.vetDistance}>
                            📍 {t('vetFinder.kmAway', { km: v.distanceKm.toFixed(1) })}
                          </Text>
                          {v.openingHours ? (
                            <Text style={styles.hoursSnippet} numberOfLines={1}>
                              · 🕒 {formatOpeningHours(v.openingHours).summary}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.actionRow}>
                        {v.phone ? (
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              Linking.openURL(`tel:${v.phone}`);
                            }}
                          >
                            <Text style={styles.actionButtonText}>📞</Text>
                          </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            openVetDirections(v);
                          }}
                        >
                          <Text style={styles.actionButtonText}>🧭</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                    {idx < vets.length - 1 ? <View style={styles.divider} /> : null}
                  </View>
                ))
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

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      paddingHorizontal: 16,
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
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.textDark,
      paddingHorizontal: 16,
      marginBottom: 12,
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
      borderWidth: 0.5,
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
      height: 280,
      marginHorizontal: 16,
      borderRadius: theme.radiiCard,
      overflow: 'hidden',
      borderWidth: 0.5,
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
      paddingBottom: 24,
    },
    vetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
    },
    vetInfo: {
      flex: 1,
      minWidth: 0,
      marginRight: 8,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 2,
    },
    vetName: {
      flexShrink: 1,
      fontSize: 15,
      fontWeight: '600',
      color: theme.textDark,
    },
    emergencyBadge: {
      backgroundColor: '#FEE2E2',
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderWidth: 0.5,
      borderColor: '#FCA5A5',
    },
    emergencyBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#DC2626',
    },
    vetSubtitle: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 2,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 3,
      flexWrap: 'wrap',
    },
    vetDistance: {
      fontSize: 12,
      color: theme.primary,
      fontWeight: '600',
    },
    hoursSnippet: {
      fontSize: 12,
      color: theme.textMuted,
      marginLeft: 4,
      flexShrink: 1,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    actionButton: {
      width: 40,
      height: 40,
      borderRadius: 11,
      backgroundColor: theme.moodSelBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionButtonText: {
      fontSize: 18,
    },
    divider: {
      height: 0.5,
      backgroundColor: theme.divider,
    },
  });
}
