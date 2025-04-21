import { Slot, usePathname } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  View, StyleSheet, Platform, StatusBar,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomHeader from './components/CustomHeader';
import CustomBottomTabs from './components/CustomBottomTabs';

function AppLayoutContent() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const hideTabs = pathname === '/auth';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <CustomHeader />
      <View style={styles.content}>
        <Slot />
      </View>
      {!hideTabs && <CustomBottomTabs />}
    </View>
  );
}

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppLayoutContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
});
