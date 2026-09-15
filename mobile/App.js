import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LayoutDashboard, Train, MapPin, Zap } from 'lucide-react-native';

import Dashboard from './src/screens/Dashboard';
import Trains from './src/screens/Trains';
import Stations from './src/screens/Stations';
import Scrape from './src/screens/Scrape';
import { colors, font } from './src/theme';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerStyle: { backgroundColor: colors.slate900 },
            headerTintColor: colors.white,
            headerTitleStyle: { fontWeight: '700', fontSize: font.md },
            tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.slate100, paddingBottom: 4 },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.slate400,
            tabBarLabelStyle: { fontSize: font.xs, fontWeight: '600' },
            tabBarIcon: ({ color, size }) => {
              const icons = { Dashboard: LayoutDashboard, Trains: Train, Stations: MapPin, Scrape: Zap };
              const Icon = icons[route.name];
              return Icon ? <Icon size={size - 2} color={color} /> : null;
            },
          })}
        >
          <Tab.Screen name="Dashboard" component={Dashboard} options={{ title: 'TrainAdmin' }} />
          <Tab.Screen name="Trains" component={Trains} />
          <Tab.Screen name="Stations" component={Stations} />
          <Tab.Screen name="Scrape" component={Scrape} options={{ title: 'Route Scraper' }} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
