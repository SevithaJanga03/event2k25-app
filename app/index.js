// import React, { useEffect, useState } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   FlatList,
//   TextInput,
//   Image,
//   ActivityIndicator,
//   TouchableOpacity,
//   ScrollView,
//   Alert,
//   ToastAndroid,
// } from 'react-native';
// import {
//   collection,
//   getDocs,
//   doc,
//   getDoc,
//   setDoc,
//   updateDoc,
//   deleteField,
// } from 'firebase/firestore';
// import { db, auth } from '../firebaseConfig';
// import EventDetailsModal from './components/EventDetailsModal';
// import AISuggestionFAB from './components/AISuggestionFAB';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import { Ionicons } from '@expo/vector-icons';
// import { useLocalSearchParams } from 'expo-router';

// export default function ExplorePage() {
//   // 🔍 Read query params: category, location, and eventId
//   const { category: qCat, location: qLoc, eventId } = useLocalSearchParams();

//   // ⚙️ State
//   const [events, setEvents] = useState([]);
//   const [search, setSearch] = useState('');
//   const [selectedCategory, setSelectedCategory] = useState(qCat || 'All');
//   const [selectedLocation, setSelectedLocation] = useState(qLoc || null);
//   const [selectedDate, setSelectedDate] = useState(null);
//   const [showDatePicker, setShowDatePicker] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const [modalVisible, setModalVisible] = useState(false);
//   const [selectedEvent, setSelectedEvent] = useState(null);
//   const [currentUser, setCurrentUser] = useState(null);
//   const [registeredEvents, setRegisteredEvents] = useState({});
//   const [processingId, setProcessingId] = useState(null);

//   // 🔄 Sync qCat / qLoc into state
//   useEffect(() => {
//     if (qCat) setSelectedCategory(qCat);
//   }, [qCat]);
//   useEffect(() => {
//     if (qLoc) setSelectedLocation(qLoc);
//   }, [qLoc]);

//   // 🔔 If eventId arrives, open that event in modal
//   useEffect(() => {
//     if (eventId && events.length) {
//       const e = events.find(ev => ev.id === eventId);
//       if (e) {
//         setSelectedEvent(e);
//         setModalVisible(true);
//       }
//     }
//   }, [eventId, events]);

//   // Auth listener
//   useEffect(() => {
//     const unsub = auth.onAuthStateChanged(setCurrentUser);
//     return unsub;
//   }, []);

//   // Fetch events from Firestore
//   useEffect(() => {
//     const fetchEvents = async () => {
//       setLoading(true);
//       try {
//         const snap = await getDocs(collection(db, 'events'));
//         const today = new Date();
//         today.setHours(0, 0, 0, 0);
//         const user = auth.currentUser;

//         const arr = await Promise.all(
//           snap.docs.map(async ds => {
//             const data = { id: ds.id, ...ds.data() };
//             const eventDate = data.date?.seconds
//               ? new Date(data.date.seconds * 1000)
//               : null;
//             if (!eventDate || eventDate < today) return null;

//             const regSnap = await getDoc(doc(db, 'registrations', ds.id));
//             const regData = regSnap.exists() ? regSnap.data() : {};
//             const registeredCount = Object.keys(regData).length;
//             const isRegistered = !!regData[user?.uid];

//             return { ...data, eventDate, registeredCount, isRegistered };
//           })
//         );
//         const clean = arr
//           .filter(Boolean)
//           .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

//         setRegisteredEvents(
//           clean.reduce((m, e) => ({ ...m, [e.id]: e.isRegistered }), {})
//         );
//         setEvents(clean);
//       } catch (err) {
//         console.error('Error fetching events:', err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchEvents();
//   }, []);

//   // Register / Leave handlers (unchanged)
//   const handleRegister = async event => {
//     if (!currentUser) {
//       Alert.alert('Login Required', 'Please log in to register.');
//       return;
//     }
//     setProcessingId(event.id);
//     try {
//       const allRegs = await getDocs(collection(db, 'registrations'));
//       for (const ds of allRegs.docs) {
//         const rd = ds.data();
//         if (rd[currentUser.uid]) {
//           const conflict = (await getDoc(doc(db, 'events', ds.id))).data();
//           const sameTime =
//             event.date.seconds === conflict.date.seconds &&
//             event.time === conflict.time;
//           if (sameTime) {
//             ToastAndroid.show(
//               'Already registered for another event at that time!',
//               ToastAndroid.LONG
//             );
//             setProcessingId(null);
//             return;
//           }
//         }
//       }
//       const ref = doc(db, 'registrations', event.id);
//       const snap = await getDoc(ref);
//       if (snap.exists()) await updateDoc(ref, { [currentUser.uid]: true });
//       else await setDoc(ref, { [currentUser.uid]: true });

