function buildReview(x){
 const body=(x.body_text||'').replace(/\s+/g,' ').replace(/Trimis din Yahoo Mail.*$/i,'').trim();
 const text=`${x.subject||''} ${body}`.toLowerCase();
 let summary=body?body.slice(0,500):'';
 let missing=[];
 let draft=null;

 if(x.category==='client_turist'){
  const destinations=['tenerife','turcia','antalya','cipru','grecia','egipt','spania','mallorca','creta','rhodos'];
  const destination=destinations.find(d=>text.includes(d));
  summary=destination?`Clientul doreste o vacanta in ${destination.charAt(0).toUpperCase()+destination.slice(1)}.`:'Clientul solicita o oferta de vacanta.';
  const hasDate=/\b(ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie|\d{1,2}[.\/-]\d{1,2})\b/i.test(text);
  const hasPeople=/\b(adult|adulti|persoan|persoane|copil|copii|\d+\s*(adulti|persoane))\b/i.test(text);
  const hasNights=/\b\d+\s*(nopti|noapte|zile)\b/i.test(text);
  const hasDeparture=/\b(bucuresti|cluj|iasi|timisoara|craiova|sibiu|bacau|brasov|oradea|plecare din)\b/i.test(text);
  const hasBudget=/\b(buget|eur|euro|€|ron|lei)\b/i.test(text);
  if(!hasDate)missing.push('perioada / datele calatoriei');
  if(!hasNights)missing.push('numarul de nopti');
  if(!hasPeople)missing.push('numarul de adulti si copii + varsta copiilor');
  if(!hasDeparture)missing.push('orasul de plecare');
  if(!hasBudget)missing.push('bugetul aproximativ');
  missing.push('preferintele de cazare si masa');

  if(missing.length){
   const destLabel=destination?destination.charAt(0).toUpperCase()+destination.slice(1):'vacanta dorita';
   draft=`Buna ziua!\n\nSigur, cu drag. Ca sa va pot pregati variante potrivite pentru ${destLabel}, mai am nevoie de cateva detalii:\n\n${missing.map((m,i)=>`${i+1}. ${m.charAt(0).toUpperCase()+m.slice(1)}`).join('\n')}\n\nDupa ce imi trimiteti aceste informatii, verific variantele potrivite pentru dumneavoastra.\n\nCu drag,\nIuliana\nNefertiti Travel`;
  }
 }
 return {summary,missing,draft};
}

export default async function handler(req,res){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
 if(!url||!key)return res.status(500).json({ok:false,error:'Server configuration missing'});
 try{
  const r=await fetch(`${url}/rest/v1/email_messages?select=id,sender_email,sender_name,subject,body_text,status,category,received_at&order=received_at.desc&limit=30`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
  if(!r.ok)return res.status(500).json({ok:false,error:'Database read failed'});
  const rows=await r.json();
  const messages=rows.map(x=>{
   const review=buildReview(x);
   return {id:x.id,sender:x.sender_name?`${x.sender_name} <${x.sender_email||''}>`:(x.sender_email||''),subject:x.subject,category:x.category||'neclasificat',needs_reply:['client_turist','partener','administrativ'].includes(x.category),summary:review.summary,missing:review.missing,draft:review.draft,status:x.status,received_at:x.received_at};
  });
  return res.status(200).json({ok:true,mode:'review',messages});
 }catch(e){return res.status(500).json({ok:false,error:'Inbox unavailable'});}
}