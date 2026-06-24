// Admin-only operational APIs: dashboard metrics, user lifecycle management, and staff availability.
const bcrypt = require('bcryptjs');
const { successResponse, errorResponse } = require('../utils/response');
const { supabase } = require('../config/supabase');

// Keep role values aligned with the users.role database constraint and frontend Role union.
const ROLES = ['Admin', 'Doctor', 'Patient', 'Receptionist', 'Pharmacist', 'Laboratory Staff'];
const STAFF_ROLES = ['Doctor', 'Receptionist', 'Pharmacist', 'Laboratory Staff'];

// Reused inclusive/exclusive date range prevents overlap between adjacent daily reports.
const getTodayBounds = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
};

// Controllers use this guard to fail predictably when Supabase was not configured at startup.
const ensureDb = (res) => {
  if (!supabase) {
    errorResponse(res, 'Database is not configured.', 503);
    return false;
  }
  return true;
};

// Use count-only queries for dashboard cards so aggregate data is not transferred unnecessarily.
const countRows = async (table, applyFilters = (query) => query) => {
  const query = applyFilters(supabase.from(table).select('id', { count: 'exact', head: true }));
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
};

const hashPassword = async (password) => bcrypt.hash(password, await bcrypt.genSalt(12));
const normalizeSearch = (value) => typeof value === 'string'
  ? value.trim().replace(/[(),]/g, '').slice(0, 100)
  : '';

// Fetch independent dashboard aggregates concurrently to keep the admin landing screen responsive.
const getDashboardMetrics = async (req, res, next) => {
  try {
    if (!ensureDb(res)) return;

    const { start, end } = getTodayBounds();
    const [
      totalPatients,
      totalDoctors,
      todaysAppointments,
      pendingBills,
      activeStaff,
      waitingPatients,
      completedAppointments
    ] = await Promise.all([
      countRows('patients'),
      countRows('doctors'),
      countRows('appointments', (query) => query.gte('appointment_date', start).lt('appointment_date', end)),
      countRows('invoices', (query) => query.in('status', ['Unpaid', 'Partially Paid'])),
      countRows('users', (query) => query.eq('is_active', true).in('role', STAFF_ROLES)),
      countRows('appointments', (query) => query.in('status', ['Checked In', 'In Consultation']).gte('appointment_date', start).lt('appointment_date', end)),
      countRows('appointments', (query) => query.eq('status', 'Completed').gte('appointment_date', start).lt('appointment_date', end))
    ]);

    return successResponse(res, 'Admin dashboard metrics retrieved successfully', {
      cards: { totalPatients, totalDoctors, todaysAppointments, pendingBills },
      summary: {
        activeStaff,
        waitingPatients,
        completedAppointments,
        systemStatus: 'Operational'
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ADMIN] Dashboard metrics error:', error.message);
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    if (!ensureDb(res)) return;

    const { role, status } = req.query;
    const search = normalizeSearch(req.query.search);
    let query = supabase
      .from('users')
      .select('id, email, name, role, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (role && ROLES.includes(role)) query = query.eq('role', role);
    if (status === 'active') query = query.eq('is_active', true);
    if (status === 'inactive') query = query.eq('is_active', false);
    if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) return errorResponse(res, 'Failed to retrieve users.', 500, error.message);
    return successResponse(res, 'Users retrieved successfully', data || []);
  } catch (error) {
    next(error);
  }
};

// Creates the account first, then the role-specific record needed by patient/doctor workflows.
const createUser = async (req, res, next) => {
  try {
    if (!ensureDb(res)) return;

    const { email, password, name, role } = req.body;
    if (!email || !password || !name || !role) {
      return errorResponse(res, 'Email, password, name, and role are required.', 400);
    }
    if (!ROLES.includes(role)) {
      return errorResponse(res, `Invalid role. Must be one of: ${ROLES.join(', ')}`, 400);
    }
    if (password.length < 6) {
      return errorResponse(res, 'Password must be at least 6 characters.', 400);
    }

    const formattedEmail = email.toLowerCase().trim();
    const { data: existingUser, error: lookupError } = await supabase
      .from('users')
      .select('id')
      .eq('email', formattedEmail)
      .maybeSingle();

    if (lookupError) return errorResponse(res, 'Failed to validate user email.', 500, lookupError.message);
    if (existingUser) return errorResponse(res, 'A user with this email already exists.', 409);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: formattedEmail,
        password_hash: await hashPassword(password),
        name: name.trim(),
        role
      })
      .select('id, email, name, role, is_active, created_at, updated_at')
      .single();

    if (error) return errorResponse(res, 'Failed to create user.', 500, error.message);

    if (role === 'Patient') {
      await supabase.from('patients').insert({ user_id: user.id, name: user.name, email: user.email });
    }
    if (role === 'Doctor') {
      await supabase.from('doctors').insert({
        user_id: user.id,
        name: user.name,
        email: user.email,
        specialization: req.body.specialization || 'General Practice',
        phone: req.body.phone || null,
        license_number: req.body.license_number || null,
        consultation_fee: req.body.consultation_fee || null
      });
    }

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: `ADMIN_CREATE_USER: ${user.email}`,
      table_name: 'users'
    });

    return successResponse(res, 'User created successfully', user, 201);
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    if (!ensureDb(res)) return;

    const { name, role, email } = req.body;
    const updateData = { updated_at: new Date().toISOString() };

    if (name !== undefined) {
      if (!String(name).trim()) return errorResponse(res, 'Name cannot be empty.', 400);
      updateData.name = String(name).trim();
    }
    if (email !== undefined) {
      if (!String(email).trim()) return errorResponse(res, 'Email cannot be empty.', 400);
      updateData.email = String(email).toLowerCase().trim();
    }
    if (role !== undefined) {
      if (!ROLES.includes(role)) return errorResponse(res, `Invalid role. Must be one of: ${ROLES.join(', ')}`, 400);
      if (req.params.id === req.user.id && role !== 'Admin') return errorResponse(res, 'You cannot remove your own Admin role.', 400);
      updateData.role = role;
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.params.id)
      .select('id, email, name, role, is_active, created_at, updated_at')
      .single();

    if (error?.code === '23505') return errorResponse(res, 'A user with this email already exists.', 409);
    if (error || !user) return errorResponse(res, 'User not found or update failed.', 404);
    return successResponse(res, 'User updated successfully', user);
  } catch (error) {
    next(error);
  }
};

