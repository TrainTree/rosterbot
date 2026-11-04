const SOURCE_ORDER=Object.freeze(['master','weekly','daily','actual']);
const SOURCE_LABELS=Object.freeze({master:'Master projection',weekly:'Weekly roster',daily:'Daily roster',actual:'Recorded actual'});
const SOURCE_RANK=Object.freeze(Object.fromEntries(SOURCE_ORDER.map((source,index)=>[source,index])));

function duty(input={}){
  const state=input.state||'work';
  return Object.freeze({
    state,
    code:state==='work'?String(input.code||'SHIFT'):(state==='or'?'OR':String(input.code||state.toUpperCase())),
    signOn:state==='work'?String(input.signOn||''):'',
    signOff:state==='work'?String(input.signOff||''):'',
    duration:state==='work'?String(input.duration||''):'',
    location:String(input.location||''),
    details:String(input.details||''),
    ph:Boolean(input.ph)
  });
}

function record(source,value,publishedAt,label=''){
  if(!SOURCE_ORDER.includes(source))throw new TypeError(`Unsupported synthetic source: ${source}`);
  return Object.freeze({source,label:label||SOURCE_LABELS[source],publishedAt:String(publishedAt||''),duty:duty(value)});
}

function minutes(value){
  if(!/^\d{2}:\d{2}$/.test(String(value||'')))return null;
  const [hours,mins]=value.split(':').map(Number);return hours*60+mins;
}

function elapsedLabel(total){
  const hours=Math.floor(total/60),mins=total%60,parts=[];
  if(hours)parts.push(`${hours} hour${hours===1?'':'s'}`);
  if(mins)parts.push(`${mins} minute${mins===1?'':'s'}`);
  return parts.join(' ')||'0 minutes';
}

function dutySummary(value){
  if(value.state==='or')return 'Off Roster';
  if(value.state!=='work')return value.code;
  return `${value.code}${value.signOn?` · ${value.signOn}`:''}`;
}

function sameDuty(a,b){
  if(!a||!b)return false;
  return ['state','code','signOn','signOff','location','details','ph'].every(key=>a[key]===b[key]);
}

function compareDuties(previous,next){
  if(!previous||!next)return Object.freeze({material:false,level:'none',fields:Object.freeze([]),summary:''});
  const fields=[];
  for(const key of ['state','code','signOn','signOff','location','details','ph'])if(previous[key]!==next[key])fields.push(key);
  if(!fields.length)return Object.freeze({material:false,level:'none',fields:Object.freeze([]),summary:''});
  const workBoundary=previous.state!==next.state;
  const signOnDelta=previous.signOn&&next.signOn?Math.abs(minutes(previous.signOn)-minutes(next.signOn)):0;
  const prominent=workBoundary||fields.includes('code')||fields.includes('signOn')||fields.includes('location');
  const level=workBoundary?'critical':prominent?'prominent':'detail';
  let summary='Duty details changed';
  if(previous.state==='or'&&next.state==='work')summary=`Now working ${dutySummary(next)}`;
  else if(previous.state==='work'&&next.state==='or')summary='Now Off Roster';
  else if(fields.length===1&&fields[0]==='signOn')summary=`Sign-on changed to ${next.signOn}`;
  else if(fields.length===1&&fields[0]==='code')summary=`Duty changed to ${next.code}`;
  else if(fields.length===1&&fields[0]==='signOff')summary=`Sign-off changed to ${next.signOff}`;
  else if(signOnDelta>=60)summary=`Sign-on changed by ${elapsedLabel(signOnDelta)}`;
  return Object.freeze({material:true,level,fields:Object.freeze(fields),summary});
}

function evaluateScenario(scenario){
  const records=[...(scenario.records||[])].sort((a,b)=>SOURCE_RANK[a.source]-SOURCE_RANK[b.source]);
  if(!records.length)throw new TypeError('Synthetic scenario requires at least one source record.');
  const changes=[];
  for(let index=1;index<records.length;index++){
    const previous=records[index-1],current=records[index],comparison=compareDuties(previous.duty,current.duty);
    if(comparison.material)changes.push(Object.freeze({from:previous,to:current,...comparison}));
  }
  const winner=records.at(-1),published=[...records].reverse().find(item=>item.source!=='actual')||null;
  const latestChange=changes.at(-1)||null;
  return Object.freeze({
    ...scenario,
    records:Object.freeze(records),
    winner,
    published,
    changes:Object.freeze(changes),
    latestChange,
    hasActual:winner.source==='actual',
    actualDiffers:Boolean(winner.source==='actual'&&published&&!sameDuty(winner.duty,published.duty)),
    changed:Boolean(latestChange&&latestChange.to===winner&&latestChange.level!=='detail'),
    detailChange:Boolean(latestChange&&latestChange.to===winner&&latestChange.level==='detail')
  });
}

