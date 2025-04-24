// app/components/AISuggestionFAB.js
import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';

export default function AISuggestionFAB() {
  const router = useRouter();

  const goToChat = useCallback(() => {
    // Navigate to the ai-chat.js screen in your app/ folder
    router.push('ai-chat');
  }, [router]);

  return (
    <View style={styles.container}>
      <FAB
        icon="robot"
        label="Chat AI"
        style={styles.fab}
        onPress={goToChat}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 40,
  },
  fab: {
    backgroundColor: '#6200ee',
  },
});
