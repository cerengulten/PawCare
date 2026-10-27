import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

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

const SUBSCRIPTION_STORAGE_KEY = '@pawcare_subscription';
const CHAT_USAGE_KEY_PREFIX = '@pawcare_chat_count_';
const MAX_FREE_DAILY_CHATS = 5;

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${CHAT_USAGE_KEY_PREFIX}${y}-${m}-${d}`;
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [dailyChatCount, setDailyChatCount] = useState<number>(0);
  const [paywallVisible, setPaywallVisible] = useState<boolean>(false);
  const [paywallReason, setPaywallReason] = useState<PaywallTriggerReason>('general');

  // Load active subscription state on launch
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
        if (raw) {
          const parsed: StoredSubscription = JSON.parse(raw);
          if (parsed.tier === 'pro') {
            // Check if expired
            if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
              // Expired
              setTier('free');
              setPlan(null);
              setExpiresAt(null);
              await AsyncStorage.removeItem(SUBSCRIPTION_STORAGE_KEY);
            } else {
              setTier('pro');
              setPlan(parsed.plan);
              setExpiresAt(parsed.expiresAt);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load subscription status:', err);
      }
    })();
  }, []);

  // Load today's chat usage
  useEffect(() => {
    (async () => {
      try {
        const todayKey = getTodayKey();
        const raw = await AsyncStorage.getItem(todayKey);
        if (raw) {
          const num = parseInt(raw, 10);
          if (!isNaN(num)) setDailyChatCount(num);
        }
      } catch (err) {
        console.warn('Failed to load chat usage count:', err);
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
    const now = new Date();
    const expiry = new Date(now);
    if (chosenPlan === 'annual') {
      expiry.setFullYear(expiry.getFullYear() + 1);
    } else {
      expiry.setMonth(expiry.getMonth() + 1);
    }

    const payload: StoredSubscription = {
      tier: 'pro',
      plan: chosenPlan,
      subscribedAt: now.toISOString(),
      expiresAt: expiry.toISOString(),
    };

    try {
      await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(payload));
      setTier('pro');
      setPlan(chosenPlan);
      setExpiresAt(payload.expiresAt);
      setPaywallVisible(false);
      Alert.alert(
        'Welcome to Bisco Pro! 🐾👑',
        'Your upgrade was successful. Unlimited pet profiles, 24/7 AI consultations, and Vet PDF dossiers are now fully unlocked!'
      );
    } catch (err) {
      console.error('Failed to save subscription:', err);
      Alert.alert('Upgrade Error', 'Could not complete subscription upgrade. Please try again.');
    }
  };

  const cancelPro = async () => {
    try {
      await AsyncStorage.removeItem(SUBSCRIPTION_STORAGE_KEY);
      setTier('free');
      setPlan(null);
      setExpiresAt(null);
      Alert.alert('Subscription Canceled', 'You have reverted to the Bisco Free tier.');
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    try {
      const raw = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
      if (raw) {
        const parsed: StoredSubscription = JSON.parse(raw);
        if (parsed.tier === 'pro' && (!parsed.expiresAt || new Date(parsed.expiresAt) > new Date())) {
          setTier('pro');
          setPlan(parsed.plan);
          setExpiresAt(parsed.expiresAt);
          Alert.alert('Purchases Restored! ✨', 'Your Bisco Pro subscription is active.');
          return true;
        }
      }
      Alert.alert('No Subscription Found', 'We could not find an active Bisco Pro subscription for this account.');
      return false;
    } catch {
      Alert.alert('Restore Failed', 'Unable to reach the store. Please check your connection.');
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