const base={code:'SP123',signOn:'08:00',signOff:'16:00',duration:'8h00',location:'Southern Cross',details:'Southern Cross – Kyneton – Southern Cross'};
const changed={code:'SP456',signOn:'11:00',signOff:'19:00',duration:'8h00',location:'Southern Cross',details:'Southern Cross – Ballarat – Southern Cross'};
const daily={code:'SP789',signOn:'12:15',signOff:'20:15',duration:'8h00',location:'Southern Cross',details:'Southern Cross – Wendouree – Southern Cross'};
const actual={code:'SP321',signOn:'14:00',signOff:'22:00',duration:'8h00',location:'Southern Cross',details:'Southern Cross – Geelong – Southern Cross'};
const r=(source,value,time)=>record(source,value,time);

const SCENARIOS=Object.freeze([
  {id:'projection-only',title:'Projection only',date:'2026-11-05',question:'No published roster yet',records:[r('master',base,'2026-10-01T09:00:00+11:00')]},
  {id:'weekly-confirms',title:'Weekly confirms projection',date:'2026-11-06',question:'New evidence, same duty',records:[r('master',base,'2026-10-01T09:00:00+11:00'),r('weekly',base,'2026-10-29T12:00:00+11:00')]},
  {id:'weekly-changes',title:'Weekly changes projection',date:'2026-11-07',question:'A meaningful upcoming change',records:[r('master',base,'2026-10-01T09:00:00+11:00'),r('weekly',changed,'2026-10-29T12:00:00+11:00')]},
  {id:'daily-changes',title:'Daily changes weekly',date:'2026-11-08',question:'Two successive official changes',records:[r('master',base,'2026-10-01T09:00:00+11:00'),r('weekly',changed,'2026-10-29T12:00:00+11:00'),r('daily',daily,'2026-11-07T16:35:00+11:00')]},
  {id:'actual-matches',title:'Actual matches published',date:'2026-11-09',question:'Actual should remain calm',records:[r('master',base,'2026-10-01T09:00:00+11:00'),r('weekly',daily,'2026-11-05T12:00:00+11:00'),r('daily',daily,'2026-11-08T16:35:00+11:00'),r('actual',daily,'2026-11-09T21:00:00+11:00')]},
  {id:'actual-differs',title:'Actual differs from published',date:'2026-11-10',question:'Actual wins; published duty remains evidence',records:[r('master',base,'2026-10-01T09:00:00+11:00'),r('weekly',changed,'2026-11-05T12:00:00+11:00'),r('daily',daily,'2026-11-09T16:35:00+11:00'),r('actual',actual,'2026-11-10T22:10:00+11:00')]},
  {id:'or-to-work',title:'Off Roster changed to work',date:'2026-11-11',question:'High-priority planning change',records:[r('master',{state:'or'},'2026-10-01T09:00:00+11:00'),r('weekly',changed,'2026-11-05T12:00:00+11:00')]},
  {id:'work-to-or',title:'Work changed to Off Roster',date:'2026-11-12',question:'High-priority planning change',records:[r('master',base,'2026-10-01T09:00:00+11:00'),r('weekly',{state:'or'},'2026-11-05T12:00:00+11:00')]},
  {id:'sign-on-only',title:'Sign-on time changed',date:'2026-11-13',question:'Time change without a duty-code change',records:[r('master',base,'2026-10-01T09:00:00+11:00'),r('weekly',{...base,signOn:'08:30',signOff:'16:30'},'2026-11-05T12:00:00+11:00')]},
  {id:'code-only',title:'Duty number changed',date:'2026-11-14',question:'Code change with the same times',records:[r('master',base,'2026-10-01T09:00:00+11:00'),r('weekly',{...base,code:'SP124'},'2026-11-05T12:00:00+11:00')]},
  {id:'alr',title:'ALR assignment',date:'2026-11-15',question:'Special roster state',records:[r('master',{state:'alr',code:'ALR'},'2026-10-01T09:00:00+11:00'),r('weekly',{state:'alr',code:'ALR'},'2026-11-05T12:00:00+11:00')]},
  {id:'leave-ph',title:'Leave on a public holiday',date:'2026-11-16',question:'Leave and PH remain distinct',records:[r('master',{state:'leave',code:'AL',ph:true},'2026-10-01T09:00:00+11:00'),r('weekly',{state:'leave',code:'AL',ph:true},'2026-11-05T12:00:00+11:00')]},
  {id:'daily-confirms',title:'Daily confirms weekly',date:'2026-11-17',question:'Repeated publication without alarm',records:[r('master',base,'2026-10-01T09:00:00+11:00'),r('weekly',changed,'2026-11-05T12:00:00+11:00'),r('daily',changed,'2026-11-16T16:35:00+11:00')]},
  {id:'multiple-changes',title:'Multiple successive changes',date:'2026-11-18',question:'History is discoverable, not always expanded',records:[r('master',base,'2026-10-01T09:00:00+11:00'),r('weekly',changed,'2026-11-12T12:00:00+11:00'),r('daily',daily,'2026-11-17T16:35:00+11:00'),r('actual',actual,'2026-11-18T22:10:00+11:00')]}
].map(item=>Object.freeze({...item,records:Object.freeze(item.records)})));

export {SOURCE_LABELS,SOURCE_ORDER,SCENARIOS,compareDuties,dutySummary,evaluateScenario,sameDuty};