//       setRegisteredEvents(p => ({ ...p, [event.id]: true }));
//       setEvents(evs =>
//         evs.map(e =>
//           e.id === event.id
//             ? { ...e, isRegistered: true, registeredCount: e.registeredCount + 1 }
//             : e
//         )
//       );
//       ToastAndroid.show('Registered!', ToastAndroid.SHORT);
//     } catch (err) {
//       console.error(err);
//       ToastAndroid.show('Error registering!', ToastAndroid.SHORT);
//     } finally {
//       setProcessingId(null);
//     }
//   };

//   const handleLeave = event => {
//     Alert.alert(
//       'Leave Event',
//       `Leave "${event.eventName}"?`,
//       [
//         { text: 'Cancel', style: 'cancel' },
//         { text: 'Leave', style: 'destructive', onPress: () => confirmLeave(event) },
//       ]
//     );
//   };
//   const confirmLeave = async event => {
//     try {
//       await updateDoc(doc(db, 'registrations', event.id), {
//         [currentUser.uid]: deleteField(),
//       });
//       setRegisteredEvents(p => ({ ...p, [event.id]: false }));
//       setEvents(evs =>
//         evs.map(e =>
//           e.id === event.id
//             ? { ...e, isRegistered: false, registeredCount: e.registeredCount - 1 }
//             : e
//         )
//       );
//       ToastAndroid.show('Left event.', ToastAndroid.SHORT);
//     } catch (err) {
//       console.error(err);
//       ToastAndroid.show('Error leaving.', ToastAndroid.SHORT);
//     }
//   };

//   // Category & Location filters
//   const getCategories = () => {
//     const setCats = new Set(events.map(e => e.category).filter(Boolean));
//     return ['All', ...setCats];
//   };

//   const filteredEvents = events.filter(event => {
//     const matchSearch =
//       event.eventName?.toLowerCase().includes(search.toLowerCase()) ||
//       event.location?.toLowerCase().includes(search.toLowerCase());

//     const categoryMatch =
//       selectedCategory === 'All' || event.category === selectedCategory;

//     const locationMatch =
//       !selectedLocation || event.location === selectedLocation;

//     const dateMatch =
//       !selectedDate ||
//       event.eventDate.toDateString() === selectedDate.toDateString();

//     return matchSearch && categoryMatch && locationMatch && dateMatch;
//   });

//   // Render each event
//   const renderEvent = ({ item }) => {
//     const isHost = currentUser?.uid === item.createdBy;
//     const isFull = item.maxAttendees && item.registeredCount >= item.maxAttendees;
//     const isReg = registeredEvents[item.id];
//     const label = isHost
//       ? "You're Host"
//       : isReg
//       ? 'Leave Event'
//       : 'Register';
//     const disabled = isHost || (isFull && !isReg);

//     return (
//       <TouchableOpacity
//         style={styles.card}
//         onPress={() => {
//           setSelectedEvent(item);
//           setModalVisible(true);
//         }}
//         disabled={processingId === item.id}
//       >
//         <Image
//           source={
//             item.imageUrl === 'default' || !item.imageUrl
//               ? require('../assets/images/default-event.png')
//               : { uri: item.imageUrl }
//           }
//           style={styles.image}
//         />
//         <Text style={styles.title}>{item.eventName}</Text>
//         <Text style={styles.meta}>📍 {item.location}</Text>
//         <Text style={styles.meta}>📅 {item.eventDate.toDateString()}</Text>
//         <Text style={styles.meta}>
//           👥 {item.registeredCount} / {item.maxAttendees || '∞'}
//         </Text>
//         <TouchableOpacity
//           style={[styles.button, (disabled || processingId === item.id) && styles.disabledBtn]}
//           onPress={() => (isReg ? handleLeave(item) : handleRegister(item))}
//           disabled={disabled}
//         >
//           <Text style={styles.buttonText}>
//             {processingId === item.id ? 'Processing...' : label}
//           </Text>
//         </TouchableOpacity>
//       </TouchableOpacity>
//     );
//   };

