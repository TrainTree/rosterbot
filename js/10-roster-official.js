(function(root){
  'use strict';
  const O=root.ROSTERBOT_OFFICIAL_DATA, DAYS=['sun','mon','tue','wed','thu','fri','sat'];
  function dsKey(date){const k=String(date||'');for(const [id,x] of Object.entries(O.datasets)){if(k>=x.from&&(!x.to||k<=x.to))return id}return null}
  function ds(date){const k=dsKey(date);return k?O.datasets[k]:null}
  function flexVersion(date){const k=String(date||'');let hit=null;for(const x of O.flexVersions){if(k>=x.from&&(!x.to||k<=x.to))hit=x}return hit}
  function rosterObj(date,depot='SCS',roster='A'){
    if(depot==='SCS'&&roster==='FLEX'){const f=flexVersion(date);return f?{lineCount:f.lineCount,lines:f.lines,source:f.source}:null}
    return ds(date)?.depots?.[depot]?.[roster]||null;
  }
  function depotNames(date){return Object.keys(ds(date)?.depots||{}).sort((a,b)=>a==='SCS'?-1:b==='SCS'?1:a.localeCompare(b))}
  function rosterNames(date,depot='SCS'){const names=Object.keys(ds(date)?.depots?.[depot]||{});if(depot==='SCS'&&flexVersion(date)&&!names.includes('FLEX'))names.push('FLEX');return names.sort((a,b)=>{const order=['A','B','C','D','FLEX','CABCOM','MAIN'];return (order.indexOf(a)<0?99:order.indexOf(a))-(order.indexOf(b)<0?99:order.indexOf(b))})}
  function boundaryKey(date,depot='SCS',roster='A'){if(depot==='SCS'&&roster==='FLEX')return 'FLEX@'+(flexVersion(date)?.from||'none');return (dsKey(date)||'none')+'@'+depot+'@'+roster}
  function normCode(x){return String(x||'').trim().toLowerCase()}
  function baseCode(x){const m=String(x||'').trim().toLowerCase().match(/^(sp\d+)[a-f]$/);return m?m[1]:String(x||'').trim().toLowerCase()}
  function jobRecords(date){return ds(date)?.jobs||[]}
  function lookupJob(date,depot,code,start='',day=null){
    const lc=normCode(code);let a=jobRecords(date).filter(r=>r.depot===depot&&normCode(r.code)===lc);
    if(start){const b=a.filter(r=>r.start===start);if(b.length)a=b}
    if(day!=null){const b=a.filter(r=>!r.days?.length||r.days.includes(day));if(b.length)a=b}
    return a[0]||null;
  }
  function searchJobs(date,q,limit=24){
    const raw=String(q||'').trim();if(!raw)return[];
    const records=jobRecords(date),day=new Date(date+'T00:00:00Z').getUTCDay();
    const normTime=(v)=>{const sv=String(v).trim();if(/^\d{1,2}:\d{2}$/.test(sv)){const [h,m]=sv.split(':');return String(+h).padStart(2,'0')+':'+m}if(!/^\d{4}$/.test(sv))return '';const x=sv;return x.slice(0,2)+':'+x.slice(2)};
    const subseq=(needle,hay)=>{let i=0;for(const ch of hay){if(ch===needle[i])i++;if(i===needle.length)return true}return !needle.length};
    const t=normTime(raw),lc=raw.toLowerCase(),digits=raw.replace(/\D/g,'');
    let scored=[];
    if(t){
      scored=records.filter(r=>r.start===t).map(r=>[0,r]);
    }else if(/^\d+$/.test(raw)){
      // Fast numeric duty search: typing 613 finds SP613 first, then any duty whose
      // numeric part contains or fuzzily contains 6...1...3 in that order.
      for(const r of records){const rd=String(r.code||'').replace(/\D/g,'');if(!rd||!subseq(digits,rd))continue;let score=3;if(rd===digits)score=0;else if(rd.startsWith(digits))score=1;else if(rd.includes(digits))score=2;scored.push([score,r])}
      scored.sort((a,b)=>a[0]-b[0]||String(a[1].code).localeCompare(String(b[1].code),undefined,{numeric:true})||String(a[1].start).localeCompare(String(b[1].start)));
    }else{
      scored=records.filter(r=>normCode(r.code).startsWith(lc)).map(r=>[0,r]);
    }
    // Prefer duties valid on the selected day, but retain all date-correct records as fallback.
    scored.sort((a,b)=>{const ad=!a[1].days?.length||a[1].days.includes(day)?0:1,bd=!b[1].days?.length||b[1].days.includes(day)?0:1;return ad-bd||a[0]-b[0]});
    const seen=new Set(),out=[];for(const [,r] of scored){const key=[r.depot,normCode(r.code),r.start,r.end].join('|');if(seen.has(key))continue;seen.add(key);out.push({...r,book:`${r.depot} · ${r.book||'Roster book'}`});if(out.length>=limit)break}return out;
  }
  function add8(t){if(!/^\d{2}:\d{2}$/.test(t||''))return '';let [h,m]=t.split(':').map(Number),n=(h*60+m+480)%1440;return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
  function legacyCell(date,depot,roster,line,day,c){
    if(!c)return {type:'unknown',raw:['NO DATA']};
    if(c.type==='off')return {type:'off',shift:null,start:null,finish:null,details:[],raw:['OR'],sourceDataset:dsKey(date),bookingDepot:depot};
    if(c.type==='alr')return {type:'alr',shift:null,start:null,finish:null,details:[],raw:['ALR'],sourceDataset:dsKey(date),bookingDepot:depot};
    if(c.type!=='shift')return {type:'unknown',raw:[c.raw||'NO DATA'],sourceDataset:dsKey(date),bookingDepot:depot};
    const code=c.code||'SHIFT',start=c.start||'',j=lookupJob(date,depot,code,start,day),finish=j?.end||add8(start),exact=!!j?.end;
    return {type:'shift',shift:code,start,finish,details:[`${dsKey(date)||'Historical'} · ${depot}${j?.book?` · ${j.book}`:''}`],raw:[code,start],finishSource:exact?'roster-book':'assumed-8h',bookRecord:j?.code||'',bookContents:j?.detail||'',bookCorridor:j?.book||'',bookHours:j?.hours||'',matchKind:j?'exact':'rotation-only',sourceDataset:dsKey(date),bookingDepot:depot};
  }
  function conversionFor(date,roster,line,normal){const p=O.phConversions?.[date];if(!p)return null;if(p.status==='photo-unverified')return {notice:p,warning:p.warning};let cand=(p.mappings||[]).filter(x=>x.srcRoster===roster&&Number(x.line)===Number(line));if(!cand.length){if(normal?.type==='off')return null;return {notice:p,warning:'No verified conversion row was extracted for this roster line.'};}if(cand.length>1&&normal){const exact=cand.filter(x=>(!x.srcCode||normCode(x.srcCode)===normCode(normal.shift))&&(!x.srcStart||x.srcStart===normal.start));if(exact.length)cand=exact}return {notice:p,mapping:cand[0]}}
  function resolveCell(date,depot='SCS',roster='A',line=1,dayIndex=null){
    const dobj=rosterObj(date,depot,roster);const day=dayIndex==null?new Date(date+'T00:00:00Z').getUTCDay():dayIndex;const c=dobj?.lines?.[String(line)]?.[day];let normal=legacyCell(date,depot,roster,line,day,c);
    if(depot!=='SCS')return normal;
    const cv=conversionFor(date,roster,line,normal);if(!cv)return normal;
    if(cv.warning)return {...normal,holidayConversionNotice:cv.notice,conversionWarning:cv.warning};
    const m=cv.mapping,meta={...m,holidayName:cv.notice.name,convertTo:cv.notice.convertTo,status:cv.notice.status,original:{type:normal.type,shift:normal.shift||'',start:normal.start||'',finish:normal.finish||''}};
    if(m.outcome==='ph')return {type:'ph',shift:'PH',start:'',finish:'',details:[`${cv.notice.name} · PH conversion from ${roster}${line}`],raw:['PH'],phConversion:meta,sourceDataset:dsKey(date),bookingDepot:depot};
    if(m.outcome==='av')return {type:'av',shift:'AV',start:m.targetStart||m.srcStart||normal.start||'',finish:'',details:[`${cv.notice.name} · Available`, `Converted from ${roster}${line}${normal.shift?` ${normal.shift}`:''}`],raw:['AV',m.targetStart||''],phConversion:meta,sourceDataset:dsKey(date),bookingDepot:depot};
    if(m.outcome==='job'){
      let tr=m.targetRoster||roster,tl=Number(m.targetLine)||line,tc=m.targetCode||'',ts=m.targetStart||'';
      if(!tc){const convDay=cv.notice.convertTo==='Sunday'?0:6,target=rosterObj(date,'SCS',tr)?.lines?.[String(tl)]?.[convDay];if(target?.type==='shift'){tc=target.code||'';ts=ts||target.start||''}}
      const j=lookupJob(date,'SCS',tc,ts,cv.notice.convertTo==='Sunday'?0:6)||lookupJob(date,'SCS',tc,ts,null);const finish=j?.end||add8(ts);
      return {type:'shift',shift:tc||'SHIFT',start:ts,finish,details:[`${cv.notice.name} · PH conversion`, `Normally ${roster}${line}${normal.shift?` · ${normal.shift}`:''}${normal.start?` ${normal.start}`:''}`, `Converts to ${tr}${tl}${tc?` · ${tc}`:''}`],raw:[tc||'SHIFT',ts],finishSource:j?.end?'roster-book':'assumed-8h',bookRecord:j?.code||'',bookContents:j?.detail||'',bookCorridor:j?.book||'',bookHours:j?.hours||'',phConversion:{...meta,targetRoster:tr,targetLine:tl,targetCode:tc,targetStart:ts},sourceDataset:dsKey(date),bookingDepot:'SCS'};
    }
    return {...normal,phConversion:meta,conversionWarning:m.note||'This PH conversion requires manual confirmation.'};
  }
  function defaultPhMode(cell,isHoliday=true){if(!isHoliday)return '';if(cell?.conversionWarning||cell?.holidayConversionNotice||cell?.phConversion?.status==='draft')return 'choose';const o=cell?.phConversion?.outcome;if(o==='ph')return 'ph';if(o==='av')return 'av';if(o==='job')return 'job';if(cell?.type==='off')return 'off';if(cell?.type==='ph')return 'ph';if(cell?.type==='av')return 'av';if(cell?.type==='shift')return 'job';return 'choose'}
  function lineCount(date,depot,roster){return rosterObj(date,depot,roster)?.lineCount||0}
  root.RosterOfficial={datasetKey:dsKey,dataset:ds,flexVersion,rosterObj,depotNames,rosterNames,boundaryKey,lookupJob,searchJobs,resolveCell,defaultPhMode,lineCount};
})(window);
