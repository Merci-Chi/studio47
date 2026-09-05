import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const supabaseUrl=Deno.env.get('SUPABASE_URL')!;
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const vapidPublic=Deno.env.get('VAPID_PUBLIC_KEY')!;
const vapidPrivate=Deno.env.get('VAPID_PRIVATE_KEY')!;
webpush.setVapidDetails('mailto:kiara@steadyhandsop.com',vapidPublic,vapidPrivate);
const db=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false}});

Deno.serve(async request=>{
  if(request.method!=='POST')return new Response('Method not allowed',{status:405});
  const now=Date.now(),latest=new Date(now+24*60*60*1000).toISOString();
  const {data:rows,error}=await db.from('appointment_push_subscriptions').select('*').eq('enabled',true).gt('appointment_at',new Date(now).toISOString()).lte('appointment_at',latest);
  if(error)return Response.json({error:error.message},{status:500});
  let sent=0,failed=0;
  for(const row of rows||[]){
    const minutes=(new Date(row.appointment_at).getTime()-now)/60000;
    const reminder=!row.sent_2h&&minutes>90&&minutes<=120?'2h':!row.sent_24h&&minutes>1425&&minutes<=1440?'24h':'';
    if(!reminder)continue;
    const appointment=new Date(row.appointment_at).toLocaleString('en-US',{timeZone:'America/Los_Angeles',weekday:'long',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
    try{
      await webpush.sendNotification(row.subscription,JSON.stringify({title:'Studio 47 appointment reminder',body:`Hi ${row.client_name}, your appointment is ${reminder==='2h'?'in about 2 hours':'tomorrow'} — ${appointment}.`,tag:`appointment-${row.id}-${reminder}`,url:'https://studio47hairsalon.com/'}),{TTL:3600});
      await db.from('appointment_push_subscriptions').update(reminder==='2h'?{sent_2h:true,updated_at:new Date().toISOString()}:{sent_24h:true,updated_at:new Date().toISOString()}).eq('id',row.id);sent++;
    }catch(error){failed++;const status=Number(error?.statusCode||0);if(status===404||status===410)await db.from('appointment_push_subscriptions').update({enabled:false,updated_at:new Date().toISOString()}).eq('id',row.id)}
  }
  return Response.json({checked:(rows||[]).length,sent,failed});
});
