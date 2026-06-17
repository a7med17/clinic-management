const { successResponse, errorResponse } = require('../utils/response');
const { supabase } = require('../config/supabase');

// ---------- INVOICES ----------

/**
 * GET /api/billing/invoices
 * List all invoices with patient info
 */
const getAllInvoices = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    let query = supabase
      .from('invoices')
      .select(`
        *,
        patients:patient_id ( id, name, email, phone ),
        appointments:appointment_id ( id, appointment_date, status )
      `)
      .order('created_at', { ascending: false });

    // Optional filters
    if (req.query.status) {
      query = query.eq('status', req.query.status);
    }
    if (req.query.patient_id) {
      query = query.eq('patient_id', req.query.patient_id);
    }

    // Patients see only their own invoices
    if (req.user.role === 'Patient') {
      const { data: patientRecord } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (patientRecord) {
        query = query.eq('patient_id', patientRecord.id);
      } else {
        return successResponse(res, 'No invoices found', []);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('[BILLING] Fetch invoices error:', error.message);
      return errorResponse(res, 'Failed to retrieve invoices.', 500);
    }

    return successResponse(res, 'Invoices retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/billing/invoices/:id
 * Get a single invoice with items and payments
 */
const getInvoiceById = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        patients:patient_id ( id, name, email, phone ),
        appointments:appointment_id ( id, appointment_date, status )
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !invoice) {
      return errorResponse(res, 'Invoice not found.', 404);
    }

    // Fetch items
    const { data: items } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice.id);

    // Fetch payments
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', invoice.id)
      .order('payment_date', { ascending: false });

    return successResponse(res, 'Invoice retrieved successfully', {
      ...invoice,
      items: items || [],
      payments: payments || []
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/billing/invoices
 * Create a new invoice with optional items
 */
const createInvoice = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { patient_id, appointment_id, due_date, items } = req.body;

    if (!patient_id || !due_date) {
      return errorResponse(res, 'patient_id and due_date are required.', 400);
    }

    // Generate invoice number (INV-YYYYMMDD-XXXX)
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;

    // Calculate total from items if provided
    let totalAmount = 0;
    if (items && Array.isArray(items)) {
      totalAmount = items.reduce((sum, item) => {
        const itemTotal = (item.quantity || 1) * (item.unit_price || 0);
        return sum + itemTotal;
      }, 0);
    }

    // Insert invoice
    const { data: newInvoice, error } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        patient_id,
        appointment_id: appointment_id || null,
        total_amount: totalAmount,
        status: 'Unpaid',
        due_date
      })
      .select('*')
      .single();

    if (error) {
      console.error('[BILLING] Create invoice error:', error.message);
      return errorResponse(res, 'Failed to create invoice.', 500);
    }

    // Insert items if provided
    if (items && Array.isArray(items) && items.length > 0) {
      const invoiceItems = items.map(item => ({
        invoice_id: newInvoice.id,
        item_name: item.item_name,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        total_price: (item.quantity || 1) * (item.unit_price || 0)
      }));

      await supabase.from('invoice_items').insert(invoiceItems);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: `CREATE_INVOICE: ${invoiceNumber}`,
      table_name: 'invoices'
    });

    return successResponse(res, 'Invoice created successfully', newInvoice, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/billing/invoices/:id
 * Update invoice status or amounts
 */
const updateInvoice = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { status, total_amount, due_date } = req.body;
    const updateData = { updated_at: new Date().toISOString() };

    if (status !== undefined) {
      const validStatuses = ['Unpaid', 'Paid', 'Partially Paid', 'Refunded'];
      if (!validStatuses.includes(status)) {
        return errorResponse(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
      }
      updateData.status = status;
    }
    if (total_amount !== undefined) updateData.total_amount = total_amount;
    if (due_date !== undefined) updateData.due_date = due_date;

    const { data: updatedInvoice, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error || !updatedInvoice) {
      return errorResponse(res, 'Invoice not found or update failed.', 404);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: `UPDATE_INVOICE: ${updatedInvoice.invoice_number}`,
      table_name: 'invoices'
    });

    return successResponse(res, 'Invoice updated successfully', updatedInvoice);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/billing/invoices/:id
 * Delete an invoice (cascades to items)
 */
const deleteInvoice = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { data: deletedInvoice, error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', req.params.id)
      .select('id, invoice_number')
      .single();

    if (error || !deletedInvoice) {
      return errorResponse(res, 'Invoice not found.', 404);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: `DELETE_INVOICE: ${deletedInvoice.invoice_number}`,
      table_name: 'invoices'
    });

    return successResponse(res, 'Invoice deleted successfully', deletedInvoice);
  } catch (error) {
    next(error);
  }
};

// ---------- INVOICE ITEMS ----------

/**
 * POST /api/billing/invoices/:invoiceId/items
 * Add an item to an invoice
 */
