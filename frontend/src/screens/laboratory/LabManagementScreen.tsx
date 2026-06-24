// Placeholder laboratory module. The active lab workflow lives in RoleScreens until this becomes a dedicated feature.
import React from 'react';
import { StyleSheet, View, Text, SafeAreaView } from 'react-native';

export default function LabManagementScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Laboratory Management</Text>
        <Text style={styles.subtitle}>Placeholder for diagnostic test bookings, specimen tracking, and results entry.</Text>
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