const updateUserStatus = async (req, res, next) => {
  try {
    if (!ensureDb(res)) return;

    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') return errorResponse(res, 'is_active boolean is required.', 400);
    if (req.params.id === req.user.id && !is_active) return errorResponse(res, 'You cannot deactivate your own account.', 400);

    const { data: user, error } = await supabase
      .from('users')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('id, email, name, role, is_active, created_at, updated_at')
      .single();

    if (error || !user) return errorResponse(res, 'User not found or status update failed.', 404);
    return successResponse(res, 'User status updated successfully', user);
  } catch (error) {
    next(error);
  }
};

const resetUserPassword = async (req, res, next) => {
  try {
    if (!ensureDb(res)) return;

    const { password } = req.body;
    if (!password || password.length < 6) return errorResponse(res, 'New password must be at least 6 characters.', 400);

    const { data: user, error } = await supabase
      .from('users')
      .update({ password_hash: await hashPassword(password), updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('id, email, name, role, is_active, created_at, updated_at')
      .single();

    if (error || !user) return errorResponse(res, 'User not found or password reset failed.', 404);
    return successResponse(res, 'User password reset successfully', user);
  } catch (error) {
    next(error);
  }
};

// Availability is derived from account state, doctor availability, and active appointments—not stored separately.
const getActiveStaff = async (req, res, next) => {
  try {
    if (!ensureDb(res)) return;

    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name, role, is_active')
      .in('role', STAFF_ROLES)
      .eq('is_active', true)
      .order('role', { ascending: true });

    if (error) return errorResponse(res, 'Failed to retrieve active staff.', 500, error.message);

    const doctorUserIds = (users || []).filter((user) => user.role === 'Doctor').map((user) => user.id);
    let doctorProfiles = [];
    let busyDoctorIds = new Set();

    if (doctorUserIds.length) {
      const { start, end } = getTodayBounds();
      const { data: doctors } = await supabase
        .from('doctors')
        .select('id, user_id, is_available')
        .in('user_id', doctorUserIds);

      doctorProfiles = doctors || [];
      const doctorIds = doctorProfiles.map((doctor) => doctor.id);
      if (doctorIds.length) {
        const { data: appointments } = await supabase
          .from('appointments')
          .select('doctor_id')
          .in('doctor_id', doctorIds)
          .in('status', ['Checked In', 'In Consultation'])
          .gte('appointment_date', start)
          .lt('appointment_date', end);
        busyDoctorIds = new Set((appointments || []).map((appointment) => appointment.doctor_id));
      }
    }

    const staff = (users || []).map((user) => {
      const doctor = doctorProfiles.find((profile) => profile.user_id === user.id);
      const busy = doctor ? busyDoctorIds.has(doctor.id) : false;
      return {
        id: user.id,
        name: user.name,
        role: user.role,
        email: user.email,
        is_active: user.is_active,
        availability: user.role === 'Doctor'
          ? (busy ? 'Busy' : doctor?.is_available === false ? 'Unavailable' : 'Available')
          : 'Available'
      };
    });

    return successResponse(res, 'Active staff retrieved successfully', staff);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardMetrics,
  getUsers,
  createUser,
  updateUser,
  updateUserStatus,
  resetUserPassword,
  getActiveStaff
};
