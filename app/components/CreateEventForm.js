import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, LogBox
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import DateTimePicker from '@react-native-community/datetimepicker';
import ModalDropdown from 'react-native-modal-dropdown';
import { db } from '../../firebaseConfig';
import { addDoc, collection, Timestamp, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useRouter } from 'expo-router';

const imgbbApiKey = '642ff87b12fdccc4709d73200f05dba6';


// Suppress key spread warning
LogBox.ignoreLogs([
  'A props object containing a "key" prop is being spread into JSX'
]);

export default function CreateEventForm() {
  const router = useRouter();
  const scrollViewRef = useRef();

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
  const [touched, setTouched] = useState({});

  const categories = [
    'Concert / Music', 'Conference', 'Workshop', 'Tech Meetup',
    'Party / Social', 'Education / Seminar', 'Health / Wellness',
    'Art & Culture', 'Market / Expo', 'Other'
  ];

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setErrors({ ...errors, [field]: '' });
  };

  const scrollToFirstError = () => {
    const keys = ['eventName', 'description', 'location', 'category', 'date', 'time', 'maxAttendees'];
    const errorKey = keys.find(key => errors[key]);
    const index = keys.indexOf(errorKey);
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: index * 110, animated: true });
    }
  };

  const validate = () => {
    const newErrors = {};
    const now = new Date();

    if (!formData.eventName.trim()) newErrors.eventName = 'Event name is required.';
    if (!formData.description.trim()) newErrors.description = 'Description is required.';
    if (!formData.location.trim()) newErrors.location = 'Location is required.';
    if (!formData.category) newErrors.category = 'Category is required.';
    if (date <= now) {
      newErrors.time = 'Pick a time at least 1 hour from now.';
    }

    if (formData.maxAttendees) {
      const num = parseInt(formData.maxAttendees);
      if (isNaN(num)) newErrors.maxAttendees = 'Must be a number.';
      else if (num < 1 || num > 50) newErrors.maxAttendees = 'Must be between 1 and 50.';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) scrollToFirstError();
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

      const selectedTimestamp = date.getTime();
      const eventSnap = await getDocs(collection(db, 'events'));
      const hasConflict = eventSnap.docs.some(doc => {
        const data = doc.data();
        return data.createdBy === user.uid &&
          data.date?.seconds &&
          new Date(data.date.seconds * 1000).getTime() === selectedTimestamp;
      });

      if (hasConflict) {
        Alert.alert('⛔ Conflict', 'You already have an event at this time.');
        setUploading(false);
        return;
      }

      const usersSnap = await getDocs(collection(db, 'users'));
      let fullName = 'Anonymous';
      usersSnap.forEach(doc => {
        const data = doc.data();
        if (data.email === user.email) fullName = data.fullName;
      });

      const newEvent = {
        ...formData,
        maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : 50,
        date: Timestamp.fromDate(date),
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        createdBy: user.uid,
        createdByName: fullName,
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
      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.title}>Create Event</Text>

          <Text style={styles.label}>Event Name *</Text>
          <TextInput
            style={[styles.input, errors.eventName && styles.errorInput]}
            placeholder="Enter event name"
            value={formData.eventName}
            onChangeText={(text) => handleChange('eventName', text)}
          />
          {errors.eventName && <Text style={styles.error}>{errors.eventName}</Text>}

          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, { height: 80 }, errors.description && styles.errorInput]}
            multiline
            placeholder="Enter description"
            value={formData.description}
            onChangeText={(text) => handleChange('description', text)}
          />
          {errors.description && <Text style={styles.error}>{errors.description}</Text>}

          <Text style={styles.label}>Date *</Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={[styles.input, errors.date && styles.errorInput]}
          >
            <Text>{date.toDateString()}</Text>
          </TouchableOpacity>
          {errors.date && <Text style={styles.error}>{errors.date}</Text>}
          {showDatePicker && (
            <DateTimePicker
              mode="date"
              value={date}
              minimumDate={new Date()}
              onChange={(e, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setDate(prev => new Date(selectedDate.setHours(prev.getHours(), prev.getMinutes())));
                  setErrors({ ...errors, date: '', time: '' });
                }
              }}
            />
          )}

          <Text style={styles.label}>Time *</Text>
          <TouchableOpacity onPress={() => setShowTimePicker(true)} style={[styles.input, errors.time && styles.errorInput]}>
            <Text>{date.toLocaleTimeString()}</Text>
          </TouchableOpacity>
          {errors.time && <Text style={styles.error}>{errors.time}</Text>}
          {showTimePicker && (
            <DateTimePicker
              mode="time"
              value={date}
              onChange={(e, selectedTime) => {
                setShowTimePicker(false);
                if (selectedTime) {
                  setDate(prev => new Date(prev.setHours(selectedTime.getHours(), selectedTime.getMinutes())));
                  setErrors({ ...errors, date: '', time: '' });
                }
              }}
            />
          )}

          <Text style={styles.label}>Location *</Text>
          <TextInput
            style={[styles.input, errors.location && styles.errorInput]}
            placeholder="Enter location"
            value={formData.location}
            onChangeText={(text) => handleChange('location', text)}
          />
          {errors.location && <Text style={styles.error}>{errors.location}</Text>}

          <Text style={styles.label}>Event Type *</Text>
          <View style={{ marginBottom: 6 }}>
          <ModalDropdown
            options={categories}
            defaultValue="Select a category"
            style={[styles.dropdown, errors.category && styles.errorInput]}
            dropdownStyle={styles.dropdownList}
            textStyle={styles.dropdownText}
            dropdownTextStyle={styles.dropdownItemText}
            onSelect={(index, value) => handleChange('category', value)}
            adjustFrame={style => ({
              ...style,
              left: 50, // match horizontal padding of ScrollView
              width: '70%', // match input width
              top: style.top + 8, // slight spacing below input
            })}
          />
          </View>

          {errors.category && <Text style={styles.error}>{errors.category}</Text>}

          <Text style={styles.label}>Max Attendees (optional)</Text>
          <TextInput
            style={[styles.input, errors.maxAttendees && styles.errorInput]}
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
            <Text style={styles.imageName}>Selected: {image.split('/').pop()}</Text>
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
  errorInput: {
    borderColor: '#cc0000', borderWidth: 1,
  },
  dropdown: {
    backgroundColor: '#f2f2f2',
    padding: 12,
    borderRadius: 10,
    width: '100%',
  },
  
  dropdownList: {
    // These values will be overridden by adjustFrame, but it's good to define them
    maxHeight: 220,
    borderRadius: 10,
    elevation: 5,
    backgroundColor: '#fff',
  },
  
  dropdownText: {
    fontSize: 15,
    color: '#333',
  },
  
  dropdownItemText: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#444',
  },
  
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
