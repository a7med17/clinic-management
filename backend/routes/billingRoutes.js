const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  addInvoiceItem,
  removeInvoiceItem,
  recordPayment,
  getPayments
} = require('../controllers/billingController');

const router = express.Router();

// All billing routes require authentication
router.use(authMiddleware);

// ---------- INVOICES ----------

/**
 * @route   GET /api/billing/invoices
 * @desc    List all invoices (Patients see own only)
 * @access  Admin, Receptionist, Doctor (read), Patient (own)
 */
router.get('/invoices', getAllInvoices);

/**
 * @route   GET /api/billing/invoices/:id
 * @desc    Get invoice with items and payments
 * @access  Admin, Receptionist, Doctor, Patient (own)
 */
router.get('/invoices/:id', getInvoiceById);

/**
 * @route   POST /api/billing/invoices
 * @desc    Create a new invoice
 * @access  Admin, Receptionist
 */
router.post('/invoices', roleMiddleware(['Admin', 'Receptionist']), createInvoice);

/**
 * @route   PUT /api/billing/invoices/:id
 * @desc    Update invoice status or details
 * @access  Admin, Receptionist
 */
router.put('/invoices/:id', roleMiddleware(['Admin', 'Receptionist']), updateInvoice);

/**
 * @route   DELETE /api/billing/invoices/:id
 * @desc    Delete an invoice
 * @access  Admin
 */
router.delete('/invoices/:id', roleMiddleware(['Admin']), deleteInvoice);

// ---------- INVOICE ITEMS ----------

/**
 * @route   POST /api/billing/invoices/:invoiceId/items
 * @desc    Add item to invoice
 * @access  Admin, Receptionist
 */
router.post('/invoices/:invoiceId/items', roleMiddleware(['Admin', 'Receptionist']), addInvoiceItem);

/**
 * @route   DELETE /api/billing/invoices/:invoiceId/items/:itemId
 * @desc    Remove item from invoice
 * @access  Admin, Receptionist
 */
router.delete('/invoices/:invoiceId/items/:itemId', roleMiddleware(['Admin', 'Receptionist']), removeInvoiceItem);

// ---------- PAYMENTS ----------

/**
 * @route   GET /api/billing/invoices/:invoiceId/payments
 * @desc    Get all payments for an invoice
 * @access  Admin, Receptionist, Patient (own)
 */
router.get('/invoices/:invoiceId/payments', getPayments);

/**
 * @route   POST /api/billing/invoices/:invoiceId/payments
 * @desc    Record a payment
 * @access  Admin, Receptionist
 */
router.post('/invoices/:invoiceId/payments', roleMiddleware(['Admin', 'Receptionist']), recordPayment);

module.exports = router;
