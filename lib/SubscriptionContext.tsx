import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform, Linking } from 'react-native';

export type SubscriptionTier = 'free' | 'pro';
export type SubscriptionPlan = 'monthly' | 'annual';

export type PaywallTriggerReason =
  | 'unlimited_pets'
  | 'ai_consultations'
  | 'pdf_export'
  | 'cycle_analytics'
  | 'general';

interface StoredSubscription {
  tier: SubscriptionTier;
  plan: SubscriptionPlan | null;
  subscribedAt: string | null;
  expiresAt: string | null;
}

export interface SubscriptionContextValue {
  tier: SubscriptionTier;
  isPro: boolean;
  plan: SubscriptionPlan | null;
  expiresAt: string | null;
  dailyChatCount: number;
  maxFreeDailyChats: number;
  remainingDailyChats: number;
  canSendChatMessage: () => boolean;
  recordChatMessage: () => Promise<void>;
  canAddDog: (currentDogCount: number) => boolean;
  canExportPdf: () => boolean;
  upgradeToPro: (chosenPlan: SubscriptionPlan) => Promise<void>;
  cancelPro: () => Promise<void>;
  restorePurchases: () => Promise<boolean>;
  // Paywall Modal State
  paywallVisible: boolean;
  paywallReason: PaywallTriggerReason;
  openPaywall: (reason?: PaywallTriggerReason) => void;
  closePaywall: () => void;
}

const SUBSCRIPTION_STORAGE_KEY = '@bisco_subscription_cache';
const CHAT_USAGE_KEY_PREFIX = '@bisco_chat_count_';
const LEGACY_CHAT_USAGE_KEY_PREFIX = '@pawcare_chat_count_';
const MAX_FREE_DAILY_CHATS = 5;
const ENTITLEMENT_ID = 'pro';

const REVENUECAT_IOS_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ||
  process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY ||
  process.env.EXPO_PUBLIC_REVENUECAT_KEY ||
  '';
const REVENUECAT_ANDROID_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ||
  process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY ||
  process.env.EXPO_PUBLIC_REVENUECAT_KEY ||
  '';

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${CHAT_USAGE_KEY_PREFIX}${y}-${m}-${d}`;
}

function getLegacyTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${LEGACY_CHAT_USAGE_KEY_PREFIX}${y}-${m}-${d}`;
}

let rcConfigured = false;

