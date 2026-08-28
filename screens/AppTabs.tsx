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

export type RootTabParamList = {
  Home: undefined;
  Pets: { dogId?: string } | undefined;
  More: { openVetFinder?: boolean } | undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

type DogsState = ReturnType<typeof useDogs>;
type SelectedPetState = ReturnType<typeof useSelectedPet>;

type Props = {
  session: Session;
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
