import { useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, View } from 'react-native';
import { Session } from '@supabase/supabase-js';
import HomeScreen from './HomeScreen';
import PetsScreen from './PetsScreen';
import ChatScreen from './ChatScreen';
import MoreScreen from './MoreScreen';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { useDogs } from '../lib/hooks/useDogs';
import { useSelectedPet } from '../lib/hooks/useSelectedPet';
import { useProfile } from '../lib/hooks/useProfile';
import { useNotifications } from '../lib/hooks/useNotifications';

export type RootTabParamList = {
  Home: undefined;
  Pets: { dogId?: string } | undefined;
  Chat: { fromLink?: boolean } | undefined;
  More: { openVetFinder?: boolean } | undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

type DogsState = ReturnType<typeof useDogs>;
type SelectedPetState = ReturnType<typeof useSelectedPet>;
type ProfileState = ReturnType<typeof useProfile>;

type Props = {
  session: Session;
  profile: ProfileState['profile'];
  updateProfile: ProfileState['updateProfile'];
  checkUsernameAvailable: ProfileState['checkUsernameAvailable'];
  dogs: DogsState['dogs'];
  dogsLoading: DogsState['loading'];
  addDog: DogsState['addDog'];
  updateDog: DogsState['updateDog'];
  deleteDog: DogsState['deleteDog'];
  selectedDogId: SelectedPetState['selectedDogId'];
  selectDog: SelectedPetState['selectDog'];
};

export default function AppTabs({
  session,
  profile,
  updateProfile,
  checkUsernameAvailable,
  dogs,
  dogsLoading,
  addDog,
  updateDog,
  deleteDog,
  selectedDogId,
  selectDog,
}: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  // Shared single source of truth for notification state across the More tab icon badge and MoreScreen/NotificationsScreen
  const notificationsState = useNotifications(profile?.id ?? null);
  const { unreadCount } = notificationsState;
  const [petsResetKey, setPetsResetKey] = useState(0);
  const [moreResetKey, setMoreResetKey] = useState(0);

  // Tracks the previously-focused tab so ChatScreen's edge-swipe-back gesture can return to
  // wherever the user actually came from (e.g. Home's "Ask about..." bar), not a fixed tab.
  const currentTabRef = useRef<keyof RootTabParamList>('Home');
  const previousTabRef = useRef<keyof RootTabParamList>('Home');

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: theme.primary,
            tabBarInactiveTintColor: theme.notStartedText,
            tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.border },
          }}
          screenListeners={{
            state: (e) => {
              const state = (e.data as { state?: { routes: { name: string }[]; index: number } }).state;
              if (!state) return;
              const activeRoute = state.routes[state.index].name as keyof RootTabParamList;
              if (activeRoute !== currentTabRef.current) {
                previousTabRef.current = currentTabRef.current;
                currentTabRef.current = activeRoute;
              }
            },
          }}
        >
          <Tab.Screen
            name="Home"
            options={{
              tabBarLabel: t('tabs.home'),
              tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>🏠</Text>,
            }}
          >
            {(props) => (
              <HomeScreen
                {...props}
                dogs={dogs}
                selectedDogId={selectedDogId}
                profile={profile}
                updateProfile={updateProfile}
                checkUsernameAvailable={checkUsernameAvailable}
              />
            )}
          </Tab.Screen>

          <Tab.Screen
            name="Pets"
            options={{
              tabBarLabel: t('tabs.pets'),
              tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>🐾</Text>,
            }}
            listeners={({ navigation }) => ({
              tabPress: () => {
                if (navigation.isFocused()) setPetsResetKey(k => k + 1);
              },
            })}
          >
            {(props) => (
              <PetsScreen
                key={petsResetKey}
                {...props}
                session={session}
                dogs={dogs}
                dogsLoading={dogsLoading}
                addDog={addDog}
                updateDog={updateDog}
                deleteDog={deleteDog}
                selectedDogId={selectedDogId}
                selectDog={selectDog}
              />
            )}
          </Tab.Screen>

          <Tab.Screen
            name="Chat"
            options={{
              tabBarLabel: t('tabs.chat'),
              tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>💬</Text>,
            }}
          >
            {(props) => (
              <ChatScreen
                {...props}
                dogs={dogs}
                selectedDogId={selectedDogId}
                onSwipeBack={() => props.navigation.navigate(previousTabRef.current)}
              />
            )}
          </Tab.Screen>

          <Tab.Screen
            name="More"
            options={{
              tabBarLabel: t('tabs.more'),
              tabBarIcon: ({ color, size }) => (
                <View>
                  <Text style={{ fontSize: size, color }}>✨</Text>
                  {unreadCount > 0 ? (
                    <View
                      style={{
                        position: 'absolute',
                        top: -1,
                        right: -3,
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: theme.notifHealthBorder,
                      }}
                    />
                  ) : null}
                </View>
              ),
            }}
            listeners={({ navigation }) => ({
              tabPress: () => {
                if (navigation.isFocused()) setMoreResetKey(k => k + 1);
                notificationsState.refetch();
              },
            })}
          >
            {(props) => (
              <MoreScreen
                key={moreResetKey}
                {...props}
                dogs={dogs}
                profile={profile}
                notificationsState={notificationsState}
              />
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
