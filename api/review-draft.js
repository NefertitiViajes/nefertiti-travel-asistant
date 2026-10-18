export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({ok:false,error:'POST only'});
 const {id,action,body}=req.body||{};
 if(!id||!['approve','reject','edit'].includes(action))return res.status(400).json({ok:false,error:'Invalid request'});
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
 if(!url||!key)return res.status(500).json({ok:false,error:'Server configuration missing'});
 try{
  let status=action==='approve'?'approved':action==='reject'?'ignored':'draft_ready';
  const patch={status,updated_at:new Date().toISOString()};
  if(action==='edit'&&typeof body==='string')patch.body_text=body;
  const r=await fetch(`${url}/rest/v1/email_messages?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(patch)});
  if(!r.ok)throw new Error('Could not save review');
  return res.status(200).json({ok:true,status,note:'Review saved. No email was sent.'});
 }catch(e){return res.status(500).json({ok:false,error:e?.message||'Review failed'});}
}