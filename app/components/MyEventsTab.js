import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MyEventsTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>You have no events yet.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    color: '#333',
  },
});
