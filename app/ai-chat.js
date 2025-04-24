// import React, { useState, useEffect, useRef, useContext } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   FlatList,
//   TouchableOpacity,
//   StyleSheet,
//   KeyboardAvoidingView,
//   Platform,
// } from 'react-native';
// import { collection, getDocs } from 'firebase/firestore';
// import { db } from '../firebaseConfig';
// import { useRouter } from 'expo-router';
// import { ChatContext } from './ChatContext';
// import { parse as chronoParse } from 'chrono-node';

// const STOPWORDS = new Set([
//   'in', 'on', 'at', 'the', 'and', 'or', 'events', 'event', 'for', 'show', 'me', 'find'
// ]);

// export default function AIChatScreen() {
//   const { messages, setMessages } = useContext(ChatContext);
//   const [input, setInput] = useState('');
//   const [allEvents, setAllEvents] = useState([]);
//   const flatRef = useRef();
//   const router = useRouter();

//   // Load events once
//   useEffect(() => {
//     (async () => {
//       const snap = await getDocs(collection(db, 'events'));
//       const arr = snap.docs.map(d => {
//         const data = d.data();
//         return {
//           id: d.id,
//           name: (data.eventName||'').toLowerCase(),
//           category: (data.category||'').toLowerCase(),
//           location: (data.location||'').toLowerCase(),
//           description: (data.description||'').toLowerCase(),
//           date: data.date?.seconds ? new Date(data.date.seconds*1000) : null,
//         };
//       });
//       setAllEvents(arr.filter(e=>e.date));
//     })();
//   }, []);

//   // Auto-scroll on new messages
//   useEffect(() => {
//     flatRef.current?.scrollToEnd({ animated: true });
//   }, [messages]);

//   // Send message
//   const sendMessage = () => {
//     const text = input.trim();
//     if (!text) return;
//     setMessages(prev => [...prev, { from: 'user', text }]);
//     setInput('');
//     processQuery(text.toLowerCase());
//   };

//   // Process user query
//   const processQuery = lc => {
//     // Strip ordinal suffixes (1st -> 1)
//     const cleanText = lc.replace(/\b(\d+)(st|nd|rd|th)\b/g, '$1');

//     // Parse date
//     const parsed = chronoParse(cleanText);
//     let startDate = null;
//     let endDate = null;
//     if (parsed.length) {
//       const dt = parsed[0].start.date();
//       // Set range from midnight to end of day
//       startDate = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0);
//       endDate = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 23, 59, 59, 999);
//     }

//     // Extract keywords
//     const keywords = cleanText
//       .split(/\W+/)
//       .map(k => k.trim())
//       .filter(k => k.length >= 3 && !STOPWORDS.has(k));

//     let results = [];

//     // If date parsed, filter by date
//     if (startDate) {
//       results = allEvents.filter(e => e.date >= startDate && e.date <= endDate);
//     } else if (keywords.length) {
//       // Else if keywords, filter by text
//       results = allEvents.filter(e =>
//         keywords.some(k =>
//           e.name.includes(k) ||
//           e.category.includes(k) ||
//           e.location.includes(k) ||
//           e.description.includes(k)
//         )
//       );
//     } else {
//       setMessages(prev => [
//         ...prev,
//         { from: 'bot', text: 'Please enter specific keywords or a date (e.g. "events on May 1st").' },
//       ]);
//       return;
//     }

//     if (!results.length) {
//       setMessages(prev => [
//         ...prev,
//         { from: 'bot', text: 'Sorry, no events matched your query.' },
//       ]);
//       return;
//     }

//     // Reply with matched events
//     const listText = results
//       .map((e, i) =>
//         `${i + 1}. ${e.name.charAt(0).toUpperCase() + e.name.slice(1)} (${e.category}, ${e.date.toDateString()})`
//       )
//       .join('\n');
//     setMessages(prev => [...prev, { from: 'bot', text: listText }]);

//     // Add actionable items
//     results.forEach(e => {
//       setMessages(prev => [
//         ...prev,
//         {
//           from: 'bot',
//           text: `Open "${e.name.charAt(0).toUpperCase() + e.name.slice(1)}"`,
//           eventId: e.id,
//         },
//       ]);
//     });
//   };

//   // Handle suggestion click
//   const handlePress = msg => {
//     if (msg.eventId) {
//       router.push(`/?eventId=${msg.eventId}`);
//     }
//   };

