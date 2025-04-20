import React, { useEffect, useState } from 'react';
import {
  View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator
} from 'react-native';
import { doc, onSnapshot, getDocs, collection } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export default function MyEventModal({ visible, event, onClose }) {
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAttendees, setShowAttendees] = useState(false);

  useEffect(() => {
    if (!event?.id || !visible) return;

    const unsubscribe = onSnapshot(doc(db, 'registrations', event.id), async (regSnap) => {
      setLoading(true);
      const data = regSnap.exists() ? regSnap.data() : {};
      const usersSnap = await getDocs(collection(db, 'users'));

      const nameMap = {};
      usersSnap.forEach(doc => {
        nameMap[doc.id] = doc.data().fullName;
      });

      const names = Object.keys(data).map(email => nameMap[email] || email);
      setAttendees(names);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [event?.id, visible]);

  if (!event) return null;

  const dateObj = new Date(event.date?.seconds * 1000);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <ScrollView>
            <Text style={styles.title}>{event.eventName}</Text>
            <Text style={styles.meta}>📅 {dateObj.toDateString()}</Text>
            <Text style={styles.meta}>⏰ {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            <Text style={styles.meta}>📍 {event.location}</Text>
            <Text style={styles.meta}>📝 {event.description}</Text>
            <TouchableOpacity onPress={() => setShowAttendees(p => !p)} style={styles.toggleBtn}>
              <Text style={styles.toggleText}>
                {showAttendees ? 'Hide Attendees 🔽' : 'Show Attendees 🔼'}
              </Text>
            </TouchableOpacity>

            {showAttendees && (
              loading ? (
                <ActivityIndicator style={{ marginTop: 10 }} color="#0055ff" />
              ) : attendees.length === 0 ? (
                <Text style={styles.meta}>No attendees yet</Text>
              ) : (
                <View style={styles.attendeeBox}>
                  {attendees.map((name, idx) => (
                    <Text key={idx} style={styles.attendee}>{idx + 1}. {name}</Text>
                  ))}
                </View>
              )
            )}
          </ScrollView>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center'
  },
  modalContent: {
    width: '90%', backgroundColor: '#fff', borderRadius: 16, padding: 20, maxHeight: '80%',
  },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#333', textAlign: 'center' },
  meta: { fontSize: 14, color: '#444', marginBottom: 4 },
  toggleBtn: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  toggleText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#333',
  },
  attendeeBox: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  attendee: { fontSize: 14, color: '#222', marginBottom: 4 },
  closeBtn: {
    backgroundColor: '#0055ff', marginTop: 12, paddingVertical: 12, borderRadius: 10, alignItems: 'center'
  },
  closeText: { color: '#fff', fontWeight: '600' },
});
