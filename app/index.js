import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Image,
  ActivityIndicator, TouchableOpacity, ScrollView, Alert, ToastAndroid
} from 'react-native';
import {
  collection, getDocs, doc, updateDoc, setDoc, getDoc, deleteField
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import EventDetailsModal from './components/EventDetailsModal';
import { useRouter } from 'expo-router';

export default function ExplorePage() {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [registeredEvents, setRegisteredEvents] = useState({});
  const [registering, setRegistering] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) await fetchEvents(user);
      else setLoading(false);
    });
    return unsubscribe;
  }, []);

  const fetchEvents = async (user) => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'events'));
      const today = new Date(); today.setHours(0, 0, 0, 0);

      const eventData = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const data = { id: docSnap.id, ...docSnap.data() };
        const eventDate = data.date?.seconds ? new Date(data.date.seconds * 1000) : null;
        if (!eventDate || eventDate < today) return null;

        const regSnap = await getDoc(doc(db, 'registrations', docSnap.id));
        const regMap = regSnap.exists() ? regSnap.data() : {};
        const count = Object.keys(regMap).length;
        const isRegistered = !!regMap[user.email];

        return { ...data, registeredCount: count, isRegistered };
      }));

      const validEvents = eventData.filter(Boolean);
      setEvents(validEvents);

      const regMap = {};
      validEvents.forEach(event => {
        regMap[event.id] = event.isRegistered;
      });
      setRegisteredEvents(regMap);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Login Required', 'Please login to register.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/auth') },
      ]);
      return;
    }
  
    if (user.uid === event.createdBy) {
      ToastAndroid.show('You cannot register for your own event.', ToastAndroid.SHORT);
      return;
    }
  
    // ✅ NEW: Prevent double registration even if UI is stale
    const regDoc = await getDoc(doc(db, 'registrations', event.id));
    const data = regDoc.exists() ? regDoc.data() : {};
    if (data[user.email]) {
      ToastAndroid.show('You are already registered for this event.', ToastAndroid.SHORT);
      return;
    }
  
    Alert.alert('Confirm Registration', `RSVP for "${event.eventName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Register',
        onPress: async () => {
          try {
            setRegistering(event.id);
            if (regDoc.exists()) {
              await updateDoc(doc(db, 'registrations', event.id), {
                [user.email]: true
              });
            } else {
              await setDoc(doc(db, 'registrations', event.id), {
                [user.email]: true
              });
            }
  
            setRegisteredEvents(prev => ({ ...prev, [event.id]: true }));
            setEvents(prev => prev.map(ev =>
              ev.id === event.id ? { ...ev, registeredCount: ev.registeredCount + 1 } : ev
            ));
            ToastAndroid.show('Registered!', ToastAndroid.SHORT);
          } catch (err) {
            ToastAndroid.show('Error registering!', ToastAndroid.SHORT);
          } finally {
            setRegistering(null);
          }
        }
      }
    ]);
  };
  

  const handleLeaveEvent = async (event) => {
    try {
      const user = auth.currentUser;
      await updateDoc(doc(db, 'registrations', event.id), {
        [user.email]: deleteField(),
      });

      setRegisteredEvents(prev => ({ ...prev, [event.id]: false }));
      setEvents(prev => prev.map(ev =>
        ev.id === event.id ? { ...ev, registeredCount: ev.registeredCount - 1 } : ev
      ));
      ToastAndroid.show('Left event.', ToastAndroid.SHORT);
    } catch (err) {
      console.error('Leave error:', err);
    }
  };

  const getCategories = () => {
    const unique = new Set(events.map(e => e.category).filter(Boolean));
    return ['All', ...Array.from(unique)];
  };

  const filteredEvents = events.filter(event => {
    const matchSearch = event.eventName?.toLowerCase().includes(search.toLowerCase())
      || event.location?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = selectedCategory === 'All' || event.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const handleCardPress = (event) => {
    setSelectedEvent(event);
    setModalVisible(true);
  };

  const renderEvent = ({ item }) => {
    const dateObj = new Date(item.date?.seconds * 1000);
    const isCreator = item.createdBy === currentUser?.uid;
    const isRegistered = registeredEvents[item.id];
    const isLoading = registering === item.id;
    const isFull = item.maxAttendees && item.registeredCount >= item.maxAttendees;

    return (
      <TouchableOpacity onPress={() => handleCardPress(item)} style={styles.card}>
        <Image
          source={item.imageUrl === 'default' || !item.imageUrl
            ? require('../assets/images/default-event.png')
            : { uri: item.imageUrl }}
          style={styles.image}
        />
        <Text style={styles.title}>{item.eventName}</Text>
        <Text style={styles.meta}>📍 {item.location}</Text>
        <Text style={styles.meta}>📅 {dateObj.toDateString()} ⏰ {dateObj.toLocaleTimeString()}</Text>
        <Text style={styles.meta}>👥 Registered: {item.registeredCount} / {item.maxAttendees}</Text>

        {/* {isCreator && <Text style={styles.badgeCreator}>🎤 Hosted by Me</Text>} */}
        {!isCreator && isRegistered && <Text style={styles.badgeAttendee}>✅ Registered</Text>}

        {!isCreator && (
          isFull && !isRegistered ? (
            <View style={styles.fullLabel}>
              <Text style={styles.fullLabelText}>Registration Full</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.registerButton, isRegistered && { backgroundColor: '#999' }]}
              onPress={() => isRegistered ? handleLeaveEvent(item) : handleRegister(item)}
              disabled={isLoading}
            >
              <Text style={styles.registerButtonText}>
                {isLoading ? 'Processing...' : isRegistered ? 'Leave Event' : 'Register'}
              </Text>
            </TouchableOpacity>
          )
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBox}
        placeholder="Search events..."
        placeholderTextColor="#666"
        value={search}
        onChangeText={setSearch}
      />
      <ScrollView horizontal style={styles.categoryContainer} showsHorizontalScrollIndicator={false}>
        {getCategories().map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryPill, selectedCategory === cat && styles.activeCategoryPill]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.categoryText, selectedCategory === cat && styles.activeCategoryText]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color="#0055ff" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredEvents}
          renderItem={renderEvent}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <EventDetailsModal
        visible={modalVisible}
        event={selectedEvent}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  searchBox: {
    backgroundColor: '#fff', padding: 12, borderRadius: 12, fontSize: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#ccc',
  },
  categoryContainer: { marginBottom: 14 },
  categoryPill: {
    backgroundColor: '#eee', paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 20, marginRight: 10,
  },
  activeCategoryPill: { backgroundColor: '#0055ff' },
  categoryText: { color: '#333', fontSize: 15 },
  activeCategoryText: { color: '#fff', fontWeight: 'bold' },
  card: {
    backgroundColor: '#fff', padding: 16, marginBottom: 14, borderRadius: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  image: { width: '100%', height: 160, borderRadius: 10, marginBottom: 10 },
  title: { fontSize: 18, fontWeight: '600', color: '#222', marginBottom: 4 },
  meta: { fontSize: 14, color: '#666', marginBottom: 2 },
  badgeCreator: {
    backgroundColor: '#6200ea', color: '#fff', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, fontSize: 12,
    marginTop: 6,
  },
  badgeAttendee: {
    backgroundColor: '#00b894', color: '#fff', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, fontSize: 12,
    marginTop: 6,
  },
  registerButton: {
    backgroundColor: '#0055ff', paddingVertical: 10, borderRadius: 8,
    marginTop: 10, alignItems: 'center',
  },
  registerButtonText: { color: '#fff', fontWeight: 'bold' },
  fullLabel: {
    backgroundColor: '#999', paddingVertical: 10, borderRadius: 8,
    marginTop: 10, alignItems: 'center',
  },
  fullLabelText: { color: '#fff', fontWeight: 'bold' },
});
