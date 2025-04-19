import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function ExplorePage() {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'events'));

        const today = new Date();
        today.setHours(0, 0, 0, 0); // 🔥 normalize to midnight

        const fetched = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(event => {
            const eventDate = event.date?.seconds
              ? new Date(event.date.seconds * 1000)
              : null;
            return eventDate && eventDate >= today;
          });

        setEvents(fetched);
      } catch (err) {
        console.error('Error fetching events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const getCategories = () => {
    const unique = new Set(events.map(e => e.category).filter(Boolean));
    return ['All', ...Array.from(unique)];
  };

  const filteredEvents = events.filter(event => {
    const searchMatch =
      search === '' ||
      event.eventName?.toLowerCase().includes(search.toLowerCase()) ||
      event.location?.toLowerCase().includes(search.toLowerCase());

    const categoryMatch =
      selectedCategory === 'All' || event.category === selectedCategory;

    return searchMatch && categoryMatch;
  });

  const renderEvent = ({ item }) => {
    const dateObj = item.date?.seconds
      ? new Date(item.date.seconds * 1000)
      : new Date();

    return (
      <View style={styles.card}>
        <Image
          source={
            item.imageUrl === 'default' || !item.imageUrl
              ? require('../assets/images/default-event.png')
              : { uri: item.imageUrl }
          }
          style={styles.image}
        />
        <Text style={styles.title}>{item.eventName}</Text>
        <Text style={styles.meta}>📍 {item.location || 'Unknown'}</Text>
        <Text style={styles.meta}>
          📅 {dateObj.toDateString()} | ⏰ {dateObj.toLocaleTimeString()}
        </Text>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBox}
        placeholder="Search by name or location..."
        placeholderTextColor="#666"
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
        >
          {getCategories().map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryPill,
                selectedCategory === category && styles.activeCategoryPill,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category && styles.activeCategoryText,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0055ff" style={{ marginTop: 40 }} />
      ) : filteredEvents.length === 0 ? (
        <Text style={styles.noEvents}>No events found.</Text>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={item => item.id}
          renderItem={renderEvent}
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 12}}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', padding: 16 },
  searchBox: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryContainer: {
    marginBottom: 14,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  categoryPill: {
    backgroundColor: '#eee',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  activeCategoryPill: {
    backgroundColor: '#0055ff',
  },
  categoryText: {
    color: '#333',
    fontSize: 14,
  },
  activeCategoryText: {
    color: '#fff',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  meta: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  button: {
    backgroundColor: '#0055ff',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  noEvents: {
    textAlign: 'center',
    marginTop: 60,
    fontSize: 16,
    color: '#999',
  },
});