//   return (
//     <View style={styles.container}>
//       {/* Search + Date picker */}
//       <View style={styles.searchRow}>
//         <TextInput
//           style={styles.searchBox}
//           placeholder="Search by name or location..."
//           placeholderTextColor="#666"
//           value={search + (selectedDate ? ` | ${selectedDate.toDateString()}` : '')}
//           onChangeText={txt => {
//             if (selectedDate) setSelectedDate(null);
//             setSearch(txt);
//           }}
//         />
//         {selectedDate && (
//           <TouchableOpacity onPress={() => setSelectedDate(null)} style={styles.iconWrap}>
//             <Text style={styles.clearIcon}>❌</Text>
//           </TouchableOpacity>
//         )}
//         <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.iconWrap}>
//           <Ionicons name="calendar" size={20} color="#333" />
//         </TouchableOpacity>
//       </View>
//       {showDatePicker && (
//         <DateTimePicker
//           value={selectedDate || new Date()}
//           mode="date"
//           display="default"
//           minimumDate={new Date()}
//           onChange={(e, d) => {
//             setShowDatePicker(false);
//             if (e.type === 'set' && d) setSelectedDate(d);
//           }}
//         />
//       )}

//       {/* Category pills */}
//       <View style={styles.categoryContainer}>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={styles.pillRow}
//         >
//           {getCategories().map(cat => (
//             <TouchableOpacity
//               key={cat}
//               style={[
//                 styles.categoryPill,
//                 selectedCategory === cat && styles.activeCategoryPill,
//               ]}
//               onPress={() => setSelectedCategory(cat)}
//             >
//               <Text
//                 style={[
//                   styles.categoryText,
//                   selectedCategory === cat && styles.activeCategoryText,
//                 ]}
//               >
//                 {cat}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </ScrollView>
//       </View>

//       {/* Event list or loader */}
//       {loading ? (
//         <ActivityIndicator size="large" color="#0055ff" style={{ marginTop: 40 }} />
//       ) : filteredEvents.length === 0 ? (
//         <Text style={styles.noEvents}>No events found.</Text>
//       ) : (
//         <FlatList
//           data={filteredEvents}
//           keyExtractor={i => i.id}
//           renderItem={renderEvent}
//           contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 12 }}
//           showsVerticalScrollIndicator={false}
//         />
//       )}

//       {/* Details modal */}
//       <EventDetailsModal
//         visible={modalVisible}
//         event={selectedEvent}
//         onClose={() => setModalVisible(false)}
//       />

//       {/* AI FAB */}
//       <AISuggestionFAB />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#fff', padding: 16 },
//   searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
//   searchBox: {
//     flex: 1,
//     backgroundColor: '#fff',
//     paddingHorizontal: 14,
//     paddingVertical: 10,
//     borderRadius: 12,
//     fontSize: 15,
//     borderWidth: 1,
//     borderColor: '#ddd',
//   },
//   iconWrap: { marginLeft: 8, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 8 },
//   clearIcon: { fontSize: 16, color: '#ff4444' },
//   categoryContainer: { marginBottom: 12 },
//   pillRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 },
//   categoryPill: {
//     backgroundColor: '#eee',
//     paddingHorizontal: 14,
//     paddingVertical: 8,
//     borderRadius: 20,
//     marginRight: 10,
//   },
//   activeCategoryPill: { backgroundColor: '#0055ff' },
//   categoryText: { color: '#333', fontSize: 14 },
//   activeCategoryText: { color: '#fff', fontWeight: '600' },
//   card: {
//     backgroundColor: '#fff',
//     padding: 16,
//     marginBottom: 14,
//     borderRadius: 12,
//     shadowColor: '#000',
//     shadowOpacity: 0.06,
//     shadowRadius: 6,
//     shadowOffset: { width: 0, height: 2 },
//     elevation: 3,
//   },
//   image: { width: '100%', height: 160, borderRadius: 10, marginBottom: 10, backgroundColor: '#e0e0e0' },
//   title: { fontSize: 18, fontWeight: '600', marginBottom: 4, color: '#333' },
//   meta: { fontSize: 14, color: '#666', marginBottom: 2 },
//   button: { backgroundColor: '#0055ff', paddingVertical: 10, borderRadius: 8, marginTop: 10, alignItems: 'center' },
//   buttonText: { color: '#fff', fontWeight: 'bold' },
//   disabledBtn: { backgroundColor: '#ccc' },
//   noEvents: { textAlign: 'center', marginTop: 60, fontSize: 16, color: '#999' },
// });


