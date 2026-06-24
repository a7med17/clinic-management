// Reusable visual primitives for the phase-one role screens. They standardize spacing, color, and interaction states.
import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Semantic color names keep role screens from scattering raw design tokens.
export const colors = {
  bg: '#f6f8fb',
  surface: '#ffffff',
  ink: '#071224',
  muted: '#5d6b82',
  faint: '#edf1f6',
  line: '#e5e9f0',
  teal: '#00a99d',
  blue: '#2463ff',
  red: '#f0064f',
  orange: '#ff7a1a',
  green: '#08a94f',
  purple: '#8b5cf6',
};

export function Screen({ children }: { children: React.ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

export function Content({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {children}
    </ScrollView>
  );
}

// Consistent screen heading with an optional identity marker and notification shortcut.
export function Header({
  title,
  subtitle,
  navigation,
  avatar,
}: {
  title: string;
  subtitle?: string;
  navigation: any;
  avatar?: string;
}) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        {subtitle ? <Text style={styles.headerSub}>{subtitle}</Text> : null}
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      {avatar ? (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatar}</Text>
        </View>
      ) : null}
      <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Notifications')}>
        <Ionicons name="notifications-outline" size={20} color={colors.muted} />
      </TouchableOpacity>
    </View>
  );
}

export function SectionHeader({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <TouchableOpacity onPress={onPress}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function StatCard({ icon, value, label, tone = colors.teal }: { icon: any; value: string; label: string; tone?: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.softIcon, { backgroundColor: `${tone}12` }]}>
        <Ionicons name={icon} size={19} color={tone} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function ActionCard({
  icon,
  title,
  subtitle,
  tone = colors.blue,
  large,
  onPress,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  tone?: string;
  large?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[styles.actionCard, large && styles.actionCardLarge]}
    >
      <View style={[styles.actionIcon, { backgroundColor: `${tone}14` }]}>
        <Ionicons name={icon} size={22} color={tone} />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
      {subtitle ? <Text style={[styles.actionSub, { color: tone }]}>{subtitle}</Text> : null}
    </TouchableOpacity>
  );
}

// Generic, pressable record row; a status renders as a badge while ordinary rows show a disclosure affordance.
export function ListRow({
  icon,
  title,
  subtitle,
  meta,
  status,
  tone = colors.teal,
  onPress,
}: {
  icon?: any;
  title: string;
  subtitle?: string;
  meta?: string;
  status?: string;
  tone?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={styles.rowCard}>
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: `${tone}12` }]}>
          <Ionicons name={icon} size={20} color={tone} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
        {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
      </View>
      {status ? (
        <View style={[styles.badge, { backgroundColor: `${tone}12` }]}>
          <Text style={[styles.badgeText, { color: tone }]}>{status}</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color="#b7c0cd" />
      )}
    </TouchableOpacity>
  );
}

export function SearchBar({ placeholder = 'Search patient by name or ID...' }: { placeholder?: string }) {
  return (
    <View style={styles.search}>
      <Ionicons name="search" size={20} color="#9aa5b5" />
      <TextInput placeholder={placeholder} placeholderTextColor="#8b97a8" style={styles.searchInput} />
    </View>
  );
}

// Lightweight visual trend card used for summary reporting; bar values are illustrative, not live chart data.
export function ChartCard({ title, value, meta, accent }: { title: string; value: string; meta: string; accent: string }) {
  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowSub}>{meta}</Text>
        </View>
        <Text style={[styles.chartValue, { color: accent }]}>{value}</Text>
      </View>
      <View style={styles.bars}>
        {[35, 58, 42, 76, 66, 90].map((height, index) => (
          <View key={`${title}-${index}`} style={[styles.bar, { height, backgroundColor: `${accent}${index % 2 ? '66' : 'cc'}` }]} />
        ))}
      </View>
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 18 : 34,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 22,
  },
  headerSub: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 4,
  },
  headerTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '800',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e6fbf7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.teal,
    fontWeight: '800',
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionAction: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: '800',
  },
  statCard: {
    width: '48%',
    minHeight: 116,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  softIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  statValue: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  actionCard: {
    width: '48%',
    minHeight: 100,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  actionCardLarge: {
    minHeight: 116,
    justifyContent: 'space-between',
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  actionSub: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  rowCard: {
    minHeight: 76,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 7,
    elevation: 2,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  rowSub: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },
  rowMeta: {
    color: '#8792a2',
    fontSize: 11,
    marginTop: 4,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  search: {
    height: 54,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.ink,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 14,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  chartValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  bars: {
    height: 100,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 18,
  },
  bar: {
    flex: 1,
    borderRadius: 8,
  },
});
