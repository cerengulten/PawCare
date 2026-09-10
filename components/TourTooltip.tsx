import { RefObject, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';

type Rect = { x: number; y: number; w: number; h: number };

type Props = {
  step: number;
  totalSteps: number;
  title: string;
  body: string;
  targetRef: RefObject<View | null>;
  position: 'top' | 'bottom' | 'left' | 'right';
  /** Called once when the step begins, before measuring — e.g. to scroll the target into view. */
  ensureVisible?: () => void;
  onNext: () => void;
  onSkip: () => void;
};

const PAD = 6; // how far the highlight ring is inflated past the target
const GAP = 12; // gap between target and tooltip card
const EDGE = 16; // min distance from screen edges

export default function TourTooltip({
  step,
  totalSteps,
  title,
  body,
  targetRef,
  position,
  ensureVisible,
  onNext,
  onSkip,
}: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardHeight, setCardHeight] = useState(0);
  const opacity = useRef(new Animated.Value(0)).current;
  const skippedRef = useRef(false);

  const win = Dimensions.get('window');

  // Measure the target once the modal is up. Retry a couple of times because layout can
  // still be settling right after the tab mounts. If it never measures, skip this step.
  useEffect(() => {
    skippedRef.current = false;
    setRect(null);
    ensureVisible?.();
    const maxAttempts = ensureVisible ? 10 : 6;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    const tryMeasure = () => {
      const node = targetRef.current;
      if (!node) {
        retry();
        return;
      }
      node.measureInWindow((x, y, w, h) => {
        if (w > 0 && h > 0 && y + h > 0 && y < win.height) {
          setRect({ x, y, w, h });
        } else {
          retry();
        }
      });
    };
    const retry = () => {
      attempts += 1;
      if (attempts > maxAttempts) {
        if (!skippedRef.current) {
          skippedRef.current = true;
          onNext();
        }
        return;
      }
      timer = setTimeout(tryMeasure, 120);
    };

    timer = setTimeout(tryMeasure, ensureVisible ? 400 : 60);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, targetRef]);

  useEffect(() => {
    if (!rect) return;
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [rect, opacity]);

  if (!rect) {
    return (
      <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onSkip}>
        <View style={styles.fullDim} />
      </Modal>
    );
  }

  const holeX = Math.max(0, rect.x - PAD);
  const holeY = Math.max(0, rect.y - PAD);
  const holeW = rect.w + PAD * 2;
  const holeH = rect.h + PAD * 2;

  const spaceBelow = win.height - (holeY + holeH);
  const spaceAbove = holeY;
  const placeBelow =
    position === 'bottom' || position === 'right'
      ? spaceBelow > cardHeight + GAP + EDGE || spaceBelow >= spaceAbove
      : spaceAbove > cardHeight + GAP + EDGE
        ? false
        : spaceBelow >= spaceAbove;

  const cardTop = placeBelow
    ? holeY + holeH + GAP
    : Math.max(EDGE, holeY - GAP - cardHeight);

  const isLast = step === totalSteps;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onSkip}>
      {/* Four dim bands around the target — leaves the target itself un-dimmed. */}
      <View style={[styles.dim, { top: 0, left: 0, right: 0, height: holeY }]} />
      <View style={[styles.dim, { top: holeY + holeH, left: 0, right: 0, bottom: 0 }]} />
      <View style={[styles.dim, { top: holeY, left: 0, width: holeX, height: holeH }]} />
      <View
        style={[styles.dim, { top: holeY, left: holeX + holeW, right: 0, height: holeH }]}
      />

      {/* Highlight ring */}
      <View
        pointerEvents="none"
        style={[
          styles.ring,
          { top: holeY, left: holeX, width: holeW, height: holeH },
        ]}
      />

      <Animated.View
        onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
        style={[styles.card, { top: cardTop, opacity }]}
      >
        <Text style={styles.counter}>
          {t('tour.stepCounter', { step, total: totalSteps })}
        </Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={onSkip} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.skip}>{t('tour.skip')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextBtn} onPress={onNext}>
            <Text style={styles.nextBtnText}>{isLast ? t('tour.gotIt') : t('tour.next')}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    fullDim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    dim: {
      position: 'absolute',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    ring: {
      position: 'absolute',
      borderWidth: 2,
      borderColor: '#FFFFFF',
      borderRadius: 12,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 8,
      elevation: 8,
    },
    card: {
      position: 'absolute',
      left: EDGE,
      right: EDGE,
      backgroundColor: theme.surface,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 6,
    },
    counter: {
      position: 'absolute',
      top: 12,
      right: 16,
      fontSize: 11,
      color: theme.textMuted,
    },
    title: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.textDark,
      marginBottom: 4,
      paddingRight: 44,
    },
    body: {
      fontSize: 12,
      color: theme.textMuted,
      lineHeight: 18,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 14,
    },
    skip: {
      fontSize: 12,
      color: theme.textMuted,
      fontWeight: '500',
    },
    nextBtn: {
      backgroundColor: theme.primary,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    nextBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
}
