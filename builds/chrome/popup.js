const $=id=>document.getElementById(id);
// Explicit + / 00 prefix wins. Local numbers require a country code.
const norm=(raw,cc='91')=>{
  const original=String(raw??'').trim();
  const compact=original.replace(/[\s().-]/g,'');
  if(!compact || !/^(?:\+|00)?\d+$/.test(compact)) return null;
  const explicit=compact.startsWith('+')||compact.startsWith('00');
  const digits=compact.startsWith('+')?compact.slice(1):compact.startsWith('00')?compact.slice(2):compact;
  if(!digits || digits.startsWith('0') && explicit) return null;
  // For a bare number, use the row's country code and remove a national trunk zero.
  const full=explicit?digits:cc+digits.replace(/^0/,'');
  return /^[1-9]\d{7,14}$/.test(full)?full:null;
};
let queue=null,running=false,error='',imported=null;
const MAX_BATCH=500;
const ESTIMATED_LOAD_OVERHEAD_SECONDS=3;
function eligibleContacts(){
  const source=imported||parseManual($('numbers').value),seen=new Set();
  for(const entry of source){
    if(!String(entry.number||'').trim())continue;
    const cc=String(entry.country_code||'91').replace(/\D/g,'');
    const number=norm(entry.number,cc);
    if(number)seen.add(number);
  }
  return seen.size;
}
function formatEstimate(seconds){
  if(!Number.isFinite(seconds)||seconds<=0)return '0 sec';
  const hours=Math.floor(seconds/3600),mins=Math.floor((seconds%3600)/60),secs=seconds%60;
  return [hours?`${hours} hr`:null,mins?`${mins} min`:null,secs?`${secs} sec`:null].filter(Boolean).join(' ');
}
function updateEstimate(){
  const count=eligibleContacts(),delay=Number($('delay').value);
  $('estimate-count').textContent=`${count} / ${MAX_BATCH} contacts`;
  $('estimate-count').classList.toggle('over-limit',count>MAX_BATCH);
  $('estimate').textContent=Number.isFinite(delay)&&delay>=3&&delay<=120?formatEstimate(count*(delay+ESTIMATED_LOAD_OVERHEAD_SECONDS)):'Set interval';
}

