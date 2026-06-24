// Navigation composition: public authentication screens, role-specific tabs, and shared detail screens.
import React from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import {
  ManagementScreen,
  ModuleDetailScreen,
  NotificationsScreen,
  ActiveStaffScreen,
  AdminUsersScreen,
  AppSettingsScreen,
  ChangePasswordScreen,
  HelpSupportScreen,
  DoctorAppointmentDetailScreen,
  DoctorLabTestsScreen,
  DoctorPatientDetailScreen,
  NotificationSettingsScreen,
  PatientAppointmentDetailScreen,
  PatientBookAppointmentScreen,
  PatientLabResultsScreen,
  ProfileInformationScreen,
  ProfileScreen,
  ReceptionAppointmentDetailScreen,
  ReceptionAppointmentFormScreen,
  ReceptionInvoiceFormScreen,
  ReceptionInvoicePaymentScreen,
  ReceptionPatientFormScreen,
  ReceptionWaitingRoomScreen,
  ReportsScreen,
  RoleDashboardScreen,
  RoleListScreen,
} from '../screens/phase1/RoleScreens';
import { Role } from '../ui/clinicData';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');

// Each role declares only the tabs it is allowed to see; screens receive the signed-in user as route params.
type TabConfig = {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  component: React.ComponentType<any>;
};

// Navigation visibility is a UI concern; the backend remains the source of authorization enforcement.
const ROLE_TABS: Record<Role, TabConfig[]> = {
  Admin: [
    { name: 'Dashboard', label: 'Dashboard', icon: 'grid-outline', component: RoleDashboardScreen },
    { name: 'Management', label: 'Management', icon: 'construct-outline', component: ManagementScreen },
    { name: 'Reports', label: 'Reports', icon: 'analytics-outline', component: ReportsScreen },
    { name: 'Profile', label: 'Profile', icon: 'person-outline', component: ProfileScreen },
  ],
  Doctor: [
    { name: 'Dashboard', label: 'Dashboard', icon: 'grid-outline', component: RoleDashboardScreen },
    { name: 'Schedule', label: 'Schedule', icon: 'calendar-outline', component: RoleListScreen },
    { name: 'Patients', label: 'Patients', icon: 'people-outline', component: RoleListScreen },
    { name: 'Profile', label: 'Profile', icon: 'person-outline', component: ProfileScreen },
  ],
  Patient: [
    { name: 'Home', label: 'Home', icon: 'home-outline', component: RoleDashboardScreen },
    { name: 'Appointments', label: 'Appointments', icon: 'calendar-outline', component: RoleListScreen },
    { name: 'Records', label: 'Records', icon: 'document-text-outline', component: RoleListScreen },
    { name: 'Profile', label: 'Profile', icon: 'person-outline', component: ProfileScreen },
  ],
  Receptionist: [
    { name: 'Dashboard', label: 'Dashboard', icon: 'grid-outline', component: RoleDashboardScreen },
    { name: 'Patients', label: 'Patients', icon: 'people-outline', component: RoleListScreen },
    { name: 'Appointments', label: 'Appointments', icon: 'calendar-outline', component: RoleListScreen },
    { name: 'Billing', label: 'Billing', icon: 'cash-outline', component: RoleListScreen },
    { name: 'Profile', label: 'Profile', icon: 'person-outline', component: ProfileScreen },
  ],
  Pharmacist: [
    { name: 'Dashboard', label: 'Dashboard', icon: 'grid-outline', component: RoleDashboardScreen },
    { name: 'Inventory', label: 'Inventory', icon: 'cube-outline', component: RoleListScreen },
    { name: 'Medicines', label: 'Medicines', icon: 'bandage-outline', component: RoleListScreen },
    { name: 'Alerts', label: 'Alerts', icon: 'notifications-outline', component: RoleListScreen },
    { name: 'Profile', label: 'Profile', icon: 'person-outline', component: ProfileScreen },
  ],
  'Laboratory Staff': [
    { name: 'Dashboard', label: 'Dashboard', icon: 'grid-outline', component: RoleDashboardScreen },
    { name: 'Tests', label: 'Tests', icon: 'flask-outline', component: RoleListScreen },
    { name: 'Results', label: 'Results', icon: 'document-attach-outline', component: RoleListScreen },
    { name: 'Profile', label: 'Profile', icon: 'person-outline', component: ProfileScreen },
  ],
};

