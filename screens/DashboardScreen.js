import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import PlayerScreen from './PlayerScreen';
import PlaylistManager from './PlaylistManager';
import SettingsScreen from './SettingsScreen';
import Ionicons from 'react-native-vector-icons/Ionicons'; // Import Icon

const Tab = createBottomTabNavigator();

export default function DashboardScreen() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1e1e1e',
          paddingBottom: 5,
          height: 60,
          borderTopWidth: 0,
        },
        tabBarActiveTintColor: '#00BFFF',
        tabBarInactiveTintColor: 'gray',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Start') {
            iconName = focused ? 'play-circle' : 'play-circle-outline';
          } else if (route.name === 'Manage') {
            iconName = focused ? 'list-circle' : 'list-circle-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={26} color={color} />;
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Start" component={PlayerScreen} />
      <Tab.Screen name="Manage" component={PlaylistManager} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
