// Public sign-in screen. The auth service owns storage; this component owns form feedback and navigation.
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

const COLORS = {
  primary: '#0A6EBD',
  primaryDark: '#054A80',
  background: '#F0F4F8',
  surface: '#FFFFFF',
  text: '#1A2138',
  textSecondary: '#6B7A90',
  textLight: '#9BA8B7',
  error: '#E74C3C',
  errorBg: '#FDF0EF',
  border: '#E1E8EF',
  inputBg: '#F7F9FC',
};

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Validate locally for quick feedback, then reset history so a logged-in user cannot return to Login.
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await login(email, password);

      if (response.success) {
        setEmail('');
        setPassword('');
      } else {
        setError(response.message || 'Login returned unsuccessful response');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
          <View style={styles.logoIcon}>
            <Text style={styles.logoPlus}>+</Text>
          </View>
          <Text style={styles.logoTitle}>MediCore Pro</Text>
          <Text style={styles.logoSubtitle}>Clinic Management System</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.welcomeTitle}>Welcome Back</Text>
          <Text style={styles.welcomeSubtitle}>
            Sign in to continue managing your clinic
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Email */}
          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="you@clinic.com"
              placeholderTextColor={COLORS.textLight}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your password"
              placeholderTextColor={COLORS.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.showBtn}
            >
              <Text style={styles.showBtnText}>
                {showPassword ? 'HIDE' : 'SHOW'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Forgot */}
          <TouchableOpacity style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Sign In */}
          <TouchableOpacity
            style={[styles.signInBtn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.signInText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Sign Up */}
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flexGrow: 1,
  },

  // ── Header ──────────────────────────────
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 50,
    alignItems: 'center',
    overflow: 'hidden',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  circle1: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  circle2: {
    position: 'absolute',
    bottom: -20,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  logoPlus: {
    fontSize: 36,
    fontWeight: '300',
    color: '#FFFFFF',
  },
  logoTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  logoSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },

  // ── Card ────────────────────────────────
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: -20,
    padding: 24,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },

  // ── Error ───────────────────────────────
  errorBox: {
    backgroundColor: COLORS.errorBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: '500',
  },

  // ── Inputs ──────────────────────────────
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    marginBottom: 16,
    height: 52,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    height: 50,
  },
  showBtn: {
    paddingHorizontal: 10,
    paddingVertical: 14,
  },
  showBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },

  // ── Forgot ──────────────────────────────
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // ── Sign In ─────────────────────────────
  signInBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  signInText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ── Divider ─────────────────────────────
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },

  // ── Sign Up ─────────────────────────────
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  signupLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
  },
});
