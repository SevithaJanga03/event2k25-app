import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, Image, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, KeyboardAvoidingView,
  Platform, ScrollView, Alert, ToastAndroid,
} from 'react-native';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  collection, query, where, getDocs, orderBy, doc,
  deleteDoc, updateDoc, getDoc
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export default function MyEventsTab() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [editEvent, setEditEvent] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState([]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser || null);
      if (firebaseUser) await fetchEvents(firebaseUser.uid);
      else setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchEvents = async (uid) => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'events'),
        where('createdBy', '==', uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const eventsWithCounts = await Promise.all(snapshot.docs.map(async docSnap => {
        const data = docSnap.data();
        const eventDate = data.date?.seconds ? new Date(data.date.seconds * 1000) : null;
        const isExpired = eventDate && eventDate < new Date();

        const regSnap = await getDoc(doc(db, 'registrations', docSnap.id));
        const regCount = regSnap.exists() ? Object.keys(regSnap.data()).length : 0;

        return {
          id: docSnap.id,
          ...data,
          registeredCount: regCount,
          isExpired
        };
      }));
      setEvents(eventsWithCounts);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegisteredUsers = async (eventId) => {
    try {
      const regSnap = await getDoc(doc(db, 'registrations', eventId));
      if (!regSnap.exists()) return [];

      const userIds = Object.keys(regSnap.data());
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersMap = {};
      usersSnap.forEach(doc => usersMap[doc.id] = doc.data());

      return userIds.map(uid => ({
        id: uid,
        fullName: usersMap[uid]?.fullName || 'Unknown',
        email: usersMap[uid]?.email || 'Unknown',
      }));
    } catch (err) {
      console.error('Error fetching registered users:', err);
      return [];
    }
  };

  const handleDelete = async (eventId) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleteLoadingId(eventId);
            await deleteDoc(doc(db, 'events', eventId));
            ToastAndroid.show('Event deleted successfully!', ToastAndroid.SHORT);
            if (user?.uid) await fetchEvents(user.uid);
          } catch (err) {
            Alert.alert('Error', 'Failed to delete event.');
          } finally {
            setDeleteLoadingId(null);
          }
        }
      }
    ]);
  };

  const handleViewRegistrants = async (eventId) => {
    const users = await fetchRegisteredUsers(eventId);
    setRegisteredUsers(users);
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    if (item.isExpired) {
      ToastAndroid.show('⛔ Cannot edit an expired event.', ToastAndroid.SHORT);
      return;
    }
    setEditErrors({});
    setEditEvent({
      ...item,
      maxAttendees: item.maxAttendees?.toString() || '50',
      originalMaxAttendees: item.maxAttendees,
    });
  };

  const handleSaveEdit = async () => {
    const errors = {};
    if (!editEvent.eventName.trim()) errors.eventName = 'Required';
    if (!editEvent.description.trim()) errors.description = 'Required';
    if (!editEvent.location.trim()) errors.location = 'Required';
    const typed = parseInt(editEvent.maxAttendees);
    if (isNaN(typed)) errors.maxAttendees = 'Must be a number';
    else if (typed < editEvent.originalMaxAttendees) errors.maxAttendees = `Cannot be less than current: ${editEvent.originalMaxAttendees}`;
    else if (typed > 50) errors.maxAttendees = 'Cannot exceed 50';

    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setEditLoading(true);
    try {
      await updateDoc(doc(db, 'events', editEvent.id), {
        eventName: editEvent.eventName,
        description: editEvent.description,
        location: editEvent.location,
        maxAttendees: typed,
      });
      setEditEvent(null);
      ToastAndroid.show('Event updated!', ToastAndroid.SHORT);
      if (user?.uid) await fetchEvents(user.uid);
    } catch (err) {
      Alert.alert('Error', 'Failed to update event.');
    } finally {
      setEditLoading(false);
    }
  };

  const renderEvent = ({ item }) => {
    const dateObj = item.date?.seconds ? new Date(item.date.seconds * 1000) : new Date();
    const cardStyle = item.isExpired
      ? [styles.card, { backgroundColor: '#f0f0f0' }]
      : styles.card;

    return (
      <View style={cardStyle}>
        <Image
          source={item.imageUrl === 'default' || !item.imageUrl
            ? require('../../assets/images/default-event.png')
            : { uri: item.imageUrl }}
          style={styles.image}
        />
        {item.isExpired && (
      <View style={styles.expiredBadge}>
        <Text style={styles.expiredText}>Expired</Text>
      </View>
    )}
        <Text style={styles.title}>{item.eventName}</Text>
        <Text style={styles.meta}>📍 {item.location}</Text>
        <Text style={styles.meta}>📅 {dateObj.toDateString()} ⏰ {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
        <Text style={styles.meta}>👥 {item.registeredCount} / {item.maxAttendees || '∞'}</Text>

        <TouchableOpacity
          onPress={() => handleViewRegistrants(item.id)}
          style={[
            styles.registeredUsersBtn,
            item.isExpired && styles.expiredRegisteredBtn
          ]}
          >
          <Text style={[
            styles.registeredUsersBtnText,
            item.isExpired && styles.disabledRegisteredBtnText
          ]}>
            View Registered Users ({item.registeredCount})
          </Text>
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => openEditModal(item)}
            style={[styles.actionBtn, styles.editBtn]}
            disabled={item.isExpired}
          >
            <Text style={styles.btnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            style={[styles.actionBtn, styles.deleteBtn]}
            disabled={deleteLoadingId === item.id}
          >
            {deleteLoadingId === item.id
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.btnText}>Delete</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#0055ff" />
      ) : !user ? (
        <Text style={styles.noEvents}>🔒 Please log in to view your events</Text>
      ) : events.length === 0 ? (
        <Text style={styles.noEvents}>You haven't created any events yet.</Text>
      ) : (
        <FlatList
          data={events}
          renderItem={renderEvent}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 12 }}
        />
      )}

      {/* Registered Users Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Registered Users</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {registeredUsers.length > 0 ? registeredUsers.map(user => (
                <Text key={user.id} style={styles.userItem}>
                  • {user.fullName} ({user.email})
                </Text>
              )) : <Text style={{ color: '#666' }}>No users found.</Text>}
            </ScrollView>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
              <Text style={styles.btnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Event Modal */}
      <Modal visible={!!editEvent} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={styles.modalTitle}>Edit Event</Text>

              {['eventName', 'description', 'location'].map(field => (
                <View key={field} style={{ marginBottom: 10 }}>
                  <Text style={styles.label}>{field.replace(/([A-Z])/g, ' $1')}</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editEvent?.[field]}
                    onChangeText={text => setEditEvent(prev => ({ ...prev, [field]: text }))}
                  />
                  {editErrors[field] && <Text style={styles.error}>{editErrors[field]}</Text>}
                </View>
              ))}

              <View style={{ marginBottom: 14 }}>
                <Text style={styles.label}>Max Attendees</Text>
                <TextInput
                  editable={editEvent?.originalMaxAttendees < 50}
                  keyboardType="numeric"
                  value={editEvent?.maxAttendees}
                  onChangeText={text =>
                    setEditEvent(prev => ({ ...prev, maxAttendees: text }))
                  }
                  style={[
                    styles.modalInput,
                    editEvent?.originalMaxAttendees >= 50 && { backgroundColor: '#eee' },
                  ]}
                />
                {editErrors.maxAttendees && (
                  <Text style={styles.error}>{editErrors.maxAttendees}</Text>
                )}
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.editBtn]}
                  onPress={handleSaveEdit}
                  disabled={editLoading}
                >
                  {editLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => setEditEvent(null)}>
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 10 },
  card: {
    backgroundColor: '#fff', padding: 16, marginBottom: 14, marginHorizontal: 12,
    borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  topRow: { position: 'relative' },
expiredBadge: {
  position: 'absolute',
  top: 8,
  right: 8,
  backgroundColor: '#d9534f',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 6,
},
expiredText: {
  color: '#fff',
  fontSize: 11,
  fontWeight: 'bold',
},
  image: { width: '100%', height: 160, borderRadius: 10, marginBottom: 10, backgroundColor: '#e0e0e0' },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 4, color: '#333' },
  meta: { fontSize: 14, color: '#666', marginBottom: 2 },
  viewUsers: { marginTop: 10, color: '#0055ff', fontWeight: '600' },
  noEvents: { textAlign: 'center', marginTop: 60, fontSize: 16, color: '#999' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  editBtn: { backgroundColor: '#888' },
  deleteBtn: { backgroundColor: '#0055ff' },
  btnText: { color: '#fff', fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalBox: { width: '85%', backgroundColor: '#fff', padding: 20, borderRadius: 16, maxHeight: '75%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  userItem: { fontSize: 15, marginBottom: 6, color: '#333' },
  closeBtn: { marginTop: 16, backgroundColor: '#0055ff', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  modalInput: { backgroundColor: '#f4f4f4', borderRadius: 8, padding: 10, fontSize: 14 },
  label: { fontWeight: '600', marginBottom: 4, color: '#333' },
  error: { color: 'red', fontSize: 13, marginTop: 4 },
  
  disabledRegisteredBtnText: {
    color: '#888',
  },
  registeredUsersBtn: {
    marginTop: 12,
    backgroundColor: '#f6f6f6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  
  expiredRegisteredBtn: {
    backgroundColor: '#e0e0e0',  // match expired card
    borderColor: '#c0c0c0',
  },
  
  registeredUsersBtnText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  
  
});
