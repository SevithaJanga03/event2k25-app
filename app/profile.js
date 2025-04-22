import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, Dimensions, Image,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { auth, db } from '../firebaseConfig';
import {
  doc, getDoc, updateDoc, collection, getDocs
} from 'firebase/firestore';
import {
  onAuthStateChanged,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  updateEmail
} from 'firebase/auth';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

// ---------------- Profile Route ----------------
const ProfileRoute = ({
  userData, setUserData, originalData, editing, setEditing,
  error, setError, saving, handleSave,
  formData, setFormData, changingPassword, setChangingPassword,
  handlePasswordChange, pickImage
}) => (
  <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20 }}>
    <View style={styles.header}>
      <Text style={styles.title}>My Profile</Text>
      {!editing && (
        <TouchableOpacity onPress={() => setEditing(true)}>
          <Feather name="edit-3" size={22} color="#0055ff" />
        </TouchableOpacity>
      )}
    </View>

    <View style={styles.profilePicContainer}>
      <TouchableOpacity onPress={pickImage}>
        {userData.imageUrl ? (
          <Image source={{ uri: userData.imageUrl }} style={styles.profilePic} />
        ) : (
          <View style={styles.profilePicPlaceholder}>
            <Feather name="user" size={40} color="#aaa" />
          </View>
        )}
      </TouchableOpacity>
      <Text style={{ fontSize: 12, color: '#888', marginTop: 6 }}>
        Tap to upload/change
      </Text>
    </View>

    {error !== '' && <Text style={styles.error}>{error}</Text>}

    <Text style={styles.label}>Full Name</Text>
    <TextInput
      style={styles.input}
      value={userData.fullName}
      onChangeText={(text) => setUserData({ ...userData, fullName: text })}
      editable={editing}
      placeholder="Enter your full name"
    />

    <Text style={styles.label}>Email</Text>
    <TextInput
      style={styles.input}
      value={userData.email}
      onChangeText={(text) => setUserData({ ...userData, email: text })}
      editable={editing}
      keyboardType="email-address"
      autoCapitalize="none"
      placeholder="Enter your email"
    />

    {editing && (
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => {
          setUserData({ ...originalData });
          setEditing(false);
          setError('');
        }}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    )}

    {!changingPassword ? (
      <TouchableOpacity
        style={styles.changePasswordBtn}
        onPress={() => setChangingPassword(true)}
      >
        <Text style={styles.changePasswordText}>Change Password</Text>
      </TouchableOpacity>
    ) : (
      <>
        <Text style={styles.label}>Current Password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={formData.currentPassword}
          onChangeText={(text) => setFormData({ ...formData, currentPassword: text })}
          placeholder="Enter current password"
        />

        <Text style={styles.label}>New Password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={formData.newPassword}
          onChangeText={(text) => setFormData({ ...formData, newPassword: text })}
          placeholder="Enter new password"
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.saveButton} backgroundColor='#0055ff' onPress={handlePasswordChange}>
            <Text style={styles.saveButtonText}>Update Password</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => {
            setFormData({ currentPassword: '', newPassword: '' });
            setChangingPassword(false);
            setError('');
          }}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </>
    )}
  </ScrollView>
);

// ---------------- Events Route ----------------
const EventsRoute = ({ registeredEvents }) => (
  <ScrollView contentContainerStyle={{ padding: 20 }}>
    {registeredEvents.length === 0 ? (
      <Text style={styles.noEvents}>You have not registered for any events yet.</Text>
    ) : (
      registeredEvents.map(event => {
        const dateObj = new Date(event.date?.seconds * 1000);

        return (
          <View key={event.id} style={styles.eventCard}>
            <Image
              source={event.imageUrl === 'default' || !event.imageUrl
                ? require('../assets/images/default-event.png')
                : { uri: event.imageUrl }}
              style={{ width: '100%', height: 160, borderRadius: 10, marginBottom: 10 }}
            />
            <Text style={styles.eventTitle}>{event.eventName}</Text>
            <Text style={styles.eventMeta}>📍 {event.location}</Text>
            <Text style={styles.eventMeta}>📅 {dateObj.toDateString()} ⏰ {dateObj.toLocaleTimeString()}</Text>
            <Text style={styles.eventMeta}>👥 Registered</Text>
          </View>
        );
      })
    )}
  </ScrollView>
);

