import React from 'react';
import { useFonts } from 'expo-font';
import { View, ActivityIndicator } from 'react-native';
import AppContainer from './src/AppContainer';
import AppColors from './src/theme/AppColors';

export default function App() {
  const [fontsLoaded] = useFonts({
    MatchaStyle: require('./assets/fonts/MatchaStyle.ttf'),
    'Matcha Style': require('./assets/fonts/MatchaStyle.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: AppColors.backgroundTop,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  return <AppContainer />;
}
