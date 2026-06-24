// Pharmacy inventory CRUD with stock and expiry filters for day-to-day dispensing decisions.
const { successResponse, errorResponse } = require('../utils/response');
const { supabase } = require('../config/supabase');

/**
 * GET /api/medicines
 * List all medicines in inventory
 */
const getAllMedicines = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    let query = supabase
      .from('medicines')
      .select('*')
      .order('name', { ascending: true });

    // Optional filters
    if (req.query.search) {
      query = query.ilike('name', `%${req.query.search}%`);
    }
    if (req.query.low_stock === 'true') {
      query = query.lte('quantity', 10);
    }
    if (req.query.expired === 'true') {
      query = query.lte('expiry_date', new Date().toISOString().slice(0, 10));
    }

    const { data, error } = await query;

    if (error) {
      console.error('[PHARMACY] Fetch error:', error.message);
      return errorResponse(res, 'Failed to retrieve medicines.', 500);
    }

    return successResponse(res, 'Medicines retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/medicines/:id
 * Get a single medicine
 */
const getMedicineById = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { data: medicine, error } = await supabase
      .from('medicines')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !medicine) {
      return errorResponse(res, 'Medicine not found.', 404);
    }

    return successResponse(res, 'Medicine retrieved successfully', medicine);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/medicines
 * Add a new medicine to inventory
 */
const createMedicine = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { name, quantity, price, expiry_date } = req.body;

    if (!name) {
      return errorResponse(res, 'Medicine name is required.', 400);
    }

    const { data: newMedicine, error } = await supabase
      .from('medicines')
      .insert({
        name: name.trim(),
        quantity: quantity || 0,
        price: price || null,
        expiry_date: expiry_date || null
      })
      .select('*')
      .single();

    if (error) {
      console.error('[PHARMACY] Create error:', error.message);
      return errorResponse(res, 'Failed to add medicine.', 500);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: `CREATE_MEDICINE: ${newMedicine.name} (qty: ${newMedicine.quantity})`,
      table_name: 'medicines'
    });

    return successResponse(res, 'Medicine added successfully', newMedicine, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/medicines/:id
 * Update a medicine (stock, price, etc.)
 */
const updateMedicine = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { name, quantity, price, expiry_date } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name.trim();
    if (quantity !== undefined) updateData.quantity = quantity;
    if (price !== undefined) updateData.price = price;
    if (expiry_date !== undefined) updateData.expiry_date = expiry_date;

    const { data: updatedMedicine, error } = await supabase
      .from('medicines')
      .update(updateData)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error || !updatedMedicine) {
      return errorResponse(res, 'Medicine not found or update failed.', 404);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: `UPDATE_MEDICINE: ${updatedMedicine.name}`,
      table_name: 'medicines'
    });

    return successResponse(res, 'Medicine updated successfully', updatedMedicine);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/medicines/:id
 * Remove a medicine from inventory
 */
const deleteMedicine = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { data: deletedMedicine, error } = await supabase
      .from('medicines')
      .delete()
      .eq('id', req.params.id)
      .select('id, name')
      .single();

    if (error || !deletedMedicine) {
      return errorResponse(res, 'Medicine not found.', 404);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: `DELETE_MEDICINE: ${deletedMedicine.name}`,
      table_name: 'medicines'
    });

    return successResponse(res, 'Medicine deleted successfully', deletedMedicine);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine
};