// import React, { useEffect, useState } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   FlatList,
//   TextInput,
//   Image,
//   ActivityIndicator,
//   TouchableOpacity,
//   ScrollView,
//   Alert,
//   ToastAndroid,
// } from 'react-native';
// import {
//   collection,
//   getDocs,
//   doc,
//   getDoc,
//   setDoc,
//   updateDoc,
//   deleteField,
// } from 'firebase/firestore';
// import { db, auth } from '../firebaseConfig';
// import EventDetailsModal from './components/EventDetailsModal';
// import AISuggestionFAB from './components/AISuggestionFAB';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import { Ionicons } from '@expo/vector-icons';
// import { useLocalSearchParams, useRouter } from 'expo-router';

// export default function ExplorePage() {
//   // Read URL params
//   const { category: qCat, location: qLoc, eventId } = useLocalSearchParams();
//   const router = useRouter();

//   // State
//   const [events, setEvents] = useState([]);
//   const [search, setSearch] = useState('');
//   const [selectedCategory, setSelectedCategory] = useState(qCat || 'All');
//   const [selectedLocation, setSelectedLocation] = useState(qLoc || null);
//   const [selectedDate, setSelectedDate] = useState(null);
//   const [showDatePicker, setShowDatePicker] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const [modalVisible, setModalVisible] = useState(false);
//   const [selectedEvent, setSelectedEvent] = useState(null);
//   const [currentUser, setCurrentUser] = useState(null);
//   const [registeredEvents, setRegisteredEvents] = useState({});
//   const [processingId, setProcessingId] = useState(null);

//   // Sync URL to state
//   useEffect(() => { if (qCat) setSelectedCategory(qCat); }, [qCat]);
//   useEffect(() => { if (qLoc) setSelectedLocation(qLoc); }, [qLoc]);

//   // Open modal if eventId present
//   useEffect(() => {
//     if (eventId && events.length) {
//       const e = events.find(ev => ev.id === eventId);
//       if (e) {
//         setSelectedEvent(e);
//         setModalVisible(true);
//       }
//     }
//   }, [eventId, events]);

//   // Auth listener
//   useEffect(() => {
//     const unsub = auth.onAuthStateChanged(setCurrentUser);
//     return unsub;
//   }, []);

//   // Fetch events
//   useEffect(() => {
//     const fetchEvents = async () => {
//       setLoading(true);
//       try {
//         const snap = await getDocs(collection(db, 'events'));
//         const today = new Date();
//         today.setHours(0, 0, 0, 0);
//         const user = auth.currentUser;

//         const arr = await Promise.all(
//           snap.docs.map(async ds => {
//             const data = { id: ds.id, ...ds.data() };
//             const eventDate = data.date?.seconds
//               ? new Date(data.date.seconds * 1000)
//               : null;
//             if (!eventDate || eventDate < today) return null;

//             const regSnap = await getDoc(doc(db, 'registrations', ds.id));
//             const regData = regSnap.exists() ? regSnap.data() : {};
//             const registeredCount = Object.keys(regData).length;
//             const isRegistered = !!regData[user?.uid];

//             return { ...data, eventDate, registeredCount, isRegistered };
//           })
//         );

//         const clean = arr
//           .filter(Boolean)
//           .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

//         setRegisteredEvents(
//           clean.reduce((m, e) => ({ ...m, [e.id]: e.isRegistered }), {})
//         );
//         setEvents(clean);
//       } catch (err) {
//         console.error('Error fetching events:', err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchEvents();
//   }, []);

//   // Register / Leave handlers
//   const handleRegister = async event => {
//     if (!currentUser) {
//       Alert.alert('Login Required', 'Please log in to register.');
//       return;
//     }
//     setProcessingId(event.id);
//     try {
//       const allRegs = await getDocs(collection(db, 'registrations'));
//       for (const ds of allRegs.docs) {
//         const rd = ds.data();
//         if (rd[currentUser.uid]) {
//           const conflict = (await getDoc(doc(db, 'events', ds.id))).data();
//           const sameTime =
//             event.date.seconds === conflict.date.seconds &&
//             event.time === conflict.time;
//           if (sameTime) {
//             ToastAndroid.show(
//               'Already registered for another event at that time!',
//               ToastAndroid.LONG
//             );
//             setProcessingId(null);
//             return;
//           }
//         }
//       }
//       const ref = doc(db, 'registrations', event.id);
//       const snap = await getDoc(ref);
//       if (snap.exists()) await updateDoc(ref, { [currentUser.uid]: true });
//       else await setDoc(ref, { [currentUser.uid]: true });

