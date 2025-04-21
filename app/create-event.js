import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CreateEventForm from './components/CreateEventForm';
import MyEventsTab from './components/MyEventsTab';

export default function CreateEventScreen() {
  const [showForm, setShowForm] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Events</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)}>
          <Ionicons name={showForm ? 'close-circle' : 'add-circle'} size={30} color="#0055ff" />
        </TouchableOpacity>
      </View>

      {showForm ? <CreateEventForm /> : <MyEventsTab />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
});