const esc=s=>'"'+String(s??'').replace(/"/g,'""')+'"';
function csvRows(src){const rows=[];let row=[],field='',quoted=false;for(let i=0;i<src.length;i++){const ch=src[i];if(ch==='"'){if(quoted&&src[i+1]==='"'){field+='"';i++}else quoted=!quoted}else if(ch===','&&!quoted){row.push(field);field=''}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&src[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))rows.push(row);row=[];field=''}else field+=ch}row.push(field);if(row.some(x=>x.trim()))rows.push(row);return rows}
function parseManual(text){
  return text.split(/[\r\n;]+/).map(line=>line.trim()).filter(Boolean).flatMap(line=>{
    const cells=csvRows(line)[0]||[];
    if(cells.length===2 && cells[0].trim() && cells[1].trim()) {
      return [{name:cells[0].trim(),number:cells[1].trim()}];
    }
    return cells.map(number=>({number:number.trim(),name:''})).filter(x=>x.number);
  });
}
function parseImport(text,filename){if(filename.toLowerCase().endsWith('.txt'))return parseManual(text);const rows=csvRows(text);if(!rows.length)return [];const header=rows[0].map(x=>x.toLowerCase().trim());const ni=header.findIndex(x=>['number','phone','mobile','whatsapp','phone number'].includes(x));const namei=header.findIndex(x=>['name','contact','full name'].includes(x));const ci=header.findIndex(x=>['country_code','country code','dial_code','dial code'].includes(x));const hasHeader=ni>=0;return rows.slice(hasHeader?1:0).map(r=>({number:r[hasHeader?ni:(!hasHeader&&r.length>=2?1:0)]||'',name:namei>=0?r[namei]||'':(!hasHeader&&r.length>=2?r[0]||'':''),country_code:ci>=0?r[ci]||'':''}));}
async function save(){await chrome.storage.local.set({queue,running,error});}
async function refresh(){const d=await chrome.storage.local.get(['queue','running','error']);queue=d.queue||null;running=!!d.running;error=d.error||'';const counts=queue?.contacts.reduce((a,c)=>(a[c.status]=(a[c.status]||0)+1,a),{})||{};const total=queue?.contacts.length||0,done=(counts.submitted||0)+(counts.skipped||0);$('total').textContent=total;$('submitted').textContent=counts.submitted||0;$('pending').textContent=(counts.pending||0)+(counts.opening||0);$('uncertain').textContent=counts.submitting||0;$('bar').style.width=(total?100*done/total:0)+'%';$('mode').textContent=running?'Running':'Paused';$('start').textContent=queue?.contacts?.some(c=>c.status==='pending')&&queue?.draft===($('numbers').value.trim()+'\n'+$('message').value.trim())?'▶ Resume Sending':'▶ Start Sending';$('start').disabled=running;$('status').textContent=(error?error+' · ':'')+`${done}/${total} processed · ${counts.skipped||0} skipped · ${counts.submitting||0} uncertain`;}
$('message').oninput=()=>$('chars').textContent=$('message').value.length+' characters';
$('file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{imported=parseImport(await file.text(),file.name);$('numbers').value=imported.map(x=>x.name?`${x.name},${x.number}`:x.number).join('\n');$('importinfo').textContent=`${imported.length} rows loaded`;await chrome.storage.local.set({senderDraft:{numbers:$('numbers').value,message:$('message').value,delay:$('delay').value}});updateEstimate(); }catch(ex){alert('Unable to read file: '+ex.message)}};
$('numbers').oninput=()=>{imported=null;$('importinfo').textContent='Manual numbers';updateEstimate()};
$('delay').addEventListener('input',updateEstimate);
async function activateWhatsApp(){
  const tabs=await chrome.tabs.query({url:'https://web.whatsapp.com/*'});
  let tab=tabs.length?await chrome.tabs.update(tabs[0].id,{active:true}):await chrome.tabs.create({url:'https://web.whatsapp.com/'});
  if(tabs.length)await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']});
}
async function startQueue(){
  if(running)return;
  try{
    const existing=queue?.contacts?.length && queue.contacts.some(c=>c.status==='pending');
    const draft=$('numbers').value.trim()+'\n'+$('message').value.trim();
    const sameDraft=queue?.draft===draft;
    if(existing && sameDraft){
      if(queue.contacts.length>MAX_BATCH)throw Error(`This saved queue exceeds the ${MAX_BATCH}-contact batch limit. Start a smaller batch.`);
      if(queue.contacts.some(c=>['submitting','opening'].includes(c.status)))throw Error('Review uncertain/opening contacts before resuming.');
      if(!$('consent').checked)throw Error('Confirm recipient permission first.');
      if(!confirm(`Resume ${queue.contacts.filter(c=>c.status==='pending').length} pending contacts?`))return;
    }else{
      const delay=Number($('delay').value);
      if(!Number.isFinite(delay)||delay<3||delay>120)throw Error('Interval must be 3–120 seconds.');
      if(!$('consent').checked)throw Error('Confirm recipient permission first.');
      const source=imported||parseManual($('numbers').value),contacts=[],seen=new Set();
      let invalid=0,duplicates=0;
      for(const entry of source){
        if(!String(entry.number).trim())continue;
        const rowCC=String(entry.country_code||'91').replace(/\D/g,'');
        const number=norm(entry.number,rowCC);
        if(!number){invalid++;continue;}
        if(seen.has(number)){duplicates++;continue;}
        seen.add(number);
        contacts.push({number,name:String(entry.name||'').trim(),status:'pending',updatedAt:null,error:''});
      }
      const message=$('message').value.trim();
      if(!contacts.length||!message)throw Error('Enter valid contacts and a message.');
      if(contacts.length>MAX_BATCH)throw Error(`Maximum ${MAX_BATCH} valid unique contacts per batch. You have ${contacts.length}; split your list into smaller batches.`);
      if(!confirm(`Start sending to ${contacts.length} opted-in contacts?\n${invalid} invalid and ${duplicates} duplicate entries excluded.\n\nThis uses unofficial WhatsApp Web automation.`))return;
      queue={contacts,message,delayMs:delay*1000,createdAt:new Date().toISOString(),draft};
    }
    running=true;error='';await save();await refresh();
    try{await activateWhatsApp();}
    catch(e){running=false;error='Cannot open WhatsApp Web: '+(e.message||e)+'. Refresh WhatsApp Web and retry.';await save();await refresh();}
  }catch(e){error=String(e.message||e);await save();await refresh();}
}
$('start').onclick=startQueue;
$('pause').onclick=async()=>{running=false;await save();refresh()};
$('stop').onclick=async()=>{if(!queue)return;if(!confirm('Stop this campaign? Pending contacts will be marked skipped.'))return;running=false;for(const c of queue.contacts)if(c.status==='pending'){c.status='skipped';c.updatedAt=new Date().toISOString();}await save();refresh();};
$('resolve').onclick=async()=>{if(running)return alert('Pause first');const item=queue?.contacts.find(c=>c.status==='submitting'||c.status==='opening');if(!item)return alert('No uncertain contacts');const choice=prompt(`Review ${item.number} in WhatsApp. Type SUBMITTED only if verified in chat, or SKIP to avoid duplicates.`);if(choice!=='SUBMITTED'&&choice!=='SKIP')return;item.status=choice==='SUBMITTED'?'submitted':'skipped';item.updatedAt=new Date().toISOString();error='';await save();refresh()};
$('export').onclick=()=>{if(!queue)return alert('No queue to export');const csv=['number,name,status,updated_at,error',...queue.contacts.map(c=>[c.number,c.name,c.status,c.updatedAt,c.error].map(esc).join(','))].join('\r\n');const a=document.createElement('a');const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.href=url;a.download='whatsapp-sender-report-v1.6.0.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
async function initialize(){const d=await chrome.storage.local.get('senderDraft');if(d.senderDraft){$('numbers').value=d.senderDraft.numbers||'';$('message').value=d.senderDraft.message||'';$('delay').value=d.senderDraft.delay||5;}$('chars').textContent=$('message').value.length+' characters';updateEstimate();await refresh();}
let saveDraftTimer;for(const id of ['numbers','message','delay'])$(id).addEventListener('input',()=>{clearTimeout(saveDraftTimer);saveDraftTimer=setTimeout(()=>chrome.storage.local.set({senderDraft:{numbers:$('numbers').value,message:$('message').value,delay:$('delay').value}}),200);});
setInterval(refresh,1200);initialize();