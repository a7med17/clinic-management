// Legacy Admin-only user CRUD. The active frontend uses adminController's role portal endpoints.
const bcrypt = require('bcryptjs');
const { successResponse, errorResponse } = require('../utils/response');
const { supabase } = require('../config/supabase');

/**
 * GET /api/users
 * List all users (Admin only)
 */
const getAllUsers = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    let query = supabase
      .from('users')
      .select('id, email, name, role, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });

    // Optional filters
    if (req.query.role) {
      query = query.eq('role', req.query.role);
    }
    if (req.query.is_active !== undefined) {
      query = query.eq('is_active', req.query.is_active === 'true');
    }
    if (req.query.search) {
      query = query.or(`name.ilike.%${req.query.search}%,email.ilike.%${req.query.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[USERS] Fetch error:', error.message);
      return errorResponse(res, 'Failed to retrieve users.', 500);
    }

    return successResponse(res, 'Users retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/:id
 * Get a single user by ID (Admin only)
 */
const getUserById = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role, is_active, created_at, updated_at')
      .eq('id', req.params.id)
      .single();

    if (error || !user) {
      return errorResponse(res, 'User not found.', 404);
    }

    return successResponse(res, 'User retrieved successfully', user);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users
 * Create a new user (Admin only)
 */
const createUser = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { email, password, name, role } = req.body;

    if (!email || !password || !name || !role) {
      return errorResponse(res, 'Email, password, name, and role are required.', 400);
    }

    const validRoles = ['Admin', 'Doctor', 'Patient', 'Receptionist', 'Pharmacist', 'Laboratory Staff'];
    if (!validRoles.includes(role)) {
      return errorResponse(res, `Invalid role. Must be one of: ${validRoles.join(', ')}`, 400);
    }

    const formattedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', formattedEmail)
      .single();

    if (existingUser) {
      return errorResponse(res, 'A user with this email already exists.', 409);
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email: formattedEmail,
        password_hash: passwordHash,
        name: name.trim(),
        role
      })
      .select('id, email, name, role, is_active, created_at')
      .single();

    if (error) {
      console.error('[USERS] Create error:', error.message);
      return errorResponse(res, 'Failed to create user.', 500);
    }

    // Auto-create linked profile based on role
    if (role === 'Patient') {
      await supabase.from('patients').insert({
        user_id: newUser.id,
        name: newUser.name,
        email: newUser.email
      });
    } else if (role === 'Doctor') {
      const { specialization, license_number, phone, consultation_fee } = req.body;
      await supabase.from('doctors').insert({
        user_id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        specialization: specialization || 'General Practice',
        license_number: license_number || null,
        phone: phone || null,
        consultation_fee: consultation_fee || null
      });
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: `CREATE_USER: ${newUser.email} (${newUser.role})`,
      table_name: 'users'
    });

    return successResponse(res, 'User created successfully', newUser, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/:id
 * Update a user (Admin only)
 */
const updateUser = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { name, role, is_active } = req.body;
    const updateData = { updated_at: new Date().toISOString() };

    if (name !== undefined) updateData.name = name.trim();
    if (role !== undefined) {
      const validRoles = ['Admin', 'Doctor', 'Patient', 'Receptionist', 'Pharmacist', 'Laboratory Staff'];
      if (!validRoles.includes(role)) {
        return errorResponse(res, `Invalid role. Must be one of: ${validRoles.join(', ')}`, 400);
      }
      updateData.role = role;
    }
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.params.id)
      .select('id, email, name, role, is_active, updated_at')
      .single();

    if (error || !updatedUser) {
      return errorResponse(res, 'User not found or update failed.', 404);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: `UPDATE_USER: ${updatedUser.email}`,
      table_name: 'users'
    });

    return successResponse(res, 'User updated successfully', updatedUser);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/:id
 * Soft-delete a user by setting is_active = false (Admin only)
 */
const deleteUser = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    // Prevent self-deletion
    if (req.params.id === req.user.id) {
      return errorResponse(res, 'You cannot deactivate your own account.', 400);
    }

    const { data: deactivatedUser, error } = await supabase
      .from('users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('id, email, name, role')
      .single();

    if (error || !deactivatedUser) {
      return errorResponse(res, 'User not found.', 404);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: `DEACTIVATE_USER: ${deactivatedUser.email}`,
      table_name: 'users'
    });

    return successResponse(res, 'User deactivated successfully', deactivatedUser);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
