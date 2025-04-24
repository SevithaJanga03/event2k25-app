import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
  ToastAndroid,
} from 'react-native';
import { doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function EventDetailPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [registered, setRegistered] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setCurrentUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const ref = doc(db, 'events', id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setEvent({ id: snap.id, ...data });
        // Check registration
        const regRef = doc(db, 'registrations', id);
        const regSnap = await getDoc(regRef);
        const regData = regSnap.exists() ? regSnap.data() : {};
        setRegistered(!!regData[auth.currentUser?.uid]);
      } else {
        Alert.alert('Not found', 'That event does not exist');
        router.back();
      }
      setLoading(false);
    })();
  }, [id]);

  const handleRegister = async () => {
    if (!currentUser) {
      Alert.alert('Please log in to register');
      return;
    }
    setProcessing(true);
    try {
      const regRef = doc(db, 'registrations', id);
      if (registered) {
        await updateDoc(regRef, { [currentUser.uid]: deleteField() });
        setRegistered(false);
        ToastAndroid.show('Left event', ToastAndroid.SHORT);
      } else {
        await updateDoc(regRef, { [currentUser.uid]: true });
        setRegistered(true);
        ToastAndroid.show('Registered!', ToastAndroid.SHORT);
      }
    } catch (err) {
      console.error(err);
      ToastAndroid.show('Error updating registration', ToastAndroid.SHORT);
    } finally {
      setProcessing(false);
    }
  };

  if (loading || !event) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#0055ff" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {event.imageUrl ? (
        <Image source={{ uri: event.imageUrl }} style={styles.image} />
      ) : null}
      <Text style={styles.title}>{event.eventName}</Text>
      <Text style={styles.meta}>📍 {event.location}</Text>
      <Text style={styles.meta}>📅 {new Date(event.date.seconds * 1000).toDateString()}</Text>
      <Text style={styles.description}>{event.description}</Text>

      <TouchableOpacity
        style={[styles.button, processing && styles.disabledBtn]}
        onPress={handleRegister}
        disabled={processing}
      >
        <Text style={styles.buttonText}>
          {processing ? 'Processing...' : registered ? 'Leave Event' : 'Register'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, alignItems: 'center' },
  image: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  meta: { fontSize: 16, color: '#666', marginBottom: 4 },
  description: { fontSize: 16, marginVertical: 12, textAlign: 'center' },
  button: { backgroundColor: '#0055ff', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, marginTop: 16 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  disabledBtn: { backgroundColor: '#ccc' },
});