const addInvoiceItem = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { item_name, quantity, unit_price } = req.body;

    if (!item_name) {
      return errorResponse(res, 'item_name is required.', 400);
    }

    const qty = quantity || 1;
    const price = unit_price || 0;
    const totalPrice = qty * price;

    const { data: newItem, error } = await supabase
      .from('invoice_items')
      .insert({
        invoice_id: req.params.invoiceId,
        item_name,
        quantity: qty,
        unit_price: price,
        total_price: totalPrice
      })
      .select('*')
      .single();

    if (error) {
      console.error('[BILLING] Add item error:', error.message);
      return errorResponse(res, 'Failed to add invoice item.', 500);
    }

    // Recalculate invoice total
    const { data: allItems } = await supabase
      .from('invoice_items')
      .select('total_price')
      .eq('invoice_id', req.params.invoiceId);

    const newTotal = (allItems || []).reduce((sum, item) => sum + parseFloat(item.total_price || 0), 0);

    await supabase
      .from('invoices')
      .update({ total_amount: newTotal, updated_at: new Date().toISOString() })
      .eq('id', req.params.invoiceId);

    return successResponse(res, 'Invoice item added successfully', newItem, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/billing/invoices/:invoiceId/items/:itemId
 * Remove an item from an invoice
 */
const removeInvoiceItem = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { data: deletedItem, error } = await supabase
      .from('invoice_items')
      .delete()
      .eq('id', req.params.itemId)
      .eq('invoice_id', req.params.invoiceId)
      .select('id, total_price')
      .single();

    if (error || !deletedItem) {
      return errorResponse(res, 'Invoice item not found.', 404);
    }

    // Recalculate invoice total
    const { data: allItems } = await supabase
      .from('invoice_items')
      .select('total_price')
      .eq('invoice_id', req.params.invoiceId);

    const newTotal = (allItems || []).reduce((sum, item) => sum + parseFloat(item.total_price || 0), 0);

    await supabase
      .from('invoices')
      .update({ total_amount: newTotal, updated_at: new Date().toISOString() })
      .eq('id', req.params.invoiceId);

    return successResponse(res, 'Invoice item removed successfully', deletedItem);
  } catch (error) {
    next(error);
  }
};

// ---------- PAYMENTS ----------

/**
 * POST /api/billing/invoices/:invoiceId/payments
 * Record a payment against an invoice
 */
const recordPayment = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { amount, payment_method } = req.body;

    if (!amount || amount <= 0) {
      return errorResponse(res, 'A positive payment amount is required.', 400);
    }

    const validMethods = ['Cash', 'Card', 'Insurance', 'Bank Transfer'];
    if (!payment_method || !validMethods.includes(payment_method)) {
      return errorResponse(res, `payment_method must be one of: ${validMethods.join(', ')}`, 400);
    }

    // Get the invoice
    const { data: invoice } = await supabase
      .from('invoices')
      .select('id, total_amount, status')
      .eq('id', req.params.invoiceId)
      .single();

    if (!invoice) {
      return errorResponse(res, 'Invoice not found.', 404);
    }

    // Record payment
    const { data: newPayment, error } = await supabase
      .from('payments')
      .insert({
        invoice_id: req.params.invoiceId,
        amount,
        payment_method
      })
      .select('*')
      .single();

    if (error) {
      console.error('[BILLING] Payment error:', error.message);
      return errorResponse(res, 'Failed to record payment.', 500);
    }

    // Calculate total paid and update invoice status
    const { data: allPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('invoice_id', req.params.invoiceId);

    const totalPaid = (allPayments || []).reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const invoiceTotal = parseFloat(invoice.total_amount);

    let newStatus = 'Unpaid';
    if (totalPaid >= invoiceTotal) {
      newStatus = 'Paid';
    } else if (totalPaid > 0) {
      newStatus = 'Partially Paid';
    }

    await supabase
      .from('invoices')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', req.params.invoiceId);

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: `RECORD_PAYMENT: ${amount} via ${payment_method} for invoice ${req.params.invoiceId}`,
      table_name: 'payments'
    });

    return successResponse(res, 'Payment recorded successfully', {
      payment: newPayment,
      invoice_status: newStatus,
      total_paid: totalPaid,
      remaining: Math.max(0, invoiceTotal - totalPaid)
    }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/billing/invoices/:invoiceId/payments
 * Get all payments for an invoice
 */
const getPayments = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', req.params.invoiceId)
      .order('payment_date', { ascending: false });

    if (error) {
      console.error('[BILLING] Get payments error:', error.message);
      return errorResponse(res, 'Failed to retrieve payments.', 500);
    }

    return successResponse(res, 'Payments retrieved successfully', data || []);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  addInvoiceItem,
  removeInvoiceItem,
  recordPayment,
  getPayments
};
