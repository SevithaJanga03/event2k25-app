import React from 'react';
import { View, StyleSheet } from 'react-native';
import CreateEventForm from './components/CreateEventForm';

export default function CreateEventScreen() {
  return (
    <View style={styles.container}>
      <CreateEventForm />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
