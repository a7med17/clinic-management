// Placeholder audit-log screen; no audit-log API is wired to this navigation surface yet.
import React from 'react';
import { StyleSheet, View, Text, SafeAreaView } from 'react-native';

export default function AuditLogsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Audit Logs</Text>
        <Text style={styles.subtitle}>Placeholder for tracking staff logins, resource edits, and database transaction queries.</Text>
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
