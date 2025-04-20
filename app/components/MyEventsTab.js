import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, Image,
  TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert
} from 'react-native';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  collection, query, where, getDocs, orderBy, doc, deleteDoc, updateDoc
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import MyEventModal from './MyEventModal'; // 👈 Ensure correct path

export default function MyEventsTab() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [editEvent, setEditEvent] = useState(null);
  const [viewEvent, setViewEvent] = useState(null); // 👈 NEW
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser || null);
      if (!firebaseUser) {
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, 'events'),
          where('createdBy', '==', firebaseUser.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const userEvents = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEvents(userEvents);
      } catch (err) {
        console.error('Error fetching user events:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (eventId) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            setDeleteLoadingId(eventId);
            await deleteDoc(doc(db, 'events', eventId));
            setEvents(events.filter(e => e.id !== eventId));
          } catch (err) {
            console.error('Error deleting event:', err);
            Alert.alert('Error', 'Failed to delete event');
          } finally {
            setDeleteLoadingId(null);
          }
        }
      },
    ]);
  };

  const handleSaveEdit = async () => {
    if (!editEvent?.eventName.trim()) {
      Alert.alert('Validation', 'Event name is required.');
      return;
    }

    setEditLoading(true);
    try {
      await updateDoc(doc(db, 'events', editEvent.id), {
        eventName: editEvent.eventName,
        description: editEvent.description,
        location: editEvent.location,
        maxAttendees: Math.max(editEvent.maxAttendees, 1),
      });

      setEvents(events.map(e => (e.id === editEvent.id ? editEvent : e)));
      setEditEvent(null);
    } catch (err) {
      console.error('Error updating event:', err);
      Alert.alert('Error', 'Failed to update event.');
    } finally {
      setEditLoading(false);
    }
  };

  const renderEvent = ({ item }) => {
    const dateObj = item.date?.seconds ? new Date(item.date.seconds * 1000) : new Date();

    return (
      <TouchableOpacity onPress={() => setViewEvent(item)} style={styles.card}>
        <Image
          source={
            item.imageUrl === 'default' || !item.imageUrl
              ? require('../../assets/images/default-event.png')
              : { uri: item.imageUrl }
          }
          style={styles.image}
        />
        <Text style={styles.title}>{item.eventName}</Text>
        <Text style={styles.meta}>📍 {item.location}</Text>
        <Text style={styles.meta}>
          📅 {dateObj.toDateString()} ⏰ {dateObj.toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit', hour12: true,
          })}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => setEditEvent(item)}
            style={[styles.actionBtn, styles.editBtn]}
          >
            <Text style={styles.btnText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            style={[styles.actionBtn, styles.deleteBtn]}
            disabled={deleteLoadingId === item.id}
          >
            {deleteLoadingId === item.id
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.btnText}>Delete</Text>}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 12 }}
        />
      )}

      {/* Edit Modal */}
      <Modal visible={!!editEvent} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Event</Text>

            <Text style={styles.label}>Event Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editEvent?.eventName}
              onChangeText={text => setEditEvent({ ...editEvent, eventName: text })}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.modalInput, { height: 80 }]}
              multiline
              value={editEvent?.description}
              onChangeText={text => setEditEvent({ ...editEvent, description: text })}
            />

            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.modalInput}
              value={editEvent?.location}
              onChangeText={text => setEditEvent({ ...editEvent, location: text })}
            />

            <Text style={styles.label}>Max Attendees</Text>
            <TextInput
              style={styles.modalInput}
              value={editEvent?.maxAttendees?.toString()}
              keyboardType="numeric"
              onChangeText={text => setEditEvent({ ...editEvent, maxAttendees: parseInt(text) })}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveEdit}
                disabled={editLoading}
              >
                {editLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditEvent(null)}
              >
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ✅ View Modal */}
      <MyEventModal
        visible={!!viewEvent}
        event={viewEvent}
        onClose={() => setViewEvent(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', paddingTop: 10 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 14,
    marginHorizontal: 12,
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
  title: { fontSize: 18, fontWeight: '600', marginBottom: 4, color: '#333' },
  meta: { fontSize: 14, color: '#666', marginBottom: 2 },
  noEvents: { textAlign: 'center', marginTop: 60, fontSize: 16, color: '#999' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  editBtn: { backgroundColor: '#888' },
  deleteBtn: { backgroundColor: '#0055ff' },
  btnText: { color: '#fff', fontWeight: '600' },
  modalOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 14, textAlign: 'center' },
  label: { fontWeight: '600', marginTop: 10, marginBottom: 4 },
  modalInput: {
    backgroundColor: '#f4f4f4',
    borderRadius: 8,
    padding: 10,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'space-between',
  },
  saveBtn: {
    backgroundColor: '#0055ff',
    paddingVertical: 12,
    flex: 1,
    marginRight: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#999',
    paddingVertical: 12,
    flex: 1,
    marginLeft: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
});
