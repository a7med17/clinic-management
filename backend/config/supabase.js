// Single Supabase client shared by all controllers. A missing configuration is represented by null,
// allowing endpoints to return a controlled 503 instead of failing during server startup.
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
// The backend uses the service role key because authorization is enforced by Express middleware.
// Never expose this key to the Expo client.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (!supabaseUrl || supabaseUrl.includes('your-project') || !supabaseKey || supabaseKey.includes('your-anon-key')) {
  console.warn('[WARN] Supabase is not fully configured. Database-backed endpoints will return 503 until configured.');
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[INFO] Supabase client initialized successfully (service_role).');
  } catch (error) {
    console.error('[ERROR] Failed to initialize Supabase client:', error.message);
  }
}

// isConfigured keeps startup concerns out of callers that only need a quick readiness check.
module.exports = {
  supabase,
  isConfigured: () => !!supabase
};
