import { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSubscription, SubscriptionPlan, PaywallTriggerReason } from '../lib/SubscriptionContext';
import { useTheme } from '../lib/ThemeContext';
import { ThemeTokens } from '../lib/themes';

type Props = {
  onOpenLegal?: (doc: 'terms' | 'privacy') => void;
};

const FEATURE_LIST = [
  {
    icon: '🐾',
    title: 'Unlimited Pet Profiles',
    subtitle: 'Track habits, vaccines, meals & health logs for all your furry companions.',
  },
  {
    icon: '💬',
    title: '24/7 AI Health & Nutrition Assistant',
    subtitle: 'Unlimited fast triage, safe food lookups, and personalized canine guidance.',
  },
  {
    icon: '📄',
    title: '1-Tap Clinical PDF Dossiers',
    subtitle: 'Export verified medical summaries formatted for clinic visits and emergency vets.',
  },
  {
    icon: '🌸',
    title: 'Estrus & Cycle Forecast Engine',
    subtitle: 'Breed-calibrated heat tracking, fertile window prediction & symptom analysis.',
  },
  {
    icon: '☁️',
    title: 'Lifetime Photo & Health Backup',
    subtitle: 'Keep lifelong vaccine certificates, weight curves & medical records safe.',
  },
];

export default function PaywallModal({ onOpenLegal }: Props) {
  const { theme, isDarkMode } = useTheme();
  const {
    paywallVisible,
    paywallReason,
    closePaywall,
    upgradeToPro,
    restorePurchases,
  } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('annual');
  const [loading, setLoading] = useState(false);

  const styles = useMemo(() => makeStyles(theme, isDarkMode), [theme, isDarkMode]);

  const reasonBanner = useMemo(() => {
    switch (paywallReason) {
      case 'unlimited_pets':
        return {
          emoji: '🐾',
          title: 'Multiple Pets in the Family?',
          body: 'Bisco Free includes 1 dog profile. Upgrade to Pro to track and care for all your furry companions together.',
        };
      case 'ai_consultations':
        return {
          emoji: '💬',
          title: "Daily Free AI Limit Reached",
          body: "You've used today's 5 complimentary triage chats. Unlock unlimited 24/7 AI consultations with Pro.",
        };
      case 'pdf_export':
        return {
          emoji: '📄',
          title: 'Export Official Vet Dossiers',
          body: 'Clinical PDF report export is a Pro feature. Give your veterinarian a complete, beautifully structured health history.',
        };
      case 'cycle_analytics':
        return {
          emoji: '🌸',
          title: 'Advanced Cycle Predictions',
          body: 'Unlock breed-calibrated estrus forecasts, fertility windows, and full cycle history analytics.',
        };
      default:
        return null;
    }
  }, [paywallReason]);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      await upgradeToPro(selectedPlan);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={paywallVisible}
      animationType="slide"
      transparent
      onRequestClose={closePaywall}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header Close Bar */}
          <View style={styles.headerRow}>
            <View style={styles.headerTag}>
              <Text style={styles.headerTagText}>PAWCARE PLUS</Text>
            </View>
            <TouchableOpacity
              onPress={closePaywall}
              style={styles.closeBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Crown & Headline */}
            <View style={styles.heroBlock}>
              <View style={styles.heroIconBadge}>
                <Text style={styles.heroIcon}>👑</Text>
              </View>
              <Text style={styles.heroTitle}>Upgrade to Bisco Pro</Text>
              <Text style={styles.heroSubtitle}>
                The ultimate companion for your dog's vitality, nutrition, and lifelong health.
              </Text>
            </View>

            {/* Contextual Reason Callout if triggered by feature limit */}
            {reasonBanner && (
              <View style={styles.reasonCard}>
                <Text style={styles.reasonEmoji}>{reasonBanner.emoji}</Text>
                <View style={styles.reasonTextGroup}>
                  <Text style={styles.reasonTitle}>{reasonBanner.title}</Text>
                  <Text style={styles.reasonBody}>{reasonBanner.body}</Text>
                </View>
              </View>
            )}

            {/* Feature Highlights Stack */}
            <View style={styles.featuresStack}>
              {FEATURE_LIST.map((feat, idx) => (
                <View key={idx} style={styles.featureItem}>
                  <View style={styles.featureIconBox}>
                    <Text style={styles.featureIconText}>{feat.icon}</Text>
                  </View>
                  <View style={styles.featureTextBox}>
                    <Text style={styles.featureTitle}>{feat.title}</Text>
                    <Text style={styles.featureSubtitle}>{feat.subtitle}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Plan Picker Cards */}
            <Text style={styles.pickerTitle}>Choose Your Plan</Text>

            {/* Annual Plan (Best Value) */}
            <TouchableOpacity
              style={[
                styles.planCard,
                selectedPlan === 'annual' && styles.planCardActive,
              ]}
              onPress={() => setSelectedPlan('annual')}
              activeOpacity={0.85}
            >
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>SAVE 58% • 7-DAY FREE TRIAL</Text>
              </View>
              <View style={styles.planRow}>
                <View style={styles.radioOuter}>
                  {selectedPlan === 'annual' && <View style={styles.radioInner} />}
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>Annual Membership</Text>
                  <Text style={styles.planBillingNote}>7 days free, then $24.99 billed annually</Text>
                </View>
                <View style={styles.priceBlock}>
                  <Text style={styles.priceBig}>$2.08</Text>
                  <Text style={styles.pricePer}>/ month</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Monthly Plan */}
            <TouchableOpacity
              style={[
                styles.planCard,
                selectedPlan === 'monthly' && styles.planCardActive,
              ]}
              onPress={() => setSelectedPlan('monthly')}
              activeOpacity={0.85}
            >
              <View style={styles.planRow}>
                <View style={styles.radioOuter}>
                  {selectedPlan === 'monthly' && <View style={styles.radioInner} />}
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>Monthly Membership</Text>
                  <Text style={styles.planBillingNote}>Flexible month-to-month billing</Text>
                </View>
                <View style={styles.priceBlock}>
                  <Text style={styles.priceBig}>$4.99</Text>
                  <Text style={styles.pricePer}>/ month</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[styles.primaryCta, loading && { opacity: 0.7 }]}
              onPress={handleUpgrade}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryCtaText}>
                {loading
                  ? 'Activating...'
                  : selectedPlan === 'annual'
                  ? 'Start 7-Day Free Trial →'
                  : 'Upgrade to Bisco Pro →'}
              </Text>
            </TouchableOpacity>

            {/* Reassurance & Legal */}
            <Text style={styles.reassuranceText}>
              Cancel anytime in your device settings. No commitments.
            </Text>

            <View style={styles.footerLinksRow}>
              <TouchableOpacity onPress={() => restorePurchases()}>
                <Text style={styles.footerLink}>Restore Purchases</Text>
              </TouchableOpacity>
              <Text style={styles.footerLinkDivider}>•</Text>
              <TouchableOpacity onPress={() => onOpenLegal?.('terms')}>
                <Text style={styles.footerLink}>Terms of Service</Text>
              </TouchableOpacity>
              <Text style={styles.footerLinkDivider}>•</Text>
              <TouchableOpacity onPress={() => onOpenLegal?.('privacy')}>
                <Text style={styles.footerLink}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(theme: ThemeTokens, isDarkMode: boolean) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      justifyContent: 'flex-end',
    },
    sheetContainer: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      maxHeight: '92%',
      paddingTop: 16,
      paddingBottom: Platform.OS === 'ios' ? 36 : 24,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 20,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 10,
    },
    headerTag: {
      backgroundColor: isDarkMode ? '#332019' : '#FDF1EB',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? '#552A22' : '#F3D2C4',
    },
    headerTagText: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
      color: theme.primary,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.textMuted,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    heroBlock: {
      alignItems: 'center',
      marginTop: 4,
      marginBottom: 16,
    },
    heroIconBadge: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: isDarkMode ? '#3A2E1A' : '#FFF5E0',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? '#5C4A28' : '#F5DEB3',
    },
    heroIcon: {
      fontSize: 28,
    },
    heroTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.textDark,
      letterSpacing: -0.3,
      textAlign: 'center',
    },
    heroSubtitle: {
      fontSize: 14,
      color: theme.textMuted,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 20,
      paddingHorizontal: 10,
    },
    reasonCard: {
      flexDirection: 'row',
      backgroundColor: isDarkMode ? '#2B231D' : '#FFF9EE',
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: isDarkMode ? '#48382C' : '#F7E7CE',
      marginBottom: 16,
      alignItems: 'center',
      gap: 12,
    },
    reasonEmoji: {
      fontSize: 24,
    },
    reasonTextGroup: {
      flex: 1,
    },
    reasonTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textDark,
      marginBottom: 2,
    },
    reasonBody: {
      fontSize: 12,
      lineHeight: 17,
      color: theme.textMuted,
    },
    featuresStack: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 20,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 14,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    featureIconBox: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: theme.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    featureIconText: {
      fontSize: 17,
    },
    featureTextBox: {
      flex: 1,
    },
    featureTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textDark,
      marginBottom: 2,
    },
    featureSubtitle: {
      fontSize: 12,
      lineHeight: 17,
      color: theme.textMuted,
    },
    pickerTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.textDark,
      marginBottom: 10,
    },
    planCard: {
      backgroundColor: theme.surface,
      borderRadius: 18,
      padding: 16,
      borderWidth: 2,
      borderColor: theme.border,
      marginBottom: 12,
      position: 'relative',
    },
    planCardActive: {
      borderColor: theme.primary,
      backgroundColor: isDarkMode ? '#261C18' : '#FFFAF7',
    },
    planBadge: {
      position: 'absolute',
      top: -10,
      right: 16,
      backgroundColor: isDarkMode ? '#244530' : '#4A7C59',
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 10,
    },
    planBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.4,
    },
    planRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    radioOuter: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.primary,
    },
    planInfo: {
      flex: 1,
    },
    planName: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.textDark,
      marginBottom: 2,
    },
    planBillingNote: {
      fontSize: 12,
      color: theme.textMuted,
    },
    priceBlock: {
      alignItems: 'flex-end',
    },
    priceBig: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.textDark,
    },
    pricePer: {
      fontSize: 11,
      color: theme.textMuted,
    },
    primaryCta: {
      backgroundColor: theme.primary,
      borderRadius: 18,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    primaryCtaText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },
    reassuranceText: {
      fontSize: 12,
      color: theme.textMuted,
      textAlign: 'center',
      marginTop: 10,
      lineHeight: 16,
    },
    footerLinksRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 16,
    },
    footerLink: {
      fontSize: 12,
      color: theme.textMuted,
      textDecorationLine: 'underline',
    },
    footerLinkDivider: {
      fontSize: 12,
      color: theme.textMuted,
    },
  });
}
