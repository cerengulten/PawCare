import { RefObject, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { hasSeenTour, markTourSeen, TourTab } from '../lib/hooks/useTourState';
import TourTooltip from './TourTooltip';

export type TourStep = {
  targetRef: RefObject<View | null>;
  position: 'top' | 'bottom' | 'left' | 'right';
  title: string;
  body: string;
};

type Props = {
  tab: TourTab;
  steps: TourStep[];
  /** Only start once the tab actually has the content the steps point at. */
  enabled: boolean;
};

const START_DELAY_MS = 500;

export default function TabTour({ tab, steps, enabled }: Props) {
  const isFocused = useIsFocused();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const runningRef = useRef(false);

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
  }, [enabled, isFocused, tab]);

  const finish = () => {
    markTourSeen(tab);
    setActive(false);
    setStepIndex(0);
    runningRef.current = false;
    // hasSeenTour() now returns true, so the effect won't restart it here;
    // after resetAllTours(), re-focusing this tab starts the tour over.
  };

  const handleNext = () => {
    setStepIndex((i) => {
      if (i + 1 < steps.length) return i + 1;
      finish();
      return i;
    });
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
      onNext={handleNext}
      onSkip={finish}
    />
  );
}
