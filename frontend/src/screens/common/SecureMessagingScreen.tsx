// Placeholder secure-messaging screen; no real-time or encrypted messaging service is connected yet.
import React from 'react';
import { StyleSheet, View, Text, SafeAreaView } from 'react-native';

export default function SecureMessagingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Secure Messaging</Text>
        <Text style={styles.subtitle}>Placeholder for encrypted peer-to-peer discussions between doctors, staffs, and patients.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eefaf4',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f4c3a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#71a28a',
    textAlign: 'center',
  },
});
