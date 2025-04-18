import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import ModalDropdown from 'react-native-modal-dropdown';
import { db, storage } from '../../firebaseConfig';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as Crypto from 'expo-crypto';

export default function CreateEventForm() {
  const [formData, setFormData] = useState({
    eventName: '',
    description: '',
    location: '',
    category: '',
    maxAttendees: '',
  });

  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [errors, setErrors] = useState({});

  const categories = [
    'Concert / Music', 'Conference', 'Workshop', 'Tech Meetup',
    'Party / Social', 'Education / Seminar', 'Health / Wellness',
    'Art & Culture', 'Market / Expo', 'Other'
  ];

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setErrors({ ...errors, [field]: '' });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.eventName.trim()) newErrors.eventName = 'Event name is required.';
    if (!formData.description.trim()) newErrors.description = 'Description is required.';
    if (!formData.location.trim()) newErrors.location = 'Location is required.';
    if (!formData.category) newErrors.category = 'Category is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const generateFilename = async () => {
    const random = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      Date.now().toString()
    );
    return `events/${random}.jpg`;
  };

  const uploadImage = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = await generateFilename();
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
  
    const auth = getAuth();
    const user = auth.currentUser;
  
    if (!user) {
      Alert.alert('🔒 Login Required', 'Please login to create an event.');
      return;
    }
  
    setUploading(true);
    let imageUrl = '';
  
    try {
      if (image && typeof image === 'string') {
        try {
          imageUrl = await uploadImage(image);
        } catch (imgErr) {
          console.warn("⚠️ Image upload failed, using default fallback.");
        }
      }
  
      const newEvent = {
        ...formData,
        date: Timestamp.fromDate(date),
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        createdBy: user.uid,
        createdAt: Timestamp.now(),
        ...(imageUrl && { imageUrl }), // ✅ only include if exists
      };
  
      await addDoc(collection(db, 'events'), newEvent);
      Alert.alert('✅ Success', 'Event created successfully!');
  
      // Reset form
      setFormData({
        eventName: '',
        description: '',
        location: '',
        category: '',
        maxAttendees: '',
      });
      setImage(null);
    } catch (error) {
      console.error('Error uploading event:', error);
      Alert.alert('❌ Error', 'Something went wrong. Please try again.');
    } finally {
      setUploading(false);
    }
  };
  
  

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>Create Event</Text>

          <Text style={styles.label}>Event Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter event name"
            value={formData.eventName}
            onChangeText={(text) => handleChange('eventName', text)}
          />
          {errors.eventName && <Text style={styles.error}>{errors.eventName}</Text>}

          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            multiline
            placeholder="Enter description"
            value={formData.description}
            onChangeText={(text) => handleChange('description', text)}
          />
          {errors.description && <Text style={styles.error}>{errors.description}</Text>}

          <Text style={styles.label}>Date *</Text>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
            <Text>{date.toDateString()}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              mode="date"
              value={date}
              onChange={(e, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}

          <Text style={styles.label}>Time *</Text>
          <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.input}>
            <Text>{date.toLocaleTimeString()}</Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              mode="time"
              value={date}
              onChange={(e, selectedTime) => {
                setShowTimePicker(false);
                if (selectedTime) setDate(selectedTime);
              }}
            />
          )}

          <Text style={styles.label}>Location *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter location"
            value={formData.location}
            onChangeText={(text) => handleChange('location', text)}
          />
          {errors.location && <Text style={styles.error}>{errors.location}</Text>}

          <Text style={styles.label}>Event Type *</Text>
          <ModalDropdown
            options={categories}
            defaultValue="Select a category"
            style={styles.dropdown}
            dropdownStyle={styles.dropdownList}
            textStyle={styles.dropdownText}
            dropdownTextStyle={styles.dropdownItemText}
            onSelect={(index, value) => handleChange('category', value)}
          />
          {errors.category && <Text style={styles.error}>{errors.category}</Text>}

          <Text style={styles.label}>Max Attendees (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 100"
            keyboardType="numeric"
            value={formData.maxAttendees}
            onChangeText={(text) => handleChange('maxAttendees', text)}
          />

          <Text style={styles.label}>Event Image (optional)</Text>
          <TouchableOpacity onPress={pickImage} style={styles.uploadBtn}>
            <Text style={styles.uploadText}>Pick an Image</Text>
          </TouchableOpacity>
          {image && (
            <Text style={styles.imageName}>
              Selected: {image.split('/').pop()}
            </Text>
          )}

          <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={uploading}>
            {uploading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Create Event</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  scroll: { padding: 16, paddingBottom: 80 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  label: { fontWeight: '600', marginTop: 12, marginBottom: 4, color: '#222' },
  input: {
    backgroundColor: '#f4f4f4',
    padding: 12,
    borderRadius: 10,
  },
  dropdown: {
    backgroundColor: '#f4f4f4',
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
  },
  dropdownList: {
    width: '85%',
    height: 'auto',
    borderRadius: 8,
  },
  dropdownText: { fontSize: 15, color: '#444' },
  dropdownItemText: { padding: 12, fontSize: 14 },
  error: { color: 'red', marginTop: 4, fontSize: 13 },
  uploadBtn: {
    marginTop: 8,
    backgroundColor: '#e0e0e0',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadText: { fontWeight: '600', color: '#333' },
  imageName: { marginTop: 6, fontSize: 14, fontStyle: 'italic', color: '#555' },
  button: {
    marginTop: 20,
    backgroundColor: '#0055ff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
