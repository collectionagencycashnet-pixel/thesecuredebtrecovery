const { createClient } = require('@supabase/supabase-js');

// This function uses the Supabase service_role key to delete all rows.
// Required Netlify env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_DELETE_SECRET

exports.handler = async function (event) {
  try {
    // DEBUG: presence checks (do not print secret values)
    console.log('DEBUG: clear-applications invoked, method=', event.httpMethod);
    const envPresent = {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      ADMIN_DELETE_SECRET: !!process.env.ADMIN_DELETE_SECRET,
    };
    console.log('DEBUG: env presence', envPresent);
    console.log('DEBUG: header x-admin-secret present=', !!event.headers['x-admin-secret']);

    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const provided = event.headers['x-admin-secret'] || event.headers['x-admin-password'];
    const expected = process.env.ADMIN_DELETE_SECRET;
    if (!expected || provided !== expected) {
      console.warn('Unauthorized: ADMIN_DELETE_SECRET mismatch or not set');
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized', debug: { providedPresent: !!provided, expectedPresent: !!expected } })
      };
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      console.error('Supabase service config missing');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Supabase not configured on server', debug: { SUPABASE_URL: !!SUPABASE_URL, SERVICE_ROLE: !!SERVICE_ROLE } })
      };
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Fetch IDs first to respect RLS and avoid ambiguous filters
    const { data: rows, error: selErr } = await supabase
      .from('loan_applications')
      .select('id')
      .not('id', 'is', null);

    if (selErr) {
      console.error('select error', selErr);
      return { statusCode: 500, body: JSON.stringify({ error: 'select_error', details: selErr }) };
    }

    const ids = (rows || []).map((r) => r.id).filter(Boolean);
    if (ids.length === 0) return { statusCode: 200, body: JSON.stringify({ deleted: 0, debug: envPresent }) };

    const { error } = await supabase
      .from('loan_applications')
      .delete()
      .in('id', ids);

    if (error) {
      console.error('delete error', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'delete_error', details: error }) };
    }

    return { statusCode: 200, body: JSON.stringify({ deleted: ids.length, debug: envPresent }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};