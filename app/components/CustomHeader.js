import { View, Text, TouchableOpacity, Image, StyleSheet, ToastAndroid } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../../firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';

export default function CustomHeader() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  const goToHome = () => {
    router.push('/');
  };

  const handleAuth = () => {
    if (user) {
      signOut(auth)
        .then(() => {
          ToastAndroid.show('You have been logged out.', ToastAndroid.SHORT);
          router.replace('/'); // ✅ Redirect to Explore (or home)
        })
        .catch((err) => {
          console.error('Logout error:', err);
          ToastAndroid.show('Logout failed.', ToastAndroid.SHORT);
        });
    } else {
      router.push('/auth');
    }
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={goToHome} style={styles.logoWrap}>
        <Image source={require('../../assets/images/logo.png')} style={styles.logo} />
        <Text style={styles.title}>Event2K25</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleAuth}>
        <Text style={styles.auth}>{user ? 'Logout' : 'Login'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 30,
    paddingBottom: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    elevation: 4,
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  auth: {
    color: '#0055ff',
    fontWeight: 'bold',
  },
});
