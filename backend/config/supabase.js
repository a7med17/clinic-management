const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
// Use service_role key on the backend to bypass Row Level Security (RLS)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (!supabaseUrl || supabaseUrl.includes('your-project') || !supabaseKey || supabaseKey.includes('your-anon-key')) {
  console.warn('[WARN] Supabase is not fully configured. The server will use in-memory demo data for operations.');
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[INFO] Supabase client initialized successfully (service_role).');
  } catch (error) {
    console.error('[ERROR] Failed to initialize Supabase client:', error.message);
  }
}

module.exports = {
  supabase,
  isConfigured: () => !!supabase
};