//       setRegisteredEvents(p => ({ ...p, [event.id]: true }));
//       setEvents(evs =>
//         evs.map(e =>
//           e.id === event.id
//             ? { ...e, isRegistered: true, registeredCount: e.registeredCount + 1 }
//             : e
//         )
//       );
//       ToastAndroid.show('Registered!', ToastAndroid.SHORT);
//     } catch (err) {
//       console.error(err);
//       ToastAndroid.show('Error registering!', ToastAndroid.SHORT);
//     } finally {
//       setProcessingId(null);
//     }
//   };

//   const handleLeave = event => {
//     Alert.alert(
//       'Leave Event',
//       `Leave "${event.eventName}"?`,
//       [
//         { text: 'Cancel', style: 'cancel' },
//         { text: 'Leave', style: 'destructive', onPress: () => confirmLeave(event) },
//       ]
//     );
//   };
//   const confirmLeave = async event => {
//     try {
//       await updateDoc(doc(db, 'registrations', event.id), {
//         [currentUser.uid]: deleteField(),
//       });
//       setRegisteredEvents(p => ({ ...p, [event.id]: false }));
//       setEvents(evs =>
//         evs.map(e =>
//           e.id === event.id
//             ? { ...e, isRegistered: false, registeredCount: e.registeredCount - 1 }
//             : e
//         )
//       );
//       ToastAndroid.show('Left event.', ToastAndroid.SHORT);
//     } catch (err) {
//       console.error(err);
//       ToastAndroid.show('Error leaving.', ToastAndroid.SHORT);
//     }
//   };

//   // Filters
//   const getCategories = () => {
//     const setCats = new Set(events.map(e => e.category).filter(Boolean));
//     return ['All', ...setCats];
//   };

//   const filteredEvents = events.filter(event => {
//     const matchSearch =
//       event.eventName?.toLowerCase().includes(search.toLowerCase()) ||
//       event.location?.toLowerCase().includes(search.toLowerCase());

//     const categoryMatch =
//       selectedCategory === 'All' || event.category === selectedCategory;

//     const locationMatch =
//       !selectedLocation || event.location === selectedLocation;

//     const dateMatch =
//       !selectedDate || event.eventDate.toDateString() === selectedDate.toDateString();

//     return matchSearch && categoryMatch && locationMatch && dateMatch;
//   });

//   // Render each event
//   const renderEvent = ({ item }) => {
//     const isHost = currentUser?.uid === item.createdBy;
//     const isFull = item.maxAttendees && item.registeredCount >= item.maxAttendees;
//     const isReg = registeredEvents[item.id];
//     const label = isHost
//       ? "You're Host"
//       : isReg
//       ? 'Leave Event'
//       : 'Register';
//     const disabled = isHost || (isFull && !isReg);

//     return (
//       <TouchableOpacity
//         style={styles.card}
//         onPress={() => {
//           setSelectedEvent(item);
//           setModalVisible(true);
//         }}
//         disabled={processingId === item.id}
//       >
//         <Image
//           source={
//             item.imageUrl === 'default' || !item.imageUrl
//               ? require('../assets/images/default-event.png')
//               : { uri: item.imageUrl }
//           }
//           style={styles.image}
//         />
//         <Text style={styles.title}>{item.eventName}</Text>
//         <Text style={styles.meta}>📍 {item.location}</Text>
//         <Text style={styles.meta}>📅 {item.eventDate.toDateString()}</Text>
//         <Text style={styles.meta}>
//           👥 {item.registeredCount} / {item.maxAttendees || '∞'}
//         </Text>
//         <TouchableOpacity
//           style={[styles.button, (disabled || processingId === item.id) && styles.disabledBtn]}
//           onPress={() => (isReg ? handleLeave(item) : handleRegister(item))}
//           disabled={disabled}
//         >
//           <Text style={styles.buttonText}>
//             {processingId === item.id ? 'Processing...' : label}
//           </Text>
//         </TouchableOpacity>
//       </TouchableOpacity>
//     );
//   };

