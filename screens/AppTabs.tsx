import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';
import { Session } from '@supabase/supabase-js';
import HomeScreen from './HomeScreen';
import HabitsScreen from './HabitsScreen';
import ComingSoonScreen from './ComingSoonScreen';

export type RootTabParamList = {
  Pets: undefined;
  Habits: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

type Props = {
  session: Session;
};

export default function AppTabs({ session }: Props) {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#5C3D22',
            tabBarInactiveTintColor: '#B8926A',
            tabBarStyle: { backgroundColor: '#FFF8F0', borderTopColor: '#DEC9AF' },
          }}
        >
          <Tab.Screen
            name="Pets"
            options={{
              tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>🐾</Text>,
            }}
          >
            {() => <HomeScreen session={session} />}
          </Tab.Screen>

          <Tab.Screen
            name="Habits"
            component={HabitsScreen}
            options={{
              tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>✅</Text>,
            }}
          />

          <Tab.Screen
            name="More"
            component={ComingSoonScreen}
            options={{
              tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>✨</Text>,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