async function getRevenueCatModule() {
  try {
    const mod = await import('react-native-purchases');
    const Purchases = mod.default ?? mod;
    if (!Purchases || typeof Purchases.configure !== 'function') {
      return null;
    }
    return Purchases;
  } catch {
    return null;
  }
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [dailyChatCount, setDailyChatCount] = useState<number>(0);
  const [paywallVisible, setPaywallVisible] = useState<boolean>(false);
  const [paywallReason, setPaywallReason] = useState<PaywallTriggerReason>('general');

  const syncFromCustomerInfo = useCallback(async (customerInfo: any) => {
    if (!customerInfo?.entitlements?.active) return false;
    const activeEntitlement =
      customerInfo.entitlements.active[ENTITLEMENT_ID] ||
      customerInfo.entitlements.active['bisco_pro'] ||
      Object.values(customerInfo.entitlements.active)[0];

    if (activeEntitlement) {
      const prodId = String(activeEntitlement.productIdentifier || '').toLowerCase();
      const detectedPlan: SubscriptionPlan =
        prodId.includes('annual') || prodId.includes('year') ? 'annual' : 'monthly';
      const exp = activeEntitlement.expirationDate || null;

      setTier('pro');
      setPlan(detectedPlan);
      setExpiresAt(exp);

      const cachePayload: StoredSubscription = {
        tier: 'pro',
        plan: detectedPlan,
        subscribedAt: activeEntitlement.latestPurchaseDate || new Date().toISOString(),
        expiresAt: exp,
      };
      await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(cachePayload)).catch(() => {});
      return true;
    } else {
      setTier('free');
      setPlan(null);
      setExpiresAt(null);
      await AsyncStorage.removeItem(SUBSCRIPTION_STORAGE_KEY).catch(() => {});
      return false;
    }
  }, []);

  // Initialize RevenueCat (StoreKit / Google Play Billing) and sync entitlements on launch
  useEffect(() => {
    let removeListener: (() => void) | undefined;

    (async () => {
      // 1. Load last verified entitlement cache for instant offline startup
      try {
        const raw = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
        if (raw) {
          const parsed: StoredSubscription = JSON.parse(raw);
          if (parsed.tier === 'pro' && (!parsed.expiresAt || new Date(parsed.expiresAt) > new Date())) {
            setTier('pro');
            setPlan(parsed.plan);
            setExpiresAt(parsed.expiresAt);
          }
        }
      } catch {
        // ignore cache read error
      }

      // 2. Configure RevenueCat native SDK and verify live receipt entitlements
      try {
        const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
        const Purchases = await getRevenueCatModule();
        if (Purchases && apiKey) {
          if (!rcConfigured) {
            Purchases.configure({ apiKey });
            rcConfigured = true;
          }
          const customerInfo = await Purchases.getCustomerInfo();
          await syncFromCustomerInfo(customerInfo);

          const listener = (info: any) => {
            syncFromCustomerInfo(info);
          };
          Purchases.addCustomerInfoUpdateListener(listener);
          removeListener = () => {
            try {
              Purchases.removeCustomerInfoUpdateListener(listener);
            } catch {
              // ignore cleanup error
            }
          };
        }
      } catch (err) {
        console.warn('RevenueCat initialization notice:', err);
      }
    })();

    return () => {
      if (removeListener) removeListener();
    };
  }, [syncFromCustomerInfo]);

  // Load today's chat usage
  useEffect(() => {
    (async () => {
      try {
        const key = getTodayKey();
        const legacyKey = getLegacyTodayKey();
        const raw = (await AsyncStorage.getItem(key)) || (await AsyncStorage.getItem(legacyKey));
        if (raw) {
          const num = parseInt(raw, 10);
          if (!isNaN(num)) setDailyChatCount(num);
        }
      } catch (err) {
        console.warn('Failed to load daily chat usage:', err);
      }
    })();
  }, []);

  const isPro = tier === 'pro';

  const remainingDailyChats = isPro
    ? Infinity
    : Math.max(0, MAX_FREE_DAILY_CHATS - dailyChatCount);

  const canSendChatMessage = () => {
    if (isPro) return true;
    return dailyChatCount < MAX_FREE_DAILY_CHATS;
  };

  const recordChatMessage = async () => {
    if (isPro) return;
    const nextCount = dailyChatCount + 1;
    setDailyChatCount(nextCount);
    try {
      await AsyncStorage.setItem(getTodayKey(), String(nextCount));
    } catch (err) {
      console.warn('Failed to save chat usage:', err);
    }
  };

  const canAddDog = (currentDogCount: number) => {
    if (isPro) return true;
    return currentDogCount < 1;
  };

  const canExportPdf = () => {
    return isPro;
  };

  const upgradeToPro = async (chosenPlan: SubscriptionPlan) => {
    try {
      const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
      const Purchases = await getRevenueCatModule();

      if (!Purchases || !apiKey) {
        Alert.alert(
          'Store Unavailable',
          'In-App Purchases are not available in this build environment. Please install Bisco from the App Store or Google Play to subscribe.'
        );
        return;
      }

      if (!rcConfigured) {
        Purchases.configure({ apiKey });
        rcConfigured = true;
      }

      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings?.current;
      const availablePackages = currentOffering?.availablePackages ?? [];

      const targetPackage =
        (chosenPlan === 'annual' ? currentOffering?.annual : currentOffering?.monthly) ||
        availablePackages.find((pkg: any) => {
          const id = String(pkg.identifier || pkg.product?.identifier || '').toLowerCase();
          return chosenPlan === 'annual'
            ? id.includes('annual') || id.includes('year')
            : id.includes('month');
        }) ||
        availablePackages[0];

      if (!targetPackage) {
        Alert.alert(
          'Subscription Plan Unavailable',
          'We could not load subscription packages from the store right now. Please check your connection and try again.'
        );
        return;
      }

      const { customerInfo } = await Purchases.purchasePackage(targetPackage);
      const unlocked = await syncFromCustomerInfo(customerInfo);

      if (unlocked) {
        setPaywallVisible(false);
        Alert.alert(
          'Welcome to Bisco Pro! 🐾',
          'Your subscription was verified by the store. Unlimited pet profiles, 24/7 AI consultations, and Vet PDF dossiers are now unlocked!'
        );
      } else {
        Alert.alert(
          'Verification Pending',
          'Your purchase was submitted, but store receipt validation is still processing. Tap "Restore Purchases" in a moment if Pro does not appear automatically.'
        );
      }
    } catch (err: any) {
      if (err?.userCancelled) {
        // User dismissed native StoreKit / Google Play Billing sheet; no error alert needed
        return;
      }
      console.error('Store purchase failed:', err);
      Alert.alert(
        'Purchase Could Not Be Completed',
        err?.message || 'Unable to verify your purchase with the store. Please try again.'
      );
    }
  };

  const cancelPro = async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('https://apps.apple.com/account/subscriptions');
      } else {
        await Linking.openURL('https://play.google.com/store/account/subscriptions');
      }
    } catch {
      Alert.alert(
        'Manage Subscription',
        Platform.OS === 'ios'
          ? 'Open iOS Settings → Apple ID → Subscriptions to manage or cancel your Bisco Pro plan.'
          : 'Open Google Play Store → Payments & subscriptions → Subscriptions to manage or cancel your Bisco Pro plan.'
      );
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    try {
      const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
      const Purchases = await getRevenueCatModule();

      if (!Purchases || !apiKey) {
        Alert.alert(
          'Restore Unavailable',
          'Store connection is not configured in this build environment.'
        );
        return false;
      }

      if (!rcConfigured) {
        Purchases.configure({ apiKey });
        rcConfigured = true;
      }

      const customerInfo = await Purchases.restorePurchases();
      const restored = await syncFromCustomerInfo(customerInfo);

      if (restored) {
        setPaywallVisible(false);
        Alert.alert('Purchases Restored!', 'Your active Bisco Pro subscription has been verified and restored.');
        return true;
      }

      Alert.alert(
        'No Active Subscription Found',
        'We could not find an active Bisco Pro subscription linked to your Apple ID or Google Play account.'
      );
      return false;
    } catch (err: any) {
      console.warn('Restore purchases error:', err);
      Alert.alert(
        'Restore Failed',
        err?.message || 'Unable to reach the store to verify your receipts. Please check your connection.'
      );
      return false;
    }
  };

  const openPaywall = (reason: PaywallTriggerReason = 'general') => {
    setPaywallReason(reason);
    setPaywallVisible(true);
  };

  const closePaywall = () => {
    setPaywallVisible(false);
  };

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      tier,
      isPro,
      plan,
      expiresAt,
      dailyChatCount,
      maxFreeDailyChats: MAX_FREE_DAILY_CHATS,
      remainingDailyChats,
      canSendChatMessage,
      recordChatMessage,
      canAddDog,
      canExportPdf,
      upgradeToPro,
      cancelPro,
      restorePurchases,
      paywallVisible,
      paywallReason,
      openPaywall,
      closePaywall,
    }),
    [
      tier,
      isPro,
      plan,
      expiresAt,
      dailyChatCount,
      remainingDailyChats,
      paywallVisible,
      paywallReason,
    ]
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error('useSubscription() must be used within a SubscriptionProvider');
  }
  return ctx;
}
