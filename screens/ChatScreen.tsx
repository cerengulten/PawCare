import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  BackHandler,
  StyleSheet,
  Keyboard,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps, useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Dog } from '../types';
import SwipeBackWrapper from '../components/SwipeBackWrapper';
import MarkdownText from '../components/MarkdownText';
import { useAllergens } from '../lib/hooks/useAllergens';
import { useMealDetails } from '../lib/hooks/useMealDetails';
import { useMoodHistory } from '../lib/hooks/useMoodHistory';
import { useHealthLogs } from '../lib/hooks/useHealthLogs';
import { useVomitLogs } from '../lib/hooks/useVomitLogs';
import { useWaterLogs } from '../lib/hooks/useWaterLogs';
import { buildDogContextSummary } from '../lib/dogContextSummary';
import { hasGeminiApiKey, sendChatMessage, ChatTurn } from '../lib/gemini';
import { triggerLightHaptic } from '../lib/haptics';
import { RootTabParamList } from './AppTabs';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { useSubscription } from '../lib/SubscriptionContext';
import { LANG_LABELS } from '../lib/i18n';
import { ThemeTokens } from '../lib/themes';

type Props = BottomTabScreenProps<RootTabParamList, 'Chat'> & {
  dogs: Dog[];
  selectedDogId: string | null;
  onSwipeBack: () => void;
};

type UIMessage = ChatTurn & {
  isError?: boolean;
  retryPrompt?: string;
};

const SCOPE_INSTRUCTION = `You are a friendly, knowledgeable, and careful pet-care assistant inside the Bisco app.
IMPORTANT: You are an AI assistant, NOT a veterinarian. You cannot diagnose medical conditions or prescribe medications.
Only answer questions about: food amounts, safe/toxic foods, hydration, poop/vomit triage, hypoallergenic diet questions, and general symptom guidance. Politely decline anything outside pet care.

CRITICAL MEDICAL & SAFETY RULES:
1. Always explicitly remind the pet parent to consult their licensed veterinarian whenever discussing any symptom, illness, health abnormality, or diet change.
2. For severe symptoms, blood, severe pain, breathing difficulty, poisoning/toxin ingestion, persistent vomiting, or lethargy, urge the user to seek immediate emergency veterinary attention.
3. Keep answers concise, empathetic, and clear. Use clean Markdown formatting (**bold** key points and short bullet lists) where helpful for readability.`;

