export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({ok:false,error:'POST only'});
  const {email_message_id,recipient_email,subject,body_text,action}=req.body||{};
  if(!email_message_id || typeof body_text!=='string' || !['save','approve','reject'].includes(action)) return res.status(400).json({ok:false,error:'Invalid request'});
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
  if(!url||!key) return res.status(500).json({ok:false,error:'Server configuration missing'});
  const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
  try{
    const q=await fetch(`${url}/rest/v1/email_drafts?email_message_id=eq.${encodeURIComponent(email_message_id)}&select=id&order=updated_at.desc&limit=1`,{headers});
    if(!q.ok) throw new Error('Could not check draft');
    const rows=await q.json();
    const now=new Date().toISOString();
    const approval_status=action==='approve'?'approved':action==='reject'?'rejected':'pending';
    const payload={email_message_id,recipient_email:recipient_email||null,subject:subject||null,body_text,approval_status,approved_at:action==='approve'?now:null,updated_at:now};
    let r;
    if(rows[0]?.id){
      r=await fetch(`${url}/rest/v1/email_drafts?id=eq.${encodeURIComponent(rows[0].id)}`,{method:'PATCH',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify(payload)});
    }else{
      r=await fetch(`${url}/rest/v1/email_drafts`,{method:'POST',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify(payload)});
    }
    if(!r.ok) throw new Error('Could not save draft review');
    const saved=await r.json();
    return res.status(200).json({ok:true,draft:saved[0]||null,note:'Draft saved. No email was sent.'});
  }catch(e){return res.status(500).json({ok:false,error:e?.message||'Save failed'});}
}