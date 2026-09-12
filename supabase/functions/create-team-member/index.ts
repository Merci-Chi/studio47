import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const loginPart = (name: string) =>
  name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ message: 'Method not allowed.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization');
  if (!supabaseUrl || !anonKey || !serviceKey || !authorization) {
    return json({ message: 'The server is not configured for account creation.' }, 500);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userResult, error: userError } = await callerClient.auth.getUser();
  if (userError || !userResult.user) return json({ message: 'Sign in again and retry.' }, 401);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: ownerProfile, error: ownerError } = await admin
    .from('staff_profiles')
    .select('user_id')
    .eq('user_id', userResult.user.id)
    .eq('role', 'owner')
    .eq('active', true)
    .maybeSingle();
  if (ownerError || !ownerProfile) return json({ message: 'Only an active owner can add team logins.' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ message: 'Invalid request.' }, 400);
  }

  const name = String(body.name || '').trim();
  const firstName = name.split(/\s+/)[0] || '';
  const accountName = loginPart(firstName);
  const recoveryEmail = body.recovery_email ? String(body.recovery_email).trim().toLowerCase() : null;
  const workingDays = Array.isArray(body.working_days)
    ? body.working_days.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : [];
  const startTime = String(body.start_time || '');
  const endTime = String(body.end_time || '');

  if (!name || !accountName) return json({ message: 'Enter a valid first name.' }, 400);
  if (!workingDays.length) return json({ message: 'Select at least one working day.' }, 400);
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    return json({ message: 'Enter valid working hours.' }, 400);
  }
  if (recoveryEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail)) {
    return json({ message: 'Enter a valid recovery email.' }, 400);
  }

  const workEmail = `${accountName}@studio47.com`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: workEmail,
    password: 'password',
    email_confirm: true,
    user_metadata: { password_setup_complete: false, stylist_name: name },
  });
  if (createError || !created.user) {
    const duplicate = /already|registered|exists/i.test(createError?.message || '');
    return json({ message: duplicate ? `${workEmail} already exists. Use a different first name.` : createError?.message || 'The login could not be created.' }, duplicate ? 409 : 400);
  }

  const maxOrderResult = await admin.from('site_content').select('sort_order').eq('section', 'team').order('sort_order', { ascending: false }).limit(1).maybeSingle();
  const schedule = { name, working_days: [...new Set(workingDays)], start_time: startTime, end_time: endTime };
  const { data: teamRow, error: teamError } = await admin
    .from('site_content')
    .insert({
      section: 'team',
      content_key: `team_${crypto.randomUUID()}`,
      content_value: JSON.stringify(schedule),
      title: name,
      image_url: '',
      sort_order: Number(maxOrderResult.data?.sort_order || 0) + 1,
      is_live: true,
    })
    .select('id')
    .single();
  if (teamError || !teamRow) {
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ message: teamError?.message || 'The team schedule could not be created.' }, 400);
  }

  const { error: profileError } = await admin.from('staff_profiles').insert({
    user_id: created.user.id,
    work_email: workEmail,
    recovery_email: recoveryEmail,
    stylist_name: name,
    team_member_id: teamRow.id,
    role: 'staff',
    active: true,
  });
  if (profileError) {
    await admin.from('site_content').delete().eq('id', teamRow.id);
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ message: profileError.message }, 400);
  }

  return json({ user_id: created.user.id, team_member_id: teamRow.id, work_email: workEmail }, 201);
});