// ---------------- Main Component ----------------
export default function ProfilePage() {
  const [userData, setUserData] = useState({ fullName: '', email: '', imageUrl: '' });
  const [originalData, setOriginalData] = useState({ fullName: '', email: '', imageUrl: '' });
  const [formData, setFormData] = useState({ currentPassword: '', newPassword: '' });
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        Alert.alert('Login Required', 'Please login to view your profile.', [
          { text: 'OK', onPress: () => router.replace('/auth') }
        ]);
        return;
      }

      try {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData({
            fullName: data.fullName || '',
            email: data.email || '',
            imageUrl: data.imageUrl || ''
          });
          setOriginalData({
            fullName: data.fullName || '',
            email: data.email || '',
            imageUrl: data.imageUrl || ''
          });
        }
        await fetchRegisteredEvents(user.uid);
      } catch (err) {
        console.error(err);
        setError('Failed to load profile data.');
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const fetchRegisteredEvents = async (uid) => {
    try {
      const eventsSnap = await getDocs(collection(db, 'events'));
      const registered = [];

      for (const docSnap of eventsSnap.docs) {
        const eventData = { id: docSnap.id, ...docSnap.data() };
        const regDoc = await getDoc(doc(db, 'registrations', docSnap.id));
        const regData = regDoc.exists() ? regDoc.data() : {};

        if (regData[uid]) {
          registered.push(eventData);
        }
      }

      setRegisteredEvents(registered);
    } catch (err) {
      console.error('Error fetching registered events:', err);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission required", "We need permission to access your photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: true,
      aspect: [1, 1]
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setUserData(prev => ({ ...prev, imageUrl: uri }));
      setEditing(true);
    }
  };

  const handleSave = async () => {
    setError('');
    const user = auth.currentUser;
    if (!user) return;

    if (!userData.fullName.trim() || !userData.email.trim()) {
      setError('Name and email are required.');
      return;
    }

    try {
      setSaving(true);
      if (user.email !== userData.email) {
        await updateEmail(user, userData.email);
      }

      await updateDoc(doc(db, 'users', user.uid), {
        fullName: userData.fullName,
        email: userData.email,
        imageUrl: userData.imageUrl || '',
      });

      Alert.alert('✅ Success', 'Profile updated successfully.');
      setEditing(false);
      setOriginalData({ ...userData });
    } catch (err) {
      console.error(err);
      setError('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setError('');
    const { currentPassword, newPassword } = formData;
    const user = auth.currentUser;

    if (!currentPassword || !newPassword) {
      setError('Both password fields are required.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password.');
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      Alert.alert('✅ Password Changed', 'Your password was successfully updated.');
      setFormData({ currentPassword: '', newPassword: '' });
      setChangingPassword(false);
    } catch (err) {
      console.error(err);
      setError(err.code === 'auth/wrong-password'
        ? 'Current password is incorrect.'
        : 'Failed to update password. Try again.');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.tabButtonRow}>
        <TouchableOpacity onPress={() => setActiveTab('profile')}>
          <Text style={activeTab === 'profile' ? styles.activeTab : styles.inactiveTab}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('events')}>
          <Text style={activeTab === 'events' ? styles.activeTab : styles.inactiveTab}>My Registrations</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'profile' ? (
        <ProfileRoute
          userData={userData}
          setUserData={setUserData}
          originalData={originalData}
          editing={editing}
          setEditing={setEditing}
          error={error}
          setError={setError}
          saving={saving}
          handleSave={handleSave}
          formData={formData}
          setFormData={setFormData}
          changingPassword={changingPassword}
          setChangingPassword={setChangingPassword}
          handlePasswordChange={handlePasswordChange}
          pickImage={pickImage}
        />
      ) : (
        <EventsRoute registeredEvents={registeredEvents} />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tabButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#f0f0f0',
  },
  activeTab: {
    color: '#0055ff',
    fontWeight: '700',
    fontSize: 16,
  },
  inactiveTab: {
    color: '#666',
    fontWeight: '500',
    fontSize: 16,
  },


  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222',
  },
  profilePicContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePic: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#0055ff',
  },
  profilePicPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#0055ff',
    padding: 14,
    borderRadius: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#ddd',
    padding: 14,
    borderRadius: 10,
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  changePasswordBtn: {
    marginTop: 10,
    marginBottom: 30,
  },
  changePasswordText: {
    textAlign: 'center',
    color: '#0055ff',
    fontSize: 15,
    fontWeight: '500',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 13,
  },
  eventCard: {
    backgroundColor: '#f6f9ff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#dde3f0',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  eventMeta: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },
  noEvents: {
    fontSize: 14,
    color: '#777',
    marginTop: 10,
    textAlign: 'center',
  },
});

