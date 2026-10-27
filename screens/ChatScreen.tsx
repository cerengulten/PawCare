import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Dog } from '../types';
import SwipeBackWrapper from '../components/SwipeBackWrapper';
import { useAllergens } from '../lib/hooks/useAllergens';
import { useMealDetails } from '../lib/hooks/useMealDetails';
import { useMoodHistory } from '../lib/hooks/useMoodHistory';
import { useHealthLogs } from '../lib/hooks/useHealthLogs';
import { useVomitLogs } from '../lib/hooks/useVomitLogs';
import { useWaterLogs } from '../lib/hooks/useWaterLogs';
import { buildDogContextSummary } from '../lib/dogContextSummary';
import { hasGeminiApiKey, sendChatMessage, ChatTurn } from '../lib/gemini';
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

const SCOPE_INSTRUCTION = `You are a friendly, knowledgeable, and careful pet-care assistant inside the Bisco app.
IMPORTANT: You are an AI assistant, NOT a veterinarian. You cannot diagnose medical conditions or prescribe medications.
Only answer questions about: food amounts, safe/toxic foods, hydration, poop/vomit triage, hypoallergenic diet questions, and general symptom guidance. Politely decline anything outside pet care.

CRITICAL MEDICAL & SAFETY RULES:
1. Always explicitly remind the pet parent to consult their licensed veterinarian whenever discussing any symptom, illness, health abnormality, or diet change.
2. For severe symptoms, blood, severe pain, breathing difficulty, poisoning/toxin ingestion, persistent vomiting, or lethargy, urge the user to seek immediate emergency veterinary attention.
3. Keep answers concise, empathetic, and clear.

Respond in plain text only — no markdown (no asterisks, no headers, no numbered/bulleted lists). Write short plain sentences or paragraphs instead, since the chat UI displays raw text.`;

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
  const activeDog = dogs.find(d => d.id === selectedDogId) ?? dogs[0] ?? null;

  const buildGreeting = (dogName: string): ChatTurn => ({
    role: 'model',
    text: t('chat.greeting', { name: dogName }),
  });

  const { allergens } = useAllergens(activeDog?.id ?? '');
  const { mealDetails } = useMealDetails(activeDog?.id ?? '');
  const { historyByDate: moodHistoryByDate } = useMoodHistory(activeDog?.id ?? null, 7);
  const { logs: healthLogs } = useHealthLogs(activeDog?.id ?? null);
  const { logs: vomitLogs } = useVomitLogs(activeDog?.id ?? null);
  const { logs: waterLogs } = useWaterLogs(activeDog?.id ?? null, 7);

  const [messages, setMessages] = useState<ChatTurn[]>(
    activeDog ? [buildGreeting(activeDog.name)] : []
  );
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [swipeEnabled, setSwipeEnabled] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Tab screens stay mounted in the background (React Navigation doesn't unmount an
  // unfocused tab by default), so switching the active pet elsewhere in the app re-renders
  // this screen with a new `activeDog` but wouldn't otherwise touch `messages` — the
  // greeting and conversation history would keep referencing the previous dog. Reset the
  // conversation whenever the active dog actually changes.
  useEffect(() => {
    if (activeDog) setMessages([buildGreeting(activeDog.name)]);
  }, [activeDog?.id]);

  // Swipe-back is only meaningful when Chat was entered via a drill-in link (Home's "Ask
  // about..." bar) — sitting on the Chat tab normally (like Pets/More/Home) shouldn't swipe.
  // A plain `useEffect` keyed on `route.params?.fromLink` only reacts to the param
  // *changing*, so after we clear it below it would never re-fire on a later plain tab
  // press (param stays `undefined` both before and after) and `swipeEnabled` would stay
  // stuck `true`. Listening to `focus` instead re-evaluates on every visit, param-driven or not.
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

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    if (!canSendChatMessage()) {
      openPaywall('ai_consultations');
      return;
    }

    const nextHistory: ChatTurn[] = [...messages, { role: 'user', text }];
    setMessages(nextHistory);
    setInput('');
    setSending(true);
    await recordChatMessage();
    try {
      const systemInstruction = `${SCOPE_INSTRUCTION}\n\n${t('chat.respondInLanguage', { language: LANG_LABELS[lang] })}\n\nDog profile and recent data:\n${buildDogContextSummary(
        activeDog!,
        { allergens, mealDetails, moodHistoryByDate, healthLogs, vomitLogs, waterLogs }
      )}`;
      const reply = await sendChatMessage(nextHistory, systemInstruction);
      setMessages(prev => [...prev, { role: 'model', text: reply }]);
    } catch (err) {
      console.log('Chat send failed:', err);
      setMessages(prev => [
        ...prev,
        { role: 'model', text: t('chat.sendFailed') },
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
          <Text style={styles.emptyText}>
            {t('chat.notSetUp')}
          </Text>
        </View>
      </View>
    );
  } else {
    content = (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <View style={styles.disclaimerBar}>
          <Text style={styles.disclaimerIcon}>🩺</Text>
          <Text style={styles.disclaimerText}>{t('chat.disclaimer')}</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((m, i) => (
            <View
              key={i}
              style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleModel]}
            >
              <Text style={m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextModel}>
                {m.text}
              </Text>
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
            <Text style={styles.quotaProText}>👑 Bisco Pro AI · Unlimited 24/7 Triage</Text>
          </View>
        ) : (
          <View style={styles.quotaRow}>
            <Text style={styles.quotaText}>
              🐾 Free AI: {remainingDailyChats} of {maxFreeDailyChats} chats left today
            </Text>
            <TouchableOpacity
              onPress={() => openPaywall('ai_consultations')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.quotaUpgradeBtn}>Upgrade 👑</Text>
            </TouchableOpacity>
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
            onPress={handleSend}
            disabled={sending || !input.trim()}
          >
            <Text style={styles.sendBtnText}>➤</Text>
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
      paddingTop: 60,
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
    disclaimerIcon: {
      fontSize: 18,
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
      maxWidth: '82%',
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
    bubbleTextUser: {
      color: '#FFFFFF',
      fontSize: 15,
      lineHeight: 21,
      fontWeight: '500',
    },
    bubbleTextModel: {
      color: theme.textDark,
      fontSize: 15,
      lineHeight: 21,
    },
    composerRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      padding: 12,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.surface,
    },
    quotaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 9,
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
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 7,
      backgroundColor: theme.surfaceAlt,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    quotaProText: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.done,
      letterSpacing: 0.3,
    },
    input: {
      flex: 1,
      maxHeight: 110,
      backgroundColor: theme.surfaceAlt,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: theme.border,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.textDark,
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
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    sendBtnDisabled: {
      opacity: 0.45,
    },
    sendBtnText: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '800',
    },
  });
}