// Custom tab bar mirrors React Navigation's tabPress event so listeners/preventDefault continue to work.
function CustomTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={styles.tabShell}>
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const options = descriptors[route.key].options;
          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <TouchableOpacity key={route.key} activeOpacity={0.78} style={styles.tabButton} onPress={onPress}>
              <View style={[styles.tabIconWrap, focused && styles.tabIconActive]}>
                <Ionicons name={options.tabBarIconName} size={21} color={focused ? '#004b46' : '#d7e8e5'} />
              </View>
              <Text numberOfLines={1} style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                {options.tabBarLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Resolve the authenticated role once, then render its compact tab set with the same user context.
function MainTabNavigator({ route }: any) {
  const user = route.params?.user;
  const role: Role = user?.role || 'Patient';
  const tabs = ROLE_TABS[role] || ROLE_TABS.Patient;

  return (
    <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      {tabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          initialParams={{ user }}
          options={{ tabBarLabel: tab.label, tabBarIconName: tab.icon } as any}
        />
      ))}
    </Tab.Navigator>
  );
}

// Stack screens hold flows that drill beyond a tab; initialUser decides whether boot lands on Login or MainTabs.
export default function AppNavigator({ initialUser = null }: { initialUser?: any }) {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialUser ? 'MainTabs' : 'Login'} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} initialParams={{ user: initialUser }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
        <Stack.Screen name="ActiveStaff" component={ActiveStaffScreen} />
        <Stack.Screen name="ProfileInformation" component={ProfileInformationScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
        <Stack.Screen name="AppSettings" component={AppSettingsScreen} />
        <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
        <Stack.Screen name="DoctorAppointmentDetail" component={DoctorAppointmentDetailScreen} />
        <Stack.Screen name="DoctorPatientDetail" component={DoctorPatientDetailScreen} />
        <Stack.Screen name="DoctorLabTests" component={DoctorLabTestsScreen} />
        <Stack.Screen name="PatientAppointmentDetail" component={PatientAppointmentDetailScreen} />
        <Stack.Screen name="PatientBookAppointment" component={PatientBookAppointmentScreen} />
        <Stack.Screen name="PatientLabResults" component={PatientLabResultsScreen} />
        <Stack.Screen name="ReceptionPatientForm" component={ReceptionPatientFormScreen} />
        <Stack.Screen name="ReceptionAppointmentForm" component={ReceptionAppointmentFormScreen} />
        <Stack.Screen name="ReceptionAppointmentDetail" component={ReceptionAppointmentDetailScreen} />
        <Stack.Screen name="ReceptionWaitingRoom" component={ReceptionWaitingRoomScreen} />
        <Stack.Screen name="ReceptionInvoiceForm" component={ReceptionInvoiceFormScreen} />
        <Stack.Screen name="ReceptionInvoicePayment" component={ReceptionInvoicePaymentScreen} />
        <Stack.Screen name="ModuleDetail" component={ModuleDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabShell: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    paddingBottom: Platform.OS === 'ios' ? 18 : 12,
    paddingTop: 10,
    alignItems: 'center',
  },
  tabBar: {
    width: Math.min(width - 32, 430),
    minHeight: 68,
    borderRadius: 34,
    backgroundColor: '#004b46',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    shadowColor: '#003a36',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 10,
  },
  tabButton: {
    flex: 1,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  tabIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconActive: {
    backgroundColor: '#37d268',
  },
  tabLabel: {
    color: '#d7e8e5',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
    maxWidth: 74,
  },
  tabLabelActive: {
    color: '#37d268',
  },
});
