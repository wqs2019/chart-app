import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import HomeScreen from '../screens/home/HomeScreen';
import UserDemoScreen from '../screens/user/UserDemoScreen';

export type RootStackParamList = {
  Home: undefined;
  UserDemo: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Template Home' }} />
      <Stack.Screen name="UserDemo" component={UserDemoScreen} options={{ title: 'User Demo' }} />
    </Stack.Navigator>
  );
};
