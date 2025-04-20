import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import DateTimePicker from '@react-native-community/datetimepicker';
import ModalDropdown from 'react-native-modal-dropdown';
import { db } from '../../firebaseConfig';
import { addDoc, collection, Timestamp, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useRouter } from 'expo-router';

const imgbbApiKey = '642ff87b12fdccc4709d73200f05dba6'; // Replace with your own key

export default function CreateEventForm() {
  const router = useRouter();

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

    if (formData.maxAttendees) {
      const num = parseInt(formData.maxAttendees);
      if (isNaN(num)) {
        newErrors.maxAttendees = 'Must be a number.';
      } else if (num < 1 || num > 50) {
        newErrors.maxAttendees = 'Must be between 1 and 50.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow access to photo library to upload an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadToImgbb = async (uri) => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const formData = new FormData();
      formData.append('key', imgbbApiKey);
      formData.append('image', base64);

      const res = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      return data?.data?.url || 'default';
    } catch (err) {
      console.error('Image upload failed:', err);
      return 'default';
    }
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
    let imageUrl = 'default';

    try {
      if (image) {
        imageUrl = await uploadToImgbb(image);
      }

      // 🔍 Fetch fullName from users collection using email
      const usersSnap = await getDocs(collection(db, 'users'));
      let fullName = 'Anonymous';
      usersSnap.forEach(doc => {
        const data = doc.data();
        if (data.email === user.email) {
          fullName = data.fullName;
        }
      });

      const newEvent = {
        ...formData,
        maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : 50,
        date: Timestamp.fromDate(date),
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        createdBy: user.uid,
        createdByName: fullName, // ✅ Add full name
        createdAt: Timestamp.now(),
        imageUrl,
      };

      await addDoc(collection(db, 'events'), newEvent);
      Alert.alert('✅ Success', 'Event created successfully!');
      setFormData({ eventName: '', description: '', location: '', category: '', maxAttendees: '' });
      setImage(null);
      router.replace('/');
    } catch (error) {
      console.error('Error uploading event:', error);
      Alert.alert('❌ Error', 'Something went wrong. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
            placeholder="e.g. 50"
            keyboardType="numeric"
            value={formData.maxAttendees}
            onChangeText={(text) => handleChange('maxAttendees', text)}
          />
          <Text style={styles.helper}>Min: 1, Max: 50 attendees</Text>
          {errors.maxAttendees && <Text style={styles.error}>{errors.maxAttendees}</Text>}

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
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000',
    shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  title: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 16, color: '#222' },
  label: { fontWeight: '600', marginTop: 14, marginBottom: 6, color: '#333' },
  input: {
    backgroundColor: '#f2f2f2', padding: 12, borderRadius: 10, fontSize: 15,
  },
  dropdown: { backgroundColor: '#f2f2f2', padding: 12, borderRadius: 10 },
  dropdownList: { width: '85%', borderRadius: 8 },
  dropdownText: { fontSize: 15, color: '#333' },
  dropdownItemText: { padding: 12, fontSize: 14 },
  error: { color: '#cc0000', marginTop: 4, fontSize: 13, marginLeft: 4 },
  helper: { fontSize: 12, color: '#777', marginTop: 4, marginLeft: 4 },
  uploadBtn: {
    marginTop: 10, backgroundColor: '#eee', padding: 12, borderRadius: 10, alignItems: 'center',
  },
  uploadText: { fontWeight: '600', color: '#333', fontSize: 15 },
  imageName: { marginTop: 8, fontSize: 13, fontStyle: 'italic', color: '#555' },
  button: {
    marginTop: 24, backgroundColor: '#0055ff', paddingVertical: 14,
    borderRadius: 10, alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
