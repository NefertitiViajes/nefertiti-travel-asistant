export default async function handler(req,res){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
 if(!url||!key)return res.status(500).json({ok:false,error:'Server configuration missing'});
 try{
  const r=await fetch(`${url}/rest/v1/email_messages?select=id,sender_email,sender_name,subject,status,category,received_at&order=received_at.desc&limit=30`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
  if(!r.ok)return res.status(500).json({ok:false,error:'Database read failed'});
  const rows=await r.json();
  const messages=rows.map(x=>({id:x.id,sender:x.sender_name?`${x.sender_name} <${x.sender_email||''}>`:(x.sender_email||''),subject:x.subject,category:x.category||'neclasificat',needs_reply:['client_turist','partener','administrativ'].includes(x.category),summary:'',draft:null,status:x.status,received_at:x.received_at}));
  return res.status(200).json({ok:true,mode:'read-only',messages});
 }catch(e){return res.status(500).json({ok:false,error:'Inbox unavailable'});}
}