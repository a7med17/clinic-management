// Expo application entry: restore a persisted session before mounting role-aware navigation.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { getCurrentUserProfile, isAuthenticated, User } from './src/services/authService';

export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // A token alone is not trusted as a profile: refresh it from the API, falling back to cached data offline.
    const restoreSession = async () => {
      if (await isAuthenticated()) {
        setUser(await getCurrentUserProfile());
      }
      setBooting(false);
    };
    restoreSession();
  }, []);

  if (booting) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#0A6EBD" /></View>;
  }

  return <AppNavigator initialUser={user} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4F8' },
});
