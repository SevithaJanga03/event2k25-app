import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../firebaseConfig';

export default function AuthScreen() {
  const [formType, setFormType] = useState('signup');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
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
    if (type === 'signin') {
      if (
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-login-credentials' || // ✅ fixed!
        code === 'auth/invalid-credential' // handles some web errors
      ) {
        return 'Invalid email or password.';
      }
      if (code === 'auth/invalid-email') return 'Invalid email format.';
      if (code === 'auth/network-request-failed') return 'Check your internet connection.';
      return 'An unexpected error occurred. Please try again.';
    } else {
      if (code === 'auth/email-already-in-use') return 'This email is already registered.';
      if (code === 'auth/invalid-email') return 'Invalid email format.';
      if (code === 'auth/weak-password') return 'Password must be at least 6 characters.';
      if (code === 'auth/network-request-failed') return 'Check your internet connection.';
      return 'An unexpected error occurred. Please try again.';
    }
  };
  

  const handleSubmit = async () => {
    if (validateForm()) {
      if (formType === 'signup') {
        try {
          const result = await createUserWithEmailAndPassword(
            auth,
            formData.email,
            formData.password
          );
          console.log('✅ Sign-up success:', result.user?.email);
          Alert.alert('🎉 Success', 'Account created successfully!');
          router.replace('/');
        } catch (err) {
          console.error('❌ Sign-up error:', err.code, err.message);
          const message = getFirebaseErrorMessage(err.code, 'signup');
          setErrors({ general: message });
        }
      } else {
        try {
          const result = await signInWithEmailAndPassword(
            auth,
            formData.email,
            formData.password
          );
          console.log('✅ Sign-in success:', result.user?.email);
          Alert.alert('✅ Welcome', 'Signed in successfully!');
          router.replace('/');
        } catch (err) {
          console.error('❌ Sign-in error:', err.code, err.message);
          const message = getFirebaseErrorMessage(err.code, 'signin');
          setErrors({ general: message });
        }
      }
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

          {errors.general ? <Text style={styles.errorText}>{errors.general}</Text> : null}

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
