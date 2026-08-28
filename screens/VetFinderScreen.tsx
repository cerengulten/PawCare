import { useEffect, useMemo, useState } from 'react';
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
import { useNearbyVets } from '../lib/hooks/useNearbyVets';
import { buildVetMapHtml } from '../lib/vetMapHtml';
import { useTheme } from '../lib/ThemeContext';
import { ThemeTokens } from '../lib/themes';
import SwipeBackWrapper from '../components/SwipeBackWrapper';

type Props = {
  onBack: () => void;
};

export default function VetFinderScreen({ onBack }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vets, userLocation, loading, error, permissionDenied, searchNearMe, searchByAddress } = useNearbyVets();
  const [addressInput, setAddressInput] = useState('');

  useEffect(() => {
    searchNearMe();
  }, []);

  return (
    <SwipeBackWrapper onBack={onBack}>
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backRow}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Vet Finder</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.emptyText}>Finding vets near you…</Text>
        </View>
      ) : permissionDenied ? (
        <View style={styles.content}>
          <Text style={styles.emptyText}>
            Location access was denied. Enter a city or address to search instead.
          </Text>
          <View style={styles.addressRow}>
            <TextInput
              style={styles.addressInput}
              placeholder="City or address"
              placeholderTextColor={theme.textMuted}
              value={addressInput}
              onChangeText={setAddressInput}
              onSubmitEditing={() => searchByAddress(addressInput)}
            />
            <TouchableOpacity style={styles.searchButton} onPress={() => searchByAddress(addressInput)}>
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={searchNearMe}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {userLocation ? (
            <View style={styles.mapContainer}>
              <WebView
                originWhitelist={['*']}
                source={{ html: buildVetMapHtml(userLocation, vets) }}
                style={styles.map}
              />
            </View>
          ) : null}

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {vets.length === 0 ? (
              <Text style={styles.emptyText}>No vets found nearby.</Text>
            ) : (
              vets.map((v, idx) => (
                <View key={v.id}>
                  <View style={styles.vetRow}>
                    <View style={styles.vetInfo}>
                      <Text style={styles.vetName}>{v.name}</Text>
                      {v.address ? <Text style={styles.vetSubtitle}>{v.address}</Text> : null}
                      <Text style={styles.vetDistance}>{v.distanceKm.toFixed(1)} km away</Text>
                    </View>
                    {v.phone ? (
                      <TouchableOpacity
                        style={styles.callButton}
                        onPress={() => Linking.openURL(`tel:${v.phone}`)}
                      >
                        <Text style={styles.callButtonText}>📞</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  {idx < vets.length - 1 ? <View style={styles.divider} /> : null}
                </View>
              ))
            )}
          </ScrollView>
        </>
      )}
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
    },
    vetName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.textDark,
    },
    vetSubtitle: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 2,
    },
    vetDistance: {
      fontSize: 12,
      color: theme.primary,
      fontWeight: '500',
      marginTop: 2,
    },
    callButton: {
      width: 40,
      height: 40,
      borderRadius: 11,
      backgroundColor: theme.moodSelBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    callButtonText: {
      fontSize: 18,
    },
    divider: {
      height: 0.5,
      backgroundColor: theme.divider,
    },
  });
}
