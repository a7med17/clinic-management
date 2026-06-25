import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ActionCard,
  Content,
  ListRow,
  Screen,
  SearchBar,
  SectionHeader,
  StatCard,
  colors,
} from '../ui/ClinicComponents';
import { Role, roleProfiles } from '../ui/clinicData';
import { RoleShellConfig, ShellNavigationTarget, roleShellConfig } from './shellConfig';

type ShellUser = {
  name?: string;
  role?: Role;
};

type ApplicationShellScreenProps = {
  navigation: any;
  route?: any;
  user?: ShellUser | null;
};

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getRole(user?: ShellUser | null, route?: any): Role {
  return user?.role || route?.params?.user?.role || 'Patient';
}

function getDisplayName(role: Role, user?: ShellUser | null, route?: any): string {
  return user?.name || route?.params?.user?.name || roleProfiles[role].name;
}

function getFirstName(name: string): string {
  const withoutTitle = name.replace(/^(dr\.?|mr\.?|mrs\.?|ms\.?)\s+/i, '').trim();
  return withoutTitle.split(' ')[0] || name;
}

function getGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatShellDate(date: Date): string {
  return `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}`;
}

function navigateTo(navigation: any, target?: ShellNavigationTarget) {
  if (!target) return;

  const rootNavigation = navigation.getParent?.();
  const selectedNavigation = target.scope === 'root' && rootNavigation ? rootNavigation : navigation;
  selectedNavigation.navigate(target.name, target.params);
}

function renderActivityList(config: RoleShellConfig, navigation: any, section: 'todaysActivity' | 'recentActivity') {
  return config[section].map((item) => (
    <ListRow
      key={`${section}-${item.title}`}
      icon={item.icon}
      title={item.title}
      subtitle={item.subtitle}
      meta={item.meta}
      status={item.status}
      tone={item.tone}
      onPress={item.target ? () => navigateTo(navigation, item.target) : undefined}
    />
  ));
}

export default function ApplicationShellScreen({ navigation, route, user }: ApplicationShellScreenProps) {
  const role = getRole(user, route);
  const config = roleShellConfig[role];
  const displayName = getDisplayName(role, user, route);
  const now = new Date();

  return (
    <Screen>
      <Content>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.date}>{formatShellDate(now)}</Text>
            <Text style={styles.greeting}>{`${getGreeting(now)}, ${getFirstName(displayName)}`}</Text>
            <Text style={styles.subtitle}>{config.title}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
            style={styles.notificationButton}
            onPress={() => navigateTo(navigation, { name: 'Notifications', scope: 'root' })}
          >
            <Ionicons name="notifications-outline" size={21} color={colors.muted} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        <SearchBar placeholder={config.searchPlaceholder} />

        <SectionHeader title="Task Center" />
        <View style={styles.grid}>
          {config.taskCenter.map((item) => (
            <StatCard key={item.label} icon={item.icon} value={item.value} label={item.label} tone={item.tone} />
          ))}
        </View>

        <SectionHeader title="Quick Actions" />
        <View style={styles.grid}>
          {config.quickActions.map((action, index) => (
            <ActionCard
              key={action.title}
              large={index < 2}
              icon={action.icon}
              title={action.title}
              subtitle={action.subtitle}
              tone={action.tone}
              onPress={action.target ? () => navigateTo(navigation, action.target) : undefined}
            />
          ))}
        </View>

        <SectionHeader title="Today's Activity" />
        {renderActivityList(config, navigation, 'todaysActivity')}

        <SectionHeader title="Recent Activity" />
        {renderActivityList(config, navigation, 'recentActivity')}
      </Content>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },
  headerText: {
    flex: 1,
  },
  date: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 5,
  },
  greeting: {
    color: colors.ink,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 5,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.red,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});

