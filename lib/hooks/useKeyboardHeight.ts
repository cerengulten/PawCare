import { useEffect, useState } from 'react';
import { Keyboard, Platform, KeyboardEvent } from 'react-native';

export type KeyboardFrame = {
  keyboardHeight: number;
  keyboardScreenY: number;
};

/**
 * Shared hook to track active keyboard height and screenY across iOS and Android.
 * Handles the distinction between willShow/willHide (iOS) and didShow/didHide (Android).
 * Automatically resets to 0 when the keyboard is dismissed.
 */
export function useKeyboardFrame(): KeyboardFrame {
  const [frame, setFrame] = useState<KeyboardFrame>({ keyboardHeight: 0, keyboardScreenY: 0 });

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e: KeyboardEvent) => {
        setFrame({
          keyboardHeight: e.endCoordinates.height,
          keyboardScreenY: e.endCoordinates.screenY,
        });
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setFrame({ keyboardHeight: 0, keyboardScreenY: 0 });
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return frame;
}

export function useKeyboardHeight(): number {
  return useKeyboardFrame().keyboardHeight;
}
