import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';
import { Session } from '@supabase/supabase-js';
import HomeScreen from './HomeScreen';
import PetsScreen from './PetsScreen';
import MoreScreen from './MoreScreen';
import { colors } from '../lib/theme';

export type RootTabParamList = {
  Home: undefined;
  Pets: { dogId?: string } | undefined;
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
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.primaryGreen,
            tabBarInactiveTintColor: colors.notStartedText,
            tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.cardBorder },
          }}
        >
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{
              tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>🏠</Text>,
            }}
          />

          <Tab.Screen
            name="Pets"
            options={{
              tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>🐾</Text>,
            }}
          >
            {(props) => <PetsScreen {...props} session={session} />}
          </Tab.Screen>

          <Tab.Screen
            name="More"
            component={MoreScreen}
            options={{
              tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>✨</Text>,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
