import React, { useEffect, useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  ScrollView, ToastAndroid, Animated, Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { onSnapshot, getDocs, collection } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { db } from '../../firebaseConfig';

export default function EventDetailsModal({ visible, event, onClose }) {
  const [registeredCount, setRegisteredCount] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [attendees, setAttendees] = useState([]);

  useEffect(() => {
    if (!event || !visible) return;

    const unsubscribe = onSnapshot(collection(db, 'events', event.id, 'registrations'), async (snapshot) => {
      const userSnap = await getDocs(collection(db, 'users'));
      const userMap = {};
      userSnap.forEach(doc => {
        const data = doc.data();
        userMap[data.email] = data.fullName;
      });

      const names = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          fullName: userMap[data.email] || 'Unknown',
          email: data.email,
        };
      });

      setAttendees(names);
      setRegisteredCount(names.length);
    });

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    return () => unsubscribe();
  }, [event, visible]);

  const handleShare = async () => {
    try {
      const message = `📅 ${event.eventName}\n📍 ${event.location}\n🕒 ${new Date(
        event.date.seconds * 1000
      ).toLocaleString()}\n\nJoin this amazing event now!`;
      await Share.share({ message });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (!event) return null;

  const dateObj = new Date(event.date?.seconds * 1000);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.modalContent, { opacity: fadeAnim }]}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>{event.eventName}</Text>
            <Text style={styles.meta}>📅 {dateObj.toDateString()}</Text>
            <Text style={styles.meta}>
              ⏰ {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={styles.meta}>📍 {event.location}</Text>
            <Text style={styles.meta}>📝 {event.description}</Text>
            <Text style={styles.meta}>
              👥 Registered: {registeredCount}{event.maxAttendees ? ` / ${event.maxAttendees}` : ''}
            </Text>
            <Text style={styles.meta}>👤 Host: {event.createdByName || 'Anonymous'}</Text>
            {attendees.length > 0 && (
              <View style={{ marginTop: 14 }}>
                <Text style={styles.attendeeTitle}>Attendees:</Text>
                {attendees.map((a, index) => (
                  <Text key={index} style={styles.attendeeText}>• {a.fullName} ({a.email})</Text>
                ))}
              </View>
            )}
          </ScrollView>

          <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
            <Ionicons name="share-social-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.shareText}>Share This Event</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20
  },
  modalContent: {
    width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 16, maxHeight: '80%', elevation: 10
  },
  content: { paddingBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#333', textAlign: 'center' },
  meta: { fontSize: 14, color: '#444', marginBottom: 6 },
  attendeeTitle: { fontSize: 15, fontWeight: 'bold', marginTop: 10, color: '#222' },
  attendeeText: { fontSize: 13, color: '#555', marginTop: 4 },
  shareBtn: {
    flexDirection: 'row', backgroundColor: '#6200EA', paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 12, alignItems: 'center', alignSelf: 'center', marginTop: 10,
  },
  shareText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  closeBtn: {
    backgroundColor: '#0055ff', marginTop: 10, paddingVertical: 12, borderRadius: 8, alignItems: 'center'
  },
  closeText: { color: '#fff', fontWeight: '600' },
});
