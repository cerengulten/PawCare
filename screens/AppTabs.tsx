import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';
import { Session } from '@supabase/supabase-js';
import HomeScreen from './HomeScreen';
import PetsScreen from './PetsScreen';
import MoreScreen from './MoreScreen';
import { useTheme } from '../lib/ThemeContext';
import { useDogs } from '../lib/hooks/useDogs';
import { useSelectedPet } from '../lib/hooks/useSelectedPet';
import { useProfile } from '../lib/hooks/useProfile';

export type RootTabParamList = {
  Home: undefined;
  Pets: { dogId?: string } | undefined;
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
        >
          <Tab.Screen
            name="Home"
            options={{
              tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>🏠</Text>,
            }}
          >
            {(props) => (
              <HomeScreen
                {...props}
                dogs={dogs}
                profile={profile}
                updateProfile={updateProfile}
                checkUsernameAvailable={checkUsernameAvailable}
              />
            )}
          </Tab.Screen>

          <Tab.Screen
            name="Pets"
            options={{
              tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>🐾</Text>,
            }}
          >
            {(props) => (
              <PetsScreen
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
            name="More"
            options={{
              tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>✨</Text>,
            }}
          >
            {(props) => <MoreScreen {...props} dogs={dogs} profile={profile} />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
