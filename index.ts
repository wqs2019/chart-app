import 'react-native-gesture-handler';
import 'react-native-reanimated';
import 'react-native-get-random-values';

import { registerRootComponent } from 'expo';
import { featureFlags } from 'react-native-screens';

import App from './App';

featureFlags.experiment.controlledBottomTabs = true;

registerRootComponent(App);