//   // Custom close: navigate to full event page
//   const handleModalClose = () => {
//     setModalVisible(false);
//     if (selectedEvent?.id) {
//       router.push(`/event/${selectedEvent.id}`);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       {/* Search + Date Picker */}
//       <View style={styles.searchRow}>
//         <TextInput
//           style={styles.searchBox}
//           placeholder="Search by name or location..."
//           placeholderTextColor="#666"
//           value={search + (selectedDate ? ` | ${selectedDate.toDateString()}` : '')}
//           onChangeText={txt => {
//             if (selectedDate) setSelectedDate(null);
//             setSearch(txt);
//           }}
//         />
//         {selectedDate && (
//           <TouchableOpacity onPress={() => setSelectedDate(null)} style={styles.iconWrap}>
//             <Text style={styles.clearIcon}>❌</Text>
//           </TouchableOpacity>
//         )}
//         <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.iconWrap}>
//           <Ionicons name="calendar" size={20} color="#333" />
//         </TouchableOpacity>
//       </View>
//       {showDatePicker && (
//         <DateTimePicker
//           value={selectedDate || new Date()}
//           mode="date"
//           display="default"
//           minimumDate={new Date()}
//           onChange={(e, d) => {
//             setShowDatePicker(false);
//             if (e.type === 'set' && d) setSelectedDate(d);
//           }}
//         />
//       )}

//       {/* Category Pills */}
//       <View style={styles.categoryContainer}>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={styles.pillRow}
//         >
//           {getCategories().map(cat => (
//             <TouchableOpacity
//               key={cat}
//               style={[styles.categoryPill, selectedCategory === cat && styles.activeCategoryPill]}
//               onPress={() => setSelectedCategory(cat)}
//             >
//               <Text style={[styles.categoryText, selectedCategory === cat && styles.activeCategoryText]}>
//                 {cat}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </ScrollView>
//       </View>

//       {/* Events List or Loader */}
//       {loading ? (
//         <ActivityIndicator size="large" color="#0055ff" style={{ marginTop: 40 }} />
//       ) : filteredEvents.length === 0 ? (
//         <Text style={styles.noEvents}>No events found.</Text>
//       ) : (
//         <FlatList
//           data={filteredEvents}
//           keyExtractor={i => i.id}
//           renderItem={renderEvent}
//           contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 12 }}
//           showsVerticalScrollIndicator={false}
//         />
//       )}

//       {/* Details Modal */}
//       <EventDetailsModal
//         visible={modalVisible}
//         event={selectedEvent}
//         onClose={handleModalClose}
//       />

//       {/* AI FAB */}
//       <AISuggestionFAB />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#fff', padding: 16 },
//   searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
//   searchBox: {
//     flex: 1,
//     backgroundColor: '#fff',
//     paddingHorizontal: 14,
//     paddingVertical: 10,
//     borderRadius: 12,
//     fontSize: 15,
//     borderWidth: 1,
//     borderColor: '#ddd',
//   },
//   iconWrap: { marginLeft: 8, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 8 },
//   clearIcon: { fontSize: 16, color: '#ff4444' },
//   categoryContainer: { marginBottom: 12 },
//   pillRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 },
//   categoryPill: { backgroundColor: '#eee', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 10 },
//   activeCategoryPill: { backgroundColor: '#0055ff' },
//   categoryText: { color: '#333', fontSize: 14 },
//   activeCategoryText: { color: '#fff', fontWeight: '600' },
//   card: { backgroundColor: '#fff', padding: 16, marginBottom: 14, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
//   image: { width: '100%', height: 160, borderRadius: 10, marginBottom: 10, backgroundColor: '#e0e0e0' },
//   title: { fontSize: 18, fontWeight: '600', marginBottom: 4, color: '#333' },
//   meta: { fontSize: 14, color: '#666', marginBottom: 2 },
//   button: { backgroundColor: '#0055ff', paddingVertical: 10, borderRadius: 8, marginTop: 10, alignItems: 'center' },
//   buttonText: { color: '#fff', fontWeight: 'bold' },
//   disabledBtn: { backgroundColor: '#ccc' },
//   noEvents: { textAlign: 'center', marginTop: 60, fontSize: 16, color: '#999' },
// });


