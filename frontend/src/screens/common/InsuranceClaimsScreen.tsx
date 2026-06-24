// Placeholder insurance-claims screen; claims processing has no backing workflow yet.
import React from 'react';
import { StyleSheet, View, Text, SafeAreaView } from 'react-native';

export default function InsuranceClaimsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Insurance Claims</Text>
        <Text style={styles.subtitle}>Placeholder for patient coverage status validation, claim submission pipelines, and payouts tracking.</Text>
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
