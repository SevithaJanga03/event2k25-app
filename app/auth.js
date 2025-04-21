import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, LogBox 
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { setDoc, doc } from 'firebase/firestore';


LogBox.ignoreLogs([
  'auth/invalid-credential',
  'auth/invalid-login-credentials',
  'Possible Unhandled Promise Rejection',
]);

export default function AuthScreen() {
  const [formType, setFormType] = useState('signup');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [passwordFocused, setPasswordFocused] = useState(false);
  const router = useRouter();

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setErrors({ ...errors, [field]: '', general: '' });
  };

  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^\S+@\S+\.\S+$/;

    if (formType === 'signup') {
      if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required.';
      if (!formData.email.trim()) newErrors.email = 'Email is required.';
      else if (!emailRegex.test(formData.email)) newErrors.email = 'Enter a valid email.';
      if (!formData.password) newErrors.password = 'Password is required.';
      else if (formData.password.length < 6) newErrors.password = 'Must be at least 6 characters.';
      if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password.';
      else if (formData.password !== formData.confirmPassword)
        newErrors.confirmPassword = 'Passwords do not match.';
    } else {
      if (!formData.email.trim()) newErrors.email = 'Email is required.';
      else if (!emailRegex.test(formData.email)) newErrors.email = 'Enter a valid email.';
      if (!formData.password) newErrors.password = 'Password is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getFirebaseErrorMessage = (code, type) => {
    const signinMessages = {
      'auth/user-not-found': 'Invalid email or password.',
      'auth/wrong-password': 'Invalid email or password.',
      'auth/invalid-login-credentials': 'Invalid email or password.',
      'auth/invalid-credential': 'Invalid email or password.',
      'auth/invalid-email': 'Invalid email format.',
      'auth/network-request-failed': 'Please check your internet connection.',
    };

    const signupMessages = {
      'auth/email-already-in-use': 'This email is already registered.',
      'auth/invalid-email': 'Invalid email format.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/network-request-failed': 'Please check your internet connection.',
    };

    const fallback = 'An unexpected error occurred. Please try again.';
    return type === 'signin'
      ? signinMessages[code] || fallback
      : signupMessages[code] || fallback;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      if (formType === 'signup') {
        const result = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

        await setDoc(doc(db, 'users', result.user.uid), {
          fullName: formData.fullName,
          email: formData.email,
          createdAt: new Date()
        });

        Alert.alert('🎉 Success', 'Account created successfully!');
        router.replace('/');
      } else {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        Alert.alert('✅ Welcome', 'Signed in successfully!');
        router.replace('/');
      }
    } catch (err) {
      const message = getFirebaseErrorMessage(err.code, formType);
      setErrors({ general: message });
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#ffffff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.form}>
          <Text style={styles.title}>
            {formType === 'signup' ? 'Create Account' : 'Sign In'}
          </Text>

          {errors.general && <Text style={styles.errorText}>{errors.general}</Text>}

          {formType === 'signup' && (
            <>
              <TextInput
                placeholder="Full Name"
                placeholderTextColor="#666"
                style={styles.input}
                value={formData.fullName}
                onChangeText={(text) => handleChange('fullName', text)}
              />
              {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
            </>
          )}

          <TextInput
            placeholder="Email"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            value={formData.email}
            onChangeText={(text) => handleChange('email', text)}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <TextInput
            placeholder="Password"
            placeholderTextColor="#666"
            secureTextEntry
            style={styles.input}
            value={formData.password}
            onChangeText={(text) => handleChange('password', text)}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
          />
          {formType === 'signup' && passwordFocused && (
            <Text style={styles.helper}>Password must be at least 6 characters.</Text>
          )}
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          {formType === 'signup' && (
            <>
              <TextInput
                placeholder="Confirm Password"
                placeholderTextColor="#666"
                secureTextEntry
                style={styles.input}
                value={formData.confirmPassword}
                onChangeText={(text) => handleChange('confirmPassword', text)}
              />
              {errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}
            </>
          )}

          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>
              {formType === 'signup' ? 'Sign Up' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setFormType(formType === 'signup' ? 'signin' : 'signup');
              setErrors({});
            }}
          >
            <Text style={styles.switchText}>
              {formType === 'signup'
                ? 'Already have an account? Sign In'
                : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  form: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 16,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#222',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 6,
    backgroundColor: '#f9f9f9',
  },
  helper: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    marginLeft: 4,
  },
  errorText: {
    color: 'red',
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 4,
  },
  button: {
    backgroundColor: '#0055ff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  switchText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#0055ff',
    marginTop: 6,
  },
});