import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
  ToastAndroid,
} from 'react-native';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import EventDetailsModal from './components/EventDetailsModal';
import AISuggestionFAB from './components/AISuggestionFAB';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function ExplorePage() {
  // Read URL params
  const { category: qCat, location: qLoc, eventId } = useLocalSearchParams();
  const router = useRouter();

  // State
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(qCat || 'All');
  const [selectedLocation, setSelectedLocation] = useState(qLoc || null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [registeredEvents, setRegisteredEvents] = useState({});
  const [processingId, setProcessingId] = useState(null);

  // Sync URL to state
  useEffect(() => { if (qCat) setSelectedCategory(qCat); }, [qCat]);
  useEffect(() => { if (qLoc) setSelectedLocation(qLoc); }, [qLoc]);

  // Open modal if eventId present
  useEffect(() => {
    if (eventId && events.length) {
      const e = events.find(ev => ev.id === eventId);
      if (e) {
        setSelectedEvent(e);
        setModalVisible(true);
      }
    }
  }, [eventId, events]);

  // Auth listener
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setCurrentUser);
    return unsub;
  }, []);

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'events'));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const user = auth.currentUser;

        const arr = await Promise.all(
          snap.docs.map(async ds => {
            const data = { id: ds.id, ...ds.data() };
            const eventDate = data.date?.seconds
              ? new Date(data.date.seconds * 1000)
              : null;
            if (!eventDate || eventDate < today) return null;

            const regSnap = await getDoc(doc(db, 'registrations', ds.id));
            const regData = regSnap.exists() ? regSnap.data() : {};
            const registeredCount = Object.keys(regData).length;
            const isRegistered = !!regData[user?.uid];

            return { ...data, eventDate, registeredCount, isRegistered };
          })
        );

        const clean = arr
          .filter(Boolean)
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        setRegisteredEvents(
          clean.reduce((m, e) => ({ ...m, [e.id]: e.isRegistered }), {})
        );
        setEvents(clean);
      } catch (err) {
        console.error('Error fetching events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Register / Leave handlers
  const handleRegister = async event => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please log in to register.');
      return;
    }
    setProcessingId(event.id);
    try {
      const allRegs = await getDocs(collection(db, 'registrations'));
      for (const ds of allRegs.docs) {
        const rd = ds.data();
        if (rd[currentUser.uid]) {
          const conflict = (await getDoc(doc(db, 'events', ds.id))).data();
          const sameTime =
            event.date.seconds === conflict.date.seconds &&
            event.time === conflict.time;
          if (sameTime) {
            ToastAndroid.show(
              'Already registered for another event at that time!',
              ToastAndroid.LONG
            );
            setProcessingId(null);
            return;
          }
        }
      }
      const ref = doc(db, 'registrations', event.id);
      const snap = await getDoc(ref);
      if (snap.exists()) await updateDoc(ref, { [currentUser.uid]: true });
      else await setDoc(ref, { [currentUser.uid]: true });

      setRegisteredEvents(p => ({ ...p, [event.id]: true }));
      setEvents(evs =>
        evs.map(e =>
          e.id === event.id
            ? { ...e, isRegistered: true, registeredCount: e.registeredCount + 1 }
            : e
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

  const handleLeave = event => {
    Alert.alert(
      'Leave Event',
      `Leave "${event.eventName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => confirmLeave(event) },
      ]
    );
  };
  const confirmLeave = async event => {
    try {
      await updateDoc(doc(db, 'registrations', event.id), {
        [currentUser.uid]: deleteField(),
      });
      setRegisteredEvents(p => ({ ...p, [event.id]: false }));
      setEvents(evs =>
        evs.map(e =>
          e.id === event.id
            ? { ...e, isRegistered: false, registeredCount: e.registeredCount - 1 }
            : e
        )
      );
      ToastAndroid.show('Left event.', ToastAndroid.SHORT);
    } catch (err) {
      console.error(err);
      ToastAndroid.show('Error leaving.', ToastAndroid.SHORT);
    }
  };

  // Filters
  const getCategories = () => {
    const setCats = new Set(events.map(e => e.category).filter(Boolean));
    return ['All', ...setCats];
  };

  const filteredEvents = events.filter(event => {
    const matchSearch =
      event.eventName?.toLowerCase().includes(search.toLowerCase()) ||
      event.location?.toLowerCase().includes(search.toLowerCase());

    const categoryMatch =
      selectedCategory === 'All' || event.category === selectedCategory;

    const locationMatch =
      !selectedLocation || event.location === selectedLocation;

    const dateMatch =
      !selectedDate || event.eventDate.toDateString() === selectedDate.toDateString();

    return matchSearch && categoryMatch && locationMatch && dateMatch;
  });

  // Render each event
  const renderEvent = ({ item }) => {
    const isHost = currentUser?.uid === item.createdBy;
    const isFull = item.maxAttendees && item.registeredCount >= item.maxAttendees;
    const isReg = registeredEvents[item.id];
    const label = isHost
      ? "You're Host"
      : isReg
      ? 'Leave Event'
      : 'Register';
    const disabled = isHost || (isFull && !isReg);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          setSelectedEvent(item);
          setModalVisible(true);
        }}
        disabled={processingId === item.id}
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
        <Text style={styles.meta}>📍 {item.location}</Text>
        <Text style={styles.meta}>📅 {item.eventDate.toDateString()}</Text>
        <Text style={styles.meta}>
          👥 {item.registeredCount} / {item.maxAttendees || '∞'}
        </Text>
        <TouchableOpacity
          style={[styles.button, (disabled || processingId === item.id) && styles.disabledBtn]}
          onPress={() => (isReg ? handleLeave(item) : handleRegister(item))}
          disabled={disabled}
        >
          <Text style={styles.buttonText}>
            {processingId === item.id ? 'Processing...' : label}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Conditional modal close
  const handleModalClose = () => {
    setModalVisible(false);
    if (eventId) {
      // if arrived via AI chat, navigate to full page
      router.push(`/event/${selectedEvent.id}`);
    }
    // otherwise do nothing (stay on explore page)
  };

  return (
    <View style={styles.container}>
      {/* Search + Date Picker */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchBox}
          placeholder="Search by name or location..."
          placeholderTextColor="#666"
          value={search + (selectedDate ? ` | ${selectedDate.toDateString()}` : '')}
          onChangeText={txt => {
            if (selectedDate) setSelectedDate(null);
            setSearch(txt);
          }}
        />
        {selectedDate && (
          <TouchableOpacity onPress={() => setSelectedDate(null)} style={styles.iconWrap}>
            <Text style={styles.clearIcon}>❌</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.iconWrap}>
          <Ionicons name="calendar" size={20} color="#333" />
        </TouchableOpacity>
      </View>
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(e, d) => {
            setShowDatePicker(false);
            if (e.type === 'set' && d) setSelectedDate(d);
          }}
        />
      )}

      {/* Category Pills */}
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
        >
          {getCategories().map(cat => (
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
      </View>

      {/* Events List or Loader */}
      {loading ? (
        <ActivityIndicator size="large" color="#0055ff" style={{ marginTop: 40 }} />
      ) : filteredEvents.length === 0 ? (
        <Text style={styles.noEvents}>No events found.</Text>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={i => i.id}
          renderItem={renderEvent}
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 12 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Details Modal */}
      <EventDetailsModal
        visible={modalVisible}
        event={selectedEvent}
        onClose={handleModalClose}
      />

      {/* AI FAB */}
      <AISuggestionFAB />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  searchBox: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: '#ddd' },
  iconWrap: { marginLeft: 8, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 8 },
  clearIcon: { fontSize: 16, color: '#ff4444' },
  categoryContainer: { marginBottom: 12 },
  pillRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 },
  categoryPill: { backgroundColor: '#eee', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 10 },
  activeCategoryPill: { backgroundColor: '#0055ff' },
  categoryText: { color: '#333', fontSize: 14 },
  activeCategoryText: { color: '#fff', fontWeight: '600' },
  card: { backgroundColor: '#fff', padding: 16, marginBottom: 14, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  image: { width: '100%', height: 160, borderRadius: 10, marginBottom: 10, backgroundColor: '#e0e0e0' },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 4, color: '#333' },
  meta: { fontSize: 14, color: '#666', marginBottom: 2 },
  button: { backgroundColor: '#0055ff', paddingVertical: 10, borderRadius: 8, marginTop: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  disabledBtn: { backgroundColor: '#ccc' },
  noEvents: { textAlign: 'center', marginTop: 60, fontSize: 16, color: '#999' },
  categoryContainer: { marginBottom: 12 },
  pillRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 },
});
