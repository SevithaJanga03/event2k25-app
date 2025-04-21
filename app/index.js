import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Image,
  ActivityIndicator, TouchableOpacity, ScrollView, Alert, ToastAndroid,
} from 'react-native';
import {
  collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteField
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import EventDetailsModal from './components/EventDetailsModal';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons'; // For calendar icon


export default function ExplorePage() {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [registeredEvents, setRegisteredEvents] = useState({});
  const [processingId, setProcessingId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);


  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setCurrentUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const snapshot = await getDocs(collection(db, 'events'));
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const user = auth.currentUser;
        const fetched = await Promise.all(
          snapshot.docs.map(async docSnap => {
            const data = { id: docSnap.id, ...docSnap.data() };
            const eventDate = data.date?.seconds ? new Date(data.date.seconds * 1000) : null;
            if (!eventDate || eventDate < today) return null;

            let registeredCount = 0;
            let isRegistered = false;
            const regSnap = await getDoc(doc(db, 'registrations', docSnap.id));
            if (regSnap.exists()) {
              const regData = regSnap.data();
              registeredCount = Object.keys(regData).length;
              if (user?.uid) {
                isRegistered = !!regData[user.uid];
              }
            }

            return { ...data, registeredCount, isRegistered };
          })
        );

        const cleanEvents = fetched
          .filter(Boolean)
          .sort((a, b) => {
            const aTime = a.createdAt?.seconds || 0;
            const bTime = b.createdAt?.seconds || 0;
            return bTime - aTime;
          });

        const regMap = {};
        cleanEvents.forEach(ev => regMap[ev.id] = ev.isRegistered);
        setRegisteredEvents(regMap);
        setEvents(cleanEvents);
      } catch (err) {
        console.error('Error fetching events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleRegister = async (event) => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please log in to register.');
      return;
    }

    setProcessingId(event.id);

    try {
      const allRegsSnapshot = await getDocs(collection(db, 'registrations'));

      for (const docSnap of allRegsSnapshot.docs) {
        const regData = docSnap.data();
        if (regData[currentUser.uid]) {
          const eventRef = doc(db, 'events', docSnap.id);
          const conflictingEventSnap = await getDoc(eventRef);
          const conflictingEvent = conflictingEventSnap.data();

          const isSameTime =
            event.date?.seconds === conflictingEvent?.date?.seconds &&
            event.time === conflictingEvent?.time;

          if (isSameTime) {
            ToastAndroid.show(
              'You are already registered for another event at the same time!',
              ToastAndroid.LONG
            );
            setProcessingId(null);
            return;
          }
        }
      }

      const ref = doc(db, 'registrations', event.id);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        await updateDoc(ref, { [currentUser.uid]: true });
      } else {
        await setDoc(ref, { [currentUser.uid]: true });
      }

      setRegisteredEvents(prev => ({ ...prev, [event.id]: true }));
      setEvents(prev =>
        prev.map(e =>
          e.id === event.id ? { ...e, isRegistered: true, registeredCount: e.registeredCount + 1 } : e
        )
      );
      ToastAndroid.show('Registered!', ToastAndroid.SHORT);
    } catch (err) {
      console.error(err);
      ToastAndroid.show('Error registering!', ToastAndroid.SHORT);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDateChange = (event, date) => {
    setShowDatePicker(false); // ✅ Always hide it, even if user cancels
  
    if (event.type === "set" && date) {
      // User selected a date
      setSelectedDate(date);
    }
  };

  const handleLeave = (event) => {
    Alert.alert(
      'Leave Event',
      `Are you sure you want to leave "${event.eventName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => confirmLeave(event),
        },
      ]
    );
  };

  const confirmLeave = async (event) => {
    try {
      await updateDoc(doc(db, 'registrations', event.id), {
        [currentUser.uid]: deleteField(),
      });

      setRegisteredEvents(prev => ({ ...prev, [event.id]: false }));
      setEvents(prev =>
        prev.map(e =>
          e.id === event.id ? { ...e, isRegistered: false, registeredCount: e.registeredCount - 1 } : e
        )
      );
      ToastAndroid.show('Left event.', ToastAndroid.SHORT);
    } catch (err) {
      console.error(err);
      ToastAndroid.show('Error leaving event.', ToastAndroid.SHORT);
    }
  };

  const getCategories = () => {
    const unique = new Set(events.map(e => e.category).filter(Boolean));
    return ['All', ...Array.from(unique)];
  };

  const filteredEvents = events.filter(event => {
    const matchSearch =
      event.eventName?.toLowerCase().includes(search.toLowerCase()) ||
      event.location?.toLowerCase().includes(search.toLowerCase());
  
    const categoryMatch =
      selectedCategory === 'All' || event.category === selectedCategory;
  
    const dateMatch =
      !selectedDate ||
      new Date(event.date?.seconds * 1000).toDateString() === selectedDate.toDateString();
  
    return matchSearch && categoryMatch && dateMatch;
  });
  

  const renderEvent = ({ item }) => {
    const dateObj = item.date?.seconds
      ? new Date(item.date.seconds * 1000)
      : new Date();

    const isHost = currentUser?.uid === item.createdBy;
    const isFull = item.maxAttendees && item.registeredCount >= item.maxAttendees;
    const isRegistered = registeredEvents[item.id];

    const buttonLabel = isHost
      ? "You're Host"
      : isRegistered
        ? 'Leave Event'
        : 'Register';

    const disabled = isHost || (isFull && !isRegistered);

    const handlePress = () => {
      if (isRegistered) handleLeave(item);
      else handleRegister(item);
    };

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          setSelectedEvent(item);
          setModalVisible(true);
        }}
      >
        <Image
          source={
            item.imageUrl === 'default' || !item.imageUrl
              ? require('../assets/images/default-event.png')
              : { uri: item.imageUrl }
          }
          style={styles.image}
        />
        <Text style={styles.title}>{item.eventName}</Text>
        <Text style={styles.meta}>📍 {item.location || 'Unknown'}</Text>
        <Text style={styles.meta}>
          📅 {dateObj.toDateString()} | ⏰ {dateObj.toLocaleTimeString()}
        </Text>
        <Text style={styles.meta}>
          👥 {item.registeredCount} / {item.maxAttendees || '∞'}
        </Text>

        <TouchableOpacity
          style={[styles.button, (disabled || processingId === item.id) && styles.disabledBtn]}
          disabled={disabled || processingId === item.id}
          onPress={handlePress}
        >
          <Text style={styles.buttonText}>
            {processingId === item.id ? 'Processing...' : buttonLabel}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
  <TextInput
    style={styles.searchBox}
    placeholder="Search by name or location..."
    placeholderTextColor="#666"
    value={search + (selectedDate ? ` | ${selectedDate.toDateString()}` : '')}
    onChangeText={text => {
      if (selectedDate) setSelectedDate(null); // Reset date if user types
      setSearch(text);
    }}
  />

  {selectedDate && (
    <TouchableOpacity onPress={() => setSelectedDate(null)} style={styles.iconWrap}>
      <Text style={styles.clearIcon}>❌</Text>
    </TouchableOpacity>
  )}

  <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.iconWrap}>
    <Text style={styles.icon}>📅</Text>
  </TouchableOpacity>
</View>
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate || new Date()}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (event.type === 'set' && date) {
                setSelectedDate(date);
              }
            }}
          />
        )}


      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
        >
          {getCategories().map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryPill,
                selectedCategory === category && styles.activeCategoryPill,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category && styles.activeCategoryText,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
     
      {loading ? (
        <ActivityIndicator size="large" color="#0055ff" style={{ marginTop: 40 }} />
      ) : filteredEvents.length === 0 ? (
        <Text style={styles.noEvents}>No events found.</Text>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={item => item.id}
          renderItem={renderEvent}
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 12 }}
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
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
  },

  // 🔍 Search Bar + Calendar Row
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  searchBox: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  iconWrap: {
    marginLeft: 8,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  icon: {
    fontSize: 18,
    color: '#333',
  },
  clearIcon: {
    fontSize: 16,
    color: '#ff4444',
  },

  // 🏷️ Category Pills
  categoryContainer: {
    marginBottom: 12,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  categoryPill: {
    backgroundColor: '#eee',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  activeCategoryPill: {
    backgroundColor: '#0055ff',
  },
  categoryText: {
    color: '#333',
    fontSize: 14,
  },
  activeCategoryText: {
    color: '#fff',
    fontWeight: '600',
  },

  // 📅 Date Info Row (optional)
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#444',
  },
  clearText: {
    color: '#ff4444',
    fontSize: 13,
    fontWeight: '500',
  },

  // 📦 Event Cards
  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  meta: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  button: {
    backgroundColor: '#0055ff',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  disabledBtn: {
    backgroundColor: '#ccc',
  },

  // 📭 Empty state
  noEvents: {
    textAlign: 'center',
    marginTop: 60,
    fontSize: 16,
    color: '#999',
  },

  // 📅 Date Picker Overlay (custom modal)
  pickerOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  pickerModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 4,
    width: '85%',
  },
  pickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  pickerBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0055ff',
  },
});

