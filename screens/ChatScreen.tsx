import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Dog } from '../types';
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
import { ThemeTokens } from '../lib/themes';

type Props = BottomTabScreenProps<RootTabParamList, 'Chat'> & {
  dogs: Dog[];
  selectedDogId: string | null;
};

const SCOPE_INSTRUCTION = `You are a friendly, careful pet-care assistant inside the Bisco app.
Only answer questions about: food amounts, safe/toxic foods, hydration, poop/vomit triage,
hypoallergenic diet questions, and general symptom guidance. Politely decline anything else.

Always defer to a veterinarian for: diagnosis, medication doses, severe symptoms, blood, or
neurological signs — and include a brief "please see your vet" note whenever you discuss any
symptom, illness, or triage question. Keep answers short and practical.

Respond in plain text only — no markdown (no asterisks, no headers, no numbered/bulleted
lists). Write short plain sentences or paragraphs instead, since the chat UI displays raw text.`;

function buildGreeting(dogName: string): ChatTurn {
  return { role: 'model', text: `Hi! Ask me about ${dogName}'s food, hydration, or symptoms.` };
}

export default function ChatScreen({ dogs, selectedDogId }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const activeDog = dogs.find(d => d.id === selectedDogId) ?? dogs[0] ?? null;

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
  const scrollRef = useRef<ScrollView>(null);

  // Tab screens stay mounted in the background (React Navigation doesn't unmount an
  // unfocused tab by default), so switching the active pet elsewhere in the app re-renders
  // this screen with a new `activeDog` but wouldn't otherwise touch `messages` — the
  // greeting and conversation history would keep referencing the previous dog. Reset the
  // conversation whenever the active dog actually changes.
  useEffect(() => {
    if (activeDog) setMessages([buildGreeting(activeDog.name)]);
  }, [activeDog?.id]);

  if (!activeDog) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Add a pet first to start chatting.</Text>
        </View>
      </View>
    );
  }

  if (!hasGeminiApiKey()) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            AI Care Chat isn't set up yet — missing EXPO_PUBLIC_GEMINI_API_KEY.
          </Text>
        </View>
      </View>
    );
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    const nextHistory: ChatTurn[] = [...messages, { role: 'user', text }];
    setMessages(nextHistory);
    setInput('');
    setSending(true);
    try {
      const systemInstruction = `${SCOPE_INSTRUCTION}\n\nDog profile and recent data:\n${buildDogContextSummary(
        activeDog!,
        { allergens, mealDetails, moodHistoryByDate, healthLogs, vomitLogs, waterLogs }
      )}`;
      const reply = await sendChatMessage(nextHistory, systemInstruction);
      setMessages(prev => [...prev, { role: 'model', text: reply }]);
    } catch (err) {
      console.log('Chat send failed:', err);
      setMessages(prev => [
        ...prev,
        { role: 'model', text: "Sorry, I couldn't get a response. Please try again." },
      ]);
    } finally {
      setSending(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <View style={styles.disclaimerBar}>
        <Text style={styles.disclaimerText}>⚠️ Not a substitute for veterinary care</Text>
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

      <View style={styles.composerRow}>
        <TextInput
          style={styles.input}
          placeholder={`Ask about ${activeDog.name}...`}
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

function makeStyles(theme: ThemeTokens) {
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
      backgroundColor: theme.alertBg,
      borderBottomWidth: 1,
      borderBottomColor: theme.alertBorder,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    disclaimerText: {
      fontSize: 12,
      color: theme.textDark,
      textAlign: 'center',
    },
    messages: {
      flex: 1,
    },
    messagesContent: {
      padding: 16,
      gap: 10,
    },
    bubble: {
      maxWidth: '80%',
      borderRadius: theme.radiiCard,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    bubbleUser: {
      alignSelf: 'flex-end',
      backgroundColor: theme.primary,
    },
    bubbleModel: {
      alignSelf: 'flex-start',
      backgroundColor: theme.surfaceAlt,
    },
    bubbleTextUser: {
      color: '#FFFFFF',
      fontSize: 15,
    },
    bubbleTextModel: {
      color: theme.textDark,
      fontSize: 15,
    },
    composerRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      padding: 12,
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.surface,
    },
    input: {
      flex: 1,
      maxHeight: 100,
      backgroundColor: theme.surfaceAlt,
      borderRadius: theme.radiiCard,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.textDark,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: {
      opacity: 0.5,
    },
    sendBtnText: {
      color: '#FFFFFF',
      fontSize: 16,
    },
  });
}