export default function ChatScreen({ dogs, selectedDogId, onSwipeBack, navigation, route }: Props) {
  const { theme, isDarkMode } = useTheme();
  const { t, lang } = useT();
  const {
    canSendChatMessage,
    recordChatMessage,
    isPro,
    remainingDailyChats,
    maxFreeDailyChats,
    openPaywall,
  } = useSubscription();
  const styles = useMemo(() => makeStyles(theme, isDarkMode), [theme, isDarkMode]);
  const activeDog = dogs.find((d) => d.id === selectedDogId) ?? dogs[0] ?? null;

  const buildGreeting = (dogName: string): UIMessage => ({
    role: 'model',
    text: t('chat.greeting', { name: dogName }),
  });

  const { allergens } = useAllergens(activeDog?.id ?? '');
  const { mealDetails } = useMealDetails(activeDog?.id ?? '');
  const { historyByDate: moodHistoryByDate } = useMoodHistory(activeDog?.id ?? null, 7);
  const { logs: healthLogs } = useHealthLogs(activeDog?.id ?? null);
  const { logs: vomitLogs } = useVomitLogs(activeDog?.id ?? null);
  const { logs: waterLogs } = useWaterLogs(activeDog?.id ?? null, 7);

  const [messages, setMessages] = useState<UIMessage[]>(
    activeDog ? [buildGreeting(activeDog.name)] : []
  );
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [swipeEnabled, setSwipeEnabled] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const prevMessagesCountRef = useRef(messages.length);
  const bottomTabBarHeight = useBottomTabBarHeight();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const starterPrompts = useMemo(
    () => [
      {
        icon: <Ionicons name="restaurant-outline" size={14} color={theme.primary} />,
        text: t('chat.starterChicken') || 'Is cooked chicken safe daily?',
      },
      {
        icon: <Ionicons name="water-outline" size={14} color={theme.primary} />,
        text: t('chat.starterWater') || 'How much water does my dog need?',
      },
      {
        icon: <Ionicons name="shield-checkmark-outline" size={14} color={theme.primary} />,
        text: t('chat.starterVaccine') || 'Common puppy vaccine reactions',
      },
      {
        icon: <Feather name="activity" size={14} color={theme.primary} />,
        text: t('chat.starterPoop') || 'Soft stool for 2 days — what to do?',
      },
    ],
    [t, theme.primary]
  );

  useEffect(() => {
    if (activeDog) {
      setMessages([buildGreeting(activeDog.name)]);
      prevMessagesCountRef.current = 1;
    }
  }, [activeDog?.id]);

  useEffect(() => {
    if (messages.length > prevMessagesCountRef.current && messages.length > 1) {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
    prevMessagesCountRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    return navigation.addListener('focus', () => {
      if (route.params?.fromLink) {
        setSwipeEnabled(true);
        navigation.setParams({ fromLink: undefined });
      } else {
        setSwipeEnabled(false);
      }
    });
  }, [navigation, route.params?.fromLink]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (swipeEnabled) {
          onSwipeBack();
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [swipeEnabled, onSwipeBack])
  );

  async function handleSend(overrideText?: string, isRetry = false) {
    const text = (typeof overrideText === 'string' ? overrideText : input).trim();
    if (!text || sending) return;

    if (!isRetry && !canSendChatMessage()) {
      openPaywall('ai_consultations');
      return;
    }

    triggerLightHaptic();

    const baseMessages = isRetry
      ? messages.filter((m) => !m.isError)
      : [...messages, { role: 'user' as const, text }];

    const cleanHistory: ChatTurn[] = baseMessages.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    setMessages(baseMessages);
    if (!isRetry) {
      setInput('');
      await recordChatMessage();
    }
    setSending(true);

    try {
      const systemInstruction = `${SCOPE_INSTRUCTION}\n\n${t('chat.respondInLanguage', {
        language: LANG_LABELS[lang],
      })}\n\nDog profile and recent data:\n${buildDogContextSummary(activeDog!, {
        allergens,
        mealDetails,
        moodHistoryByDate,
        healthLogs,
        vomitLogs,
        waterLogs,
      })}`;
      const reply = await sendChatMessage(cleanHistory, systemInstruction);
      setMessages((prev) => [...prev, { role: 'model', text: reply }]);
    } catch (err) {
      console.log('Chat send failed:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: t('chat.sendFailed'),
          isError: true,
          retryPrompt: text,
        },
      ]);
    } finally {
      setSending(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  }

  let content;
  if (!activeDog) {
    content = (
      <View style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t('chat.addPetFirst')}</Text>
        </View>
      </View>
    );
  } else if (!hasGeminiApiKey()) {
    content = (
      <View style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t('chat.notSetUp')}</Text>
        </View>
      </View>
    );
  } else {
    content = (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? bottomTabBarHeight : 0}
      >
        <View style={styles.disclaimerBar}>
          <View style={styles.disclaimerIconBox}>
            <Ionicons name="medkit-outline" size={16} color={theme.primary} />
          </View>
          <Text style={styles.disclaimerText}>{t('chat.disclaimer')}</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        >
          {messages.map((m, i) => (
            <View
              key={i}
              style={[
                styles.bubble,
                m.role === 'user' ? styles.bubbleUser : styles.bubbleModel,
                m.isError && styles.bubbleError,
              ]}
            >
              {m.role === 'user' ? (
                <Text style={styles.bubbleTextUser}>{m.text}</Text>
              ) : (
                <>
                  <MarkdownText>{m.text}</MarkdownText>
                  {m.isError && m.retryPrompt ? (
                    <TouchableOpacity
                      style={styles.retryBtn}
                      onPress={() => handleSend(m.retryPrompt, true)}
                      disabled={sending}
                      activeOpacity={0.75}
                    >
                      <Feather name="refresh-cw" size={13} color={theme.primary} />
                      <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              )}
            </View>
          ))}
          {sending ? (
            <View style={[styles.bubble, styles.bubbleModel]}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : null}
        </ScrollView>

        {/* Freemium AI Chat Usage Strip */}
        {isPro ? (
          <View style={styles.quotaRowPro}>
            <Ionicons name="sparkles-outline" size={14} color={isDarkMode ? '#FBBF24' : '#B45309'} />
            <Text style={styles.quotaProText}>Bisco Pro AI · Unlimited 24/7 Triage</Text>
          </View>
        ) : (
          <View style={styles.quotaRow}>
            <Text style={styles.quotaText}>
              Free AI: {remainingDailyChats} of {maxFreeDailyChats} chats left today
            </Text>
            <TouchableOpacity
              onPress={() => openPaywall('ai_consultations')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.quotaUpgradeBtn}>Upgrade</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Starter Prompt Chips when empty/initial conversation */}
        {messages.length <= 1 && !isKeyboardVisible && (
          <View style={styles.starterChipsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.starterChipsContent}
            >
              {starterPrompts.map((prompt, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.starterChip}
                  onPress={() => handleSend(prompt.text)}
                  activeOpacity={0.7}
                  disabled={sending}
                >
                  {prompt.icon}
                  <Text style={styles.starterChipText}>{prompt.text}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.composerRow}>
          <TextInput
            style={styles.input}
            placeholder={t('chat.inputPlaceholder', { name: activeDog.name })}
            placeholderTextColor={theme.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (sending || !input.trim()) && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={sending || !input.trim()}
          >
            <Feather name="send" size={17} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return swipeEnabled ? <SwipeBackWrapper onBack={onSwipeBack}>{content}</SwipeBackWrapper> : content;
}

function makeStyles(theme: ThemeTokens, isDarkMode = false) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight ?? 24) + 6,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    emptyText: {
      fontSize: 15,
      color: theme.textMuted,
      textAlign: 'center',
    },
    disclaimerBar: {
      backgroundColor: isDarkMode ? '#251D18' : '#FFF9F2',
      borderBottomWidth: 1.5,
      borderBottomColor: isDarkMode ? '#3D2F24' : '#F6E6D4',
      paddingVertical: 10,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    disclaimerIconBox: {
      width: 28,
      height: 28,
      borderRadius: 9,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    disclaimerText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 16,
      color: theme.textDark,
      fontWeight: '600',
    },
    messages: {
      flex: 1,
    },
    messagesContent: {
      padding: 16,
      gap: 12,
    },
    bubble: {
      maxWidth: '84%',
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    bubbleUser: {
      alignSelf: 'flex-end',
      backgroundColor: theme.primary,
      borderRadius: 20,
      borderBottomRightRadius: 4,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    bubbleModel: {
      alignSelf: 'flex-start',
      backgroundColor: theme.surface,
      borderRadius: 20,
      borderBottomLeftRadius: 4,
      borderWidth: 1.5,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDarkMode ? 0.2 : 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    bubbleError: {
      borderColor: theme.alertBorder,
    },
    bubbleTextUser: {
      color: '#FFFFFF',
      fontSize: 15,
      lineHeight: 21,
      fontWeight: '500',
    },
    retryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      marginTop: 10,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: theme.primaryLight,
      borderWidth: 1,
      borderColor: theme.primary,
    },
    retryBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
    },
    starterChipsContainer: {
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.background,
    },
    starterChipsContent: {
      paddingHorizontal: 16,
      gap: 8,
    },
    starterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.surface,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 1,
    },
    starterChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textDark,
    },
    quotaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.surfaceAlt,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    quotaText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
    },
    quotaUpgradeBtn: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.primary,
    },
    quotaRowPro: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 7,
      backgroundColor: isDarkMode ? '#292218' : '#FEF9EC',
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#4A3923' : '#F5E4B8',
    },
    quotaProText: {
      fontSize: 11,
      fontWeight: '800',
      color: isDarkMode ? '#FBBF24' : '#B45309',
      letterSpacing: 0.3,
    },
    composerRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      padding: 12,
      paddingBottom: 12,
      gap: 10,
      backgroundColor: theme.surface,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 110,
      backgroundColor: theme.surfaceAlt,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.textDark,
      borderWidth: 1,
      borderColor: theme.border,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    sendBtnDisabled: {
      opacity: 0.4,
      shadowOpacity: 0,
      elevation: 0,
    },
  });
}
