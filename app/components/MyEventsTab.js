import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, Image,
  TouchableOpacity, ActivityIndicator, Modal, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, Alert
} from 'react-native';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  collection, query, where, getDocs, orderBy, doc, deleteDoc, updateDoc
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

  const validateEditForm = () => {
    const errors = {};
    if (!editEvent.eventName.trim()) errors.eventName = 'Required';
    if (!editEvent.description.trim()) errors.description = 'Required';
    if (!editEvent.location.trim()) errors.location = 'Required';

    const typed = parseInt(editEvent.maxAttendees);
    const original = editEvent.originalMaxAttendees;

    if (isNaN(typed)) {
      errors.maxAttendees = 'Must be a number';
    } else if (typed < original) {
      errors.maxAttendees = `Cannot be less than current: ${original}`;
    } else if (typed > 50) {
      errors.maxAttendees = 'Cannot exceed 50';
    }

    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveEdit = async () => {
    if (!validateEditForm()) return;

    setEditLoading(true);
    try {
      await updateDoc(doc(db, 'events', editEvent.id), {
        eventName: editEvent.eventName,
        description: editEvent.description,
        location: editEvent.location,
        maxAttendees: parseInt(editEvent.maxAttendees),
      });

      const updatedEvents = events.map(e =>
        e.id === editEvent.id ? { ...editEvent } : e
      );
      setEvents(updatedEvents);
      setEditEvent(null);
    } catch (err) {
      Alert.alert('Error', 'Failed to update event.');
    } finally {
      setEditLoading(false);
    }
  };

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
            Alert.alert('Error', 'Failed to delete event.');
          } finally {
            setDeleteLoadingId(null);
          }
        }
      },
    ]);
  };

  const openEditModal = (item) => {
    setEditErrors({});
    setEditEvent({
      ...item,
      maxAttendees: item.maxAttendees?.toString() || '50',
      originalMaxAttendees: item.maxAttendees,
    });
  };

  const renderEvent = ({ item }) => {
    const dateObj = item.date?.seconds ? new Date(item.date.seconds * 1000) : new Date();

    return (
      <View style={styles.card}>
        <Image
          source={item.imageUrl === 'default' || !item.imageUrl
            ? require('../../assets/images/default-event.png')
            : { uri: item.imageUrl }}
          style={styles.image}
        />
        <Text style={styles.title}>{item.eventName}</Text>
        <Text style={styles.meta}>📍 {item.location}</Text>
        <Text style={styles.meta}>
          📅 {dateObj.toDateString()} ⏰ {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => openEditModal(item)}
            style={[styles.actionBtn, styles.editBtn]}>
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
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Edit Modal */}
      <Modal visible={!!editEvent} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalTitle}>Edit Event</Text>

              {['eventName', 'description', 'location'].map(field => (
                <View key={field} style={styles.fieldWrap}>
                  <Text style={styles.label}>{field.replace(/([A-Z])/g, ' $1')}</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editEvent?.[field]}
                    onChangeText={text => setEditEvent(prev => ({ ...prev, [field]: text }))}
                  />
                  {editErrors[field] && <Text style={styles.error}>{editErrors[field]}</Text>}
                </View>
              ))}

              <View style={styles.fieldWrap}>
                <Text style={styles.label}>Max Attendees</Text>
                <TextInput
                  editable={editEvent?.originalMaxAttendees < 50}
                  keyboardType="numeric"
                  value={editEvent?.maxAttendees}
                  onChangeText={text =>
                    setEditEvent(prev => ({ ...prev, maxAttendees: text }))
                  }
                  style={[styles.modalInput, editEvent?.originalMaxAttendees >= 50 && { backgroundColor: '#eee' }]}
                />
                {editErrors.maxAttendees && (
                  <Text style={styles.error}>{editErrors.maxAttendees}</Text>
                )}
              </View>

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
    width: '100%', height: 160, borderRadius: 10, marginBottom: 10, backgroundColor: '#e0e0e0'
  },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 4, color: '#333' },
  meta: { fontSize: 14, color: '#666', marginBottom: 2 },
  noEvents: { textAlign: 'center', marginTop: 60, fontSize: 16, color: '#999' },

  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  actionBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginHorizontal: 4
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
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  label: { fontWeight: '600', marginBottom: 4, color: '#333' },
  modalInput: {
    backgroundColor: '#f4f4f4',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  error: { color: 'red', fontSize: 13, marginTop: 4 },
  modalActions: {
    flexDirection: 'row', marginTop: 20, justifyContent: 'space-between'
  },
  saveBtn: {
    backgroundColor: '#0055ff', flex: 1, marginRight: 6,
    paddingVertical: 12, borderRadius: 8, alignItems: 'center'
  },
  cancelBtn: {
    backgroundColor: '#999', flex: 1, marginLeft: 6,
    paddingVertical: 12, borderRadius: 8, alignItems: 'center'
  },
  fieldWrap: { marginBottom: 14 },
});
