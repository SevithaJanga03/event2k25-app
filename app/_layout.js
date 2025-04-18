import { Slot, usePathname } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, StyleSheet, Platform, StatusBar } from 'react-native';
import CustomHeader from './components/CustomHeader';
import CustomBottomTabs from './components/CustomBottomTabs';

export default function Layout() {
  const pathname = usePathname();
  const hideTabs = pathname === '/auth';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        
        {/* ✅ Top logo and login/logout */}
        <CustomHeader />
        
        {/* ✅ Slot for screens like Explore, Create, Auth */}
        <View style={styles.content}>
          <Slot />
        </View>
        
        {/* ✅ Bottom navigator unless on login */}
        {!hideTabs && <CustomBottomTabs />}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
});
