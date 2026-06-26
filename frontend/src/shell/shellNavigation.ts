import { Role } from '../ui/clinicData';

export type ShellNavigationTarget = {
  name: string;
  params?: Record<string, unknown>;
  scope?: 'current' | 'root';
};

type TargetedShellItem = {
  title?: string;
  label?: string;
  target?: ShellNavigationTarget;
};

type ShellTargetConfig = {
  taskCenter: readonly TargetedShellItem[];
  quickActions: readonly TargetedShellItem[];
  todaysActivity: readonly TargetedShellItem[];
  recentActivity: readonly TargetedShellItem[];
};

const ROOT_STACK_ROUTES = [
  'Login',
  'Register',
  'MainTabs',
  'Notifications',
  'AdminUsers',
  'ActiveStaff',
  'ProfileInformation',
  'ChangePassword',
  'NotificationSettings',
  'AppSettings',
  'HelpSupport',
  'AppointmentDetails',
  'ConsultationHistory',
  'DoctorPatientDetail',
  'DoctorLabTests',
  'DoctorPrescription',
  'LabRequestDetail',
  'PatientBookAppointment',
  'PatientLabResults',
  'ReceptionPatientForm',
  'ReceptionAppointmentForm',
  'ReceptionWaitingRoom',
  'ReceptionInvoiceForm',
  'ReceptionInvoicePayment',
  'ModuleDetail',
] as const;

const ROLE_TAB_ROUTES: Record<Role, readonly string[]> = {
  Admin: ['Dashboard', 'Management', 'Reports', 'Profile'],
  Doctor: ['Dashboard', 'Schedule', 'Patients', 'Profile'],
  Patient: ['Home', 'Appointments', 'Records', 'Profile'],
  Receptionist: ['Dashboard', 'Patients', 'Appointments', 'Billing', 'Profile'],
  Pharmacist: ['Dashboard', 'Inventory', 'Medicines', 'Alerts', 'Profile'],
  'Laboratory Staff': ['Dashboard', 'Queue', 'Profile'],
};

const warnedShellTargets = new Set<string>();
const warnedTabInvariants = new Set<string>();

export function isRootStackRoute(routeName: string): boolean {
  return ROOT_STACK_ROUTES.includes(routeName as typeof ROOT_STACK_ROUTES[number]);
}

export function isRoleTabRoute(role: Role, routeName: string): boolean {
  return ROLE_TAB_ROUTES[role].includes(routeName);
}

export function isValidShellTarget(role: Role, target?: ShellNavigationTarget | null): boolean {
  if (!target?.name) return false;
  return target.scope === 'root' ? isRootStackRoute(target.name) : isRoleTabRoute(role, target.name);
}

export function getSafeShellTarget(role: Role, target?: ShellNavigationTarget | null): ShellNavigationTarget | null {
  return isValidShellTarget(role, target) ? target ?? null : null;
}

export function navigateToShellTarget(
  navigation: any,
  role: Role,
  target?: ShellNavigationTarget | null,
  source = 'Shell',
): boolean {
  const safeTarget = getSafeShellTarget(role, target);

  if (!safeTarget) {
    warnOnce(`target:${role}:${source}:${target?.name || 'missing'}`, `[Shell Navigation] Ignored invalid target "${target?.name || 'missing'}" for ${role} from ${source}.`);
    return false;
  }

  const rootNavigation = navigation.getParent?.();
  const selectedNavigation = safeTarget.scope === 'root' ? rootNavigation : navigation;

  if (!selectedNavigation?.navigate) {
    warnOnce(`navigator:${role}:${source}:${safeTarget.name}`, `[Shell Navigation] Missing navigator for target "${safeTarget.name}" from ${source}.`);
    return false;
  }

  selectedNavigation.navigate(safeTarget.name, safeTarget.params);
  return true;
}

export function warnInvalidShellConfigTargets(role: Role, config: ShellTargetConfig): void {
  if (!__DEV__) return;

  const sections: Array<[keyof ShellTargetConfig, readonly TargetedShellItem[]]> = [
    ['taskCenter', config.taskCenter],
    ['quickActions', config.quickActions],
    ['todaysActivity', config.todaysActivity],
    ['recentActivity', config.recentActivity],
  ];

  sections.forEach(([sectionName, items]) => {
    items.forEach((item) => {
      if (!item.target || isValidShellTarget(role, item.target)) return;

      const itemName = item.title || item.label || 'Untitled item';
      warnOnce(
        `config:${role}:${sectionName}:${itemName}:${item.target.name}`,
        `[Shell Navigation] ${role} ${sectionName} item "${itemName}" references invalid target "${item.target.name}".`,
      );
    });
  });
}

export function warnRoleTabInvariantViolations(roleTabs: Record<Role, readonly { name: string }[]>): void {
  if (!__DEV__) return;

  Object.entries(roleTabs).forEach(([roleName, tabs]) => {
    const role = roleName as Role;
    const tabNames = tabs.map((tab) => tab.name);
    const profileIndex = tabNames.indexOf('Profile');

    if (tabNames.length > 5) {
      warnOnce(`tabs:${role}:count`, `[Role Tabs] ${role} has ${tabNames.length} tabs. Maximum allowed is 5.`);
    }

    if (profileIndex !== tabNames.length - 1) {
      warnOnce(`tabs:${role}:profile`, `[Role Tabs] ${role} must keep Profile as the last tab.`);
    }

    if (tabNames.includes('Notifications')) {
      warnOnce(`tabs:${role}:notifications`, `[Role Tabs] ${role} must not include Notifications as a bottom tab.`);
    }

    tabNames.forEach((tabName) => {
      if (!isRoleTabRoute(role, tabName)) {
        warnOnce(`tabs:${role}:route:${tabName}`, `[Role Tabs] ${role} includes unexpected tab route "${tabName}".`);
      }
    });
  });
}

function warnOnce(key: string, message: string): void {
  if (!__DEV__ || warnedShellTargets.has(key) || warnedTabInvariants.has(key)) return;

  if (key.startsWith('tabs:')) {
    warnedTabInvariants.add(key);
  } else {
    warnedShellTargets.add(key);
  }

  console.warn(message);
}
