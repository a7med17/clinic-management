// Placeholder notifications hub; the phase-one notification screen currently uses static presentation data.
import React from 'react';
import { StyleSheet, View, Text, SafeAreaView } from 'react-native';

export default function NotificationsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Notifications Hub</Text>
        <Text style={styles.subtitle}>Placeholder for system logs, booking reminders, and stock warnings.</Text>
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
