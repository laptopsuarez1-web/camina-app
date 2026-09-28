// Borra la cuenta de un dueño de comercio, de punta a punta: su negocio
// (cascada a beneficios y canjes, ver 0010_delete_business_account.sql) y su
// auth.user. Mismo motivo que delete-account (lado consumidor) — un comercio
// tiene que poder darse de baja de verdad desde el panel, no solo pedírselo
// a soporte.

import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Sin sesión' }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'Sesión inválida' }), { status: 401 });
  }
  const userId = userData.user.id;

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Best-effort: logo del negocio en Storage (business-logos/<business_id>/...).
  const { data: ownedBusinesses } = await adminClient
    .from('businesses')
    .select('id')
    .eq('owner_user_id', userId);
  for (const b of ownedBusinesses ?? []) {
    const { data: logoFiles } = await adminClient.storage.from('business-logos').list(b.id);
    if (logoFiles && logoFiles.length > 0) {
      await adminClient.storage.from('business-logos').remove(logoFiles.map((f) => `${b.id}/${f.name}`));
    }
  }

  // Borra el/los negocio(s) de este dueño explícitamente — owner_user_id en
  // businesses es "on delete set null" (a propósito, para que Bloom pueda
  // quedar sin dueño sin desaparecer del mapa), así que borrar el auth.user
  // solo no alcanza para sacar el negocio de la app.
  await adminClient.from('businesses').delete().eq('owner_user_id', userId);

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