//   return (
//     <KeyboardAvoidingView
//       style={styles.container}
//       behavior={Platform.OS === 'ios' ? 'padding' : null}
//       keyboardVerticalOffset={80}
//     >
//       <FlatList
//         ref={flatRef}
//         data={messages}
//         keyExtractor={(_, i) => i.toString()}
//         contentContainerStyle={styles.chatContainer}
//         renderItem={({ item }) => (
//           <TouchableOpacity
//             onPress={() => handlePress(item)}
//             disabled={!item.eventId}
//             style={[
//               styles.bubble,
//               item.from === 'user' ? styles.userBubble : styles.botBubble,
//             ]}
//           >
//             <Text style={styles.messageText}>{item.text}</Text>
//           </TouchableOpacity>
//         )}
//       />

//       <View style={styles.inputRow}>
//         <TextInput
//           style={styles.input}
//           value={input}
//           onChangeText={setInput}
//           placeholder="Type keywords or date…"
//           multiline
//         />
//         <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
//           <Text style={styles.sendText}>Send</Text>
//         </TouchableOpacity>
//       </View>
//     </KeyboardAvoidingView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#fff' },
//   chatContainer: { padding: 16, paddingBottom: 80 },
//   bubble: { marginVertical: 6, padding: 10, borderRadius: 8, maxWidth: '80%' },
//   userBubble: { backgroundColor: '#dcf8c6', alignSelf: 'flex-end' },
//   botBubble: { backgroundColor: '#f1f0f0', alignSelf: 'flex-start' },
//   messageText: { fontSize: 16, lineHeight: 22 },
//   inputRow: {
//     position: 'absolute', bottom: 0, left: 0, right: 0,
//     flexDirection: 'row', padding: 8, backgroundColor: '#fff',
//     borderTopWidth: 1, borderColor: '#eee'
//   },
//   input: {
//     flex: 1, paddingHorizontal: 12, paddingVertical: 8,
//     backgroundColor: '#f5f5f5', borderRadius: 20,
//     fontSize: 16, maxHeight: 100
//   },
//   sendBtn: {
//     justifyContent: 'center', marginLeft: 8,
//     paddingHorizontal: 16, backgroundColor: '#0055ff',
//     borderRadius: 20
//   },
//   sendText: { color: '#fff', fontWeight: 'bold' }
// });


// import React, { useState, useEffect, useRef, useContext } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   FlatList,
//   TouchableOpacity,
//   StyleSheet,
//   KeyboardAvoidingView,
//   Platform,
// } from 'react-native';
// import { collection, getDocs } from 'firebase/firestore';
// import { db } from '../firebaseConfig';
// import { useRouter } from 'expo-router';
// import { ChatContext } from './ChatContext';
// import { parse as chronoParse } from 'chrono-node';

// // Define simple greeting and vulgar word lists
// const GREETINGS = ['hi', 'hello', 'hey', 'greetings', 'yo'];
// const VULGARS = ['damn'];
// const STOPWORDS = new Set([
//   'in', 'on', 'at', 'the', 'and', 'or', 'events', 'event', 'for', 'show', 'me', 'find'
// ]);

// export default function AIChatScreen() {
//   const { messages, setMessages } = useContext(ChatContext);
//   const [input, setInput] = useState('');
//   const [allEvents, setAllEvents] = useState([]);
//   const flatRef = useRef();
//   const router = useRouter();

//   // Load events once
//   useEffect(() => {
//     (async () => {
//       const snap = await getDocs(collection(db, 'events'));
//       const arr = snap.docs.map(d => {
//         const data = d.data();
//         return {
//           id: d.id,
//           name: (data.eventName||'').toLowerCase(),
//           category: (data.category||'').toLowerCase(),
//           location: (data.location||'').toLowerCase(),
//           description: (data.description||'').toLowerCase(),
//           date: data.date?.seconds ? new Date(data.date.seconds*1000) : null,
//         };
//       });
//       setAllEvents(arr.filter(e=>e.date));
//     })();
//   }, []);

//   // scroll on new messages
//   useEffect(() => {
//     flatRef.current?.scrollToEnd({ animated: true });
//   }, [messages]);

//   // send handler
//   const sendMessage = () => {
//     const text = input.trim();
//     if (!text) return;
//     setMessages(prev => [...prev, { from: 'user', text }]);
//     setInput('');
//     processQuery(text.toLowerCase());
//   };

//   const processQuery = lc => {
//     // Check greetings or vulgar
//     const words = lc.split(/\W+/);
//     if (words.some(w => GREETINGS.includes(w))) {
//       setMessages(prev => [...prev, { from: 'bot', text: 'Hello! Try asking something like “Events in Dallas”.' }]);
//       return;
//     }
//     if (words.some(w => VULGARS.includes(w))) {
//       setMessages(prev => [...prev, { from: 'bot', text: 'Please keep it polite. You can ask something like “Events in Dallas”.' }]);
//       return;
//     }

