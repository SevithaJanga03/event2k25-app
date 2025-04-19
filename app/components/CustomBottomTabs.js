import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const tabs = [
  { title: 'Explore', path: '/', icon: 'compass-outline' },
  { title: 'Host', path: '/create-event', icon: 'add-circle-outline' },
  { title: 'Profile', path: '/profile', icon: 'person-outline' },
];

export default function CustomBottomTabs() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.nav}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.path}
          style={styles.tab}
          onPress={() => router.push(tab.path)}
        >
          <Ionicons
            name={tab.icon}
            size={24}
            color={pathname === tab.path ? '#0055ff' : '#666'}
          />
          <Text style={[styles.text, pathname === tab.path && styles.active]}>
            {tab.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  tab: { alignItems: 'center' },
  text: { fontSize: 12, color: '#666', marginTop: 4 },
  active: { fontWeight: 'bold', color: '#0055ff' },
});
