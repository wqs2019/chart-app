import 'react-native-get-random-values';
import 'react-native-gesture-handler';

import { registerRootComponent } from 'expo';
import { featureFlags } from 'react-native-screens';

import App from './App';

featureFlags.experiment.controlledBottomTabs = true;

registerRootComponent(App);