//     // Strip ordinal suffixes
//     const cleanText = lc.replace(/\b(\d+)(st|nd|rd|th)\b/g, '$1');

//     // Parse date
//     const parsed = chronoParse(cleanText);
//     let startDate = null;
//     let endDate = null;
//     if (parsed.length) {
//       const dt = parsed[0].start.date();
//       startDate = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0);
//       endDate = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 23, 59, 59, 999);
//     }

//     // Extract keywords
//     const keywords = cleanText
//       .split(/\W+/)
//       .map(k => k.trim())
//       .filter(k => k.length >= 3 && !STOPWORDS.has(k));

//     let results = [];
//     if (startDate) {
//       // date-only
//       results = allEvents.filter(e => e.date >= startDate && e.date <= endDate);
//     } else if (keywords.length) {
//       // keyword-only
//       results = allEvents.filter(e =>
//         keywords.some(k =>
//           e.name.includes(k) || e.category.includes(k) || e.location.includes(k) || e.description.includes(k)
//         )
//       );
//     } else {
//       setMessages(prev => [...prev, { from: 'bot', text: 'Please try asking “Events in Dallas”.' }]);
//       return;
//     }

//     if (!results.length) {
//       setMessages(prev => [...prev, { from: 'bot', text: 'Sorry, no events matched your query.' }]);
//       return;
//     }

//     // list reply
//     const listText = results
//       .map((e, i) => `${i+1}. ${e.name.charAt(0).toUpperCase()+e.name.slice(1)} (${e.category}, ${e.date.toDateString()})`)
//       .join('\n');
//     setMessages(prev => [...prev, { from: 'bot', text: listText }]);

//     // clickable suggestions
//     results.forEach(e => {
//       setMessages(prev => [...prev, { from: 'bot', text: `Open “${e.name.charAt(0).toUpperCase()+e.name.slice(1)}”`, eventId: e.id }]);
//     });
//   };

//   // handle taps
//   const handlePress = msg => {
//     if (msg.eventId) router.push(`/?eventId=${msg.eventId}`);
//   };

//   return (
//     <KeyboardAvoidingView
//       style={styles.container}
//       behavior={Platform.OS==='ios'?'padding':null}
//       keyboardVerticalOffset={80}
//     >
//       <FlatList
//         ref={flatRef}
//         data={messages}
//         keyExtractor={(_,i)=>i.toString()}
//         contentContainerStyle={styles.chatContainer}
//         renderItem={({item})=>(
//           <TouchableOpacity
//             onPress={()=>handlePress(item)}
//             disabled={!item.eventId}
//             style={[styles.bubble, item.from==='user'?styles.userBubble:styles.botBubble]}
//           >
//             <Text style={styles.messageText}>{item.text}</Text>
//           </TouchableOpacity>
//         )}
//       />
//       <View style={styles.inputRow}>
//         <TextInput
//           style={styles.input}
//           value={input}
//           onChangeText={setInput}
//           placeholder="Type keywords or date…"
//           multiline
//         />
//         <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
//           <Text style={styles.sendText}>Send</Text>
//         </TouchableOpacity>
//       </View>
//     </KeyboardAvoidingView>
//   );
// }

// const styles = StyleSheet.create({
//   container:{flex:1,backgroundColor:'#fff'},
//   chatContainer:{padding:16,paddingBottom:80},
//   bubble:{marginVertical:6,padding:10,borderRadius:8,maxWidth:'80%'},
//   userBubble:{backgroundColor:'#dcf8c6',alignSelf:'flex-end'},
//   botBubble:{backgroundColor:'#f1f0f0',alignSelf:'flex-start'},
//   messageText:{fontSize:16,lineHeight:22},
//   inputRow:{position:'absolute',bottom:0,left:0,right:0,flexDirection:'row',padding:8,backgroundColor:'#fff',borderTopWidth:1,borderColor:'#eee'},
//   input:{flex:1,paddingHorizontal:12,paddingVertical:8,backgroundColor:'#f5f5f5',borderRadius:20,fontSize:16,maxHeight:100},
//   sendBtn:{justifyContent:'center',marginLeft:8,paddingHorizontal:16,backgroundColor:'#0055ff',borderRadius:20},
//   sendText:{color:'#fff',fontWeight:'bold'}
// });


import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useRouter } from 'expo-router';
import { ChatContext } from './ChatContext';
import { parse as chronoParse } from 'chrono-node';

// Define simple greeting and vulgar word lists
const GREETINGS = ['hi', 'hello', 'hey', 'greetings', 'yo'];
const VULGARS = ['fuck', 'shit', 'damn', 'bitch', 'cunt'];
const STOPWORDS = new Set([
  'in', 'on', 'at', 'the', 'and', 'or', 'events', 'event', 'for', 'show', 'me', 'find'
]);

