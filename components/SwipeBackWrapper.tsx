import { ReactNode, useRef } from 'react';
import { Animated, Dimensions, PanResponder, StyleSheet } from 'react-native';

type Props = {
  onBack: () => void;
  children: ReactNode;
};

// iOS's edge-swipe-to-go-back convention: the gesture must START within this many points
// of the left edge, otherwise it's just a normal horizontal scroll/swipe inside the screen
// (e.g. a filter-pill row or month-nav) and shouldn't trigger navigation.
const EDGE_WIDTH = 24;
const DISMISS_THRESHOLD = 80;
const SCREEN_WIDTH = Dimensions.get('window').width;

// Same PanResponder-based drag pattern MealDetailSheet.tsx already uses for its
// drag-to-dismiss sheet — no new gesture library/dependency needed for this.
export default function SwipeBackWrapper({ onBack, children }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const startedNearEdge = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        startedNearEdge.current = evt.nativeEvent.pageX <= EDGE_WIDTH;
        return false;
      },
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        startedNearEdge.current && gesture.dx > 10 && Math.abs(gesture.dy) < 30,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx > 0) translateX.setValue(gesture.dx);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > DISMISS_THRESHOLD) {
          Animated.timing(translateX, {
            toValue: SCREEN_WIDTH,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            translateX.setValue(0);
            onBack();
          });
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
      },
    })
  ).current;

  return (
    <Animated.View style={[styles.flex, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
