const { createClient } = require('@supabase/supabase-js');

// This function uses the Supabase service_role key to delete all rows.
// Set the following environment variables in Netlify (Site settings → Build & deploy → Environment):
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_DELETE_SECRET

exports.handler = async function (event) {
  try {
    // TEMP DEBUG LOGS - DO NOT LOG SECRET VALUES
    console.log('DEBUG: clear-applications invoked, method=', event.httpMethod);
    console.log('DEBUG: SUPABASE_URL present=', !!process.env.SUPABASE_URL);
    console.log('DEBUG: SUPABASE_SERVICE_ROLE_KEY present=', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('DEBUG: ADMIN_DELETE_SECRET present=', !!process.env.ADMIN_DELETE_SECRET);
    console.log('DEBUG: header x-admin-secret present=', !!event.headers['x-admin-secret']);

    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const provided = event.headers['x-admin-secret'] || event.headers['x-admin-password'];
    const expected = process.env.ADMIN_DELETE_SECRET;
    if (!expected || provided !== expected) {
      return { statusCode: 401, body: 'Unauthorized' };
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return { statusCode: 500, body: 'Supabase not configured on server' };
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Fetch IDs first to respect RLS and avoid ambiguous filters
    const { data: rows, error: selErr } = await supabase
      .from('loan_applications')
      .select('id')
      .not('id', 'is', null);

    if (selErr) {
      console.error('select error', selErr);
      return { statusCode: 500, body: JSON.stringify({ error: selErr }) };
    }

    const ids = (rows || []).map((r) => r.id).filter(Boolean);
    if (ids.length === 0) return { statusCode: 200, body: 'No rows to delete' };

    const { error } = await supabase
      .from('loan_applications')
      .delete()
      .in('id', ids);

    if (error) {
      console.error('delete error', error);
      return { statusCode: 500, body: JSON.stringify({ error }) };
    }

    return { statusCode: 200, body: JSON.stringify({ deleted: ids.length }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: String(err) };
  }
};
