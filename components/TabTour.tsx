import { RefObject, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { hasSeenTour, markTourSeen, subscribeTourReset, TourTab } from '../lib/hooks/useTourState';
import TourTooltip from './TourTooltip';

export type TourStep = {
  targetRef: RefObject<View | null>;
  position: 'top' | 'bottom' | 'left' | 'right';
  title: string;
  body: string;
  /** Runs when the step begins, before measuring — e.g. scroll the target into view. */
  ensureVisible?: () => void;
};

type Props = {
  tab: TourTab;
  steps: TourStep[];
  /** Only start once the tab actually has the content the steps point at. */
  enabled: boolean;
  /** Optional cleanup callback when the tour finishes or is skipped. */
  onFinish?: () => void;
};

const START_DELAY_MS = 450;

export default function TabTour({ tab, steps, enabled, onFinish }: Props) {
  const isFocused = useIsFocused();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [resetTick, setResetTick] = useState(0);
  const runningRef = useRef(false);

  useEffect(() => {
    return subscribeTourReset(() => {
      runningRef.current = false;
      setActive(false);
      setStepIndex(0);
      setResetTick((n) => n + 1);
    });
  }, []);

  useEffect(() => {
    if (!enabled || !isFocused || runningRef.current) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    hasSeenTour(tab).then((seen) => {
      if (cancelled || seen || runningRef.current) return;
      timer = setTimeout(() => {
        if (cancelled) return;
        runningRef.current = true;
        setStepIndex(0);
        setActive(true);
      }, START_DELAY_MS);
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, isFocused, tab, resetTick]);

  const finish = () => {
    markTourSeen(tab);
    setActive(false);
    setStepIndex(0);
    runningRef.current = false;
    onFinish?.();
  };

  const handleNext = () => {
    if (stepIndex + 1 < steps.length) {
      setStepIndex(stepIndex + 1);
    } else {
      finish();
    }
  };

  if (!active || !enabled) return null;
  const current = steps[stepIndex];
  if (!current) return null;

  return (
    <TourTooltip
      key={stepIndex}
      step={stepIndex + 1}
      totalSteps={steps.length}
      title={current.title}
      body={current.body}
      targetRef={current.targetRef}
      position={current.position}
      ensureVisible={current.ensureVisible}
      onNext={handleNext}
      onSkip={finish}
    />
  );
}