export default function AIChatScreen() {
  const { messages, setMessages } = useContext(ChatContext);
  const [input, setInput] = useState('');
  const [allEvents, setAllEvents] = useState([]);
  const flatRef = useRef();
  const router = useRouter();

  // Load events once
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, 'events'));
      const arr = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: (data.eventName || '').toLowerCase(),
          category: (data.category || '').toLowerCase(),
          location: (data.location || '').toLowerCase(),
          description: (data.description || '').toLowerCase(),
          date: data.date?.seconds ? new Date(data.date.seconds * 1000) : null,
        };
      });
      setAllEvents(arr.filter(e => e.date));
    })();
  }, []);

  // scroll on new messages
  useEffect(() => {
    flatRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // send handler
  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    setMessages(prev => [...prev, { from: 'user', text }]);
    setInput('');
    processQuery(text.toLowerCase());
  };

  const processQuery = lc => {
    // Check greetings or vulgar
    const words = lc.split(/\W+/);
    if (words.some(w => GREETINGS.includes(w))) {
      setMessages(prev => [...prev, { from: 'bot', text: 'Hello! Try asking something like “Events in Dallas” or “Events on May 1st”.' }]);
      return;
    }
    if (words.some(w => VULGARS.includes(w))) {
      setMessages(prev => [...prev, { from: 'bot', text: 'Please keep it polite. You can ask something like “Events in Dallas”.' }]);
      return;
    }

    // Strip ordinal suffixes
    const cleanText = lc.replace(/\b(\d+)(st|nd|rd|th)\b/g, '$1');

    // Parse date
    const parsed = chronoParse(cleanText);
    let startDate = null;
    let endDate = null;
    if (parsed.length) {
      const dt = parsed[0].start.date();
      startDate = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0);
      endDate = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 23, 59, 59, 999);
    }

    // Extract keywords (allow 2-letter keywords like 'ai')
    const keywords = cleanText
      .split(/\W+/)
      .map(k => k.trim())
      .filter(k => k.length >= 2 && !STOPWORDS.has(k));

    let results = [];
    if (startDate) {
      // date-only
      results = allEvents.filter(e => e.date >= startDate && e.date <= endDate);
    } else if (keywords.length) {
      // keyword-only
      results = allEvents.filter(e =>
        keywords.some(k =>
          e.name.includes(k) || e.category.includes(k) || e.location.includes(k) || e.description.includes(k)
        )
      );
    } else {
      setMessages(prev => [...prev, { from: 'bot', text: 'Please try asking “Events in Dallas” or “Events on May 1st”.' }]);
      return;
    }

    if (!results.length) {
      setMessages(prev => [...prev, { from: 'bot', text: 'Sorry, no events matched your query.' }]);
      return;
    }

    // list reply
    const listText = results
      .map((e, i) => `${i + 1}. ${e.name.charAt(0).toUpperCase() + e.name.slice(1)} (${e.category}, ${e.date.toDateString()})`)
      .join('\n');
    setMessages(prev => [...prev, { from: 'bot', text: listText }]);

    // clickable suggestions
    results.forEach(e => {
      setMessages(prev => [...prev, { from: 'bot', text: `Open “${e.name.charAt(0).toUpperCase() + e.name.slice(1)}”`, eventId: e.id }]);
    });
  };

  // handle taps
  const handlePress = msg => {
    if (msg.eventId) router.push(`/?eventId=${msg.eventId}`);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      keyboardVerticalOffset={80}
    >
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={styles.chatContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handlePress(item)}
            disabled={!item.eventId}
            style={[styles.bubble, item.from === 'user' ? styles.userBubble : styles.botBubble]}
          >
            <Text style={styles.messageText}>{item.text}</Text>
          </TouchableOpacity>
        )}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type keywords or date…"
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  chatContainer: { padding: 16, paddingBottom: 80 },
  bubble: { marginVertical: 6, padding: 10, borderRadius: 8, maxWidth: '80%' },
  userBubble: { backgroundColor: '#dcf8c6', alignSelf: 'flex-end' },
  botBubble: { backgroundColor: '#f1f0f0', alignSelf: 'flex-start' },
  messageText: { fontSize: 16, lineHeight: 22 },
  inputRow: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 8, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee' },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f5f5f5', borderRadius: 20, fontSize: 16, maxHeight: 100 },
  sendBtn: { justifyContent: 'center', marginLeft: 8, paddingHorizontal: 16, backgroundColor: '#0055ff', borderRadius: 20 },
  sendText: { color: '#fff', fontWeight: 'bold' },
});
