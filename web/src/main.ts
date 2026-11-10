import React,{createElement as h,useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Dashboard} from './generated/Dashboard';
import {Actions} from './components/ui';
import {candidates,clock,connect,defaults,example,minutes,suggestDirection,usablePosition,fresh,matches,rideTime} from './engine';
import type {Arrival,Board,Journey,Leg,Mode,Origin,Position,Saved} from './engine';
import {mergeBusBoards,timetableRows} from './timetable';
import {useJourneyBuilder,modeLabel} from './journey-builder';
import './style.css';
const base=new URL('./',location.href).pathname.replace(/\/$/,'');
let csrf='';
const setupToken=location.hash.startsWith('#setup/')?location.hash.slice(7):'';
if(setupToken)history.replaceState(null,'',location.pathname);
let sessionExpired=()=>{};
async function api(path:string,body?:unknown,signal?:AbortSignal){const r=await fetch(base+'/api/'+path,{signal,method:body===undefined?'GET':'PUT',headers:body===undefined?{}:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:body===undefined?undefined:JSON.stringify(body)});if(r.status===401){sessionExpired();throw new Error('Sign in to continue');}const data=await r.json();if(!r.ok)throw new Error(data.error||'Connection unavailable. Please retry.');return data;}
const uid=()=>crypto.randomUUID();
const tone=(mode:string)=>mode==='bus'?'red':mode==='tube'?'blue':mode==='national-rail'?'navy':'purple';
const originKey=(direction:'outbound'|'inbound')=>direction==='outbound'?'home':'work';
const originName=(key:'home'|'work')=>key==='home'?'Home':'Work';
type Boarding={index:number;arrival:number};
function getPosition(){
 return new Promise<Position>((resolve,reject)=>{
  if(!navigator.geolocation){reject(new Error('This browser cannot share location.'));return;}
  navigator.geolocation.getCurrentPosition(({coords,timestamp})=>resolve({lat:coords.latitude,lon:coords.longitude,accuracy:coords.accuracy,at:timestamp}),()=>reject(new Error('Location unavailable.')), {enableHighAccuracy:true,timeout:12000,maximumAge:30000});
 });
}
function App(){
 const [boardMode,setBoardMode]=useState('arrivals');
 const [timetableDay,setTimetableDay]=useState('');
 const [providerKey,setProviderKey]=useState(''),[providerRail,setProviderRail]=useState(''),[isOwner,setIsOwner]=useState(false);
 const [bootstrap,setBootstrap]=useState<any>({}),[email,setEmail]=useState(''),[password,setPassword]=useState('');
 const [saved,setSaved]=useState<Saved>({journeys:[],preferences:defaults}),[page,setPage]=useState('today'),[journeyId,setJourneyId]=useState('example'),[direction,setDirection]=useState<'outbound'|'inbound'>('outbound'),[boards,setBoards]=useState<Record<string,Board>>({}),[statuses,setStatuses]=useState<any[]>([]),[statusError,setStatusError]=useState('Loading network status…'),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[signedOut,setSignedOut]=useState(false),[error,setError]=useState(''),[toast,setToast]=useState(''),[now,setNow]=useState(Date.now()),[position,setPosition]=useState<Position>(),[locationState,setLocationState]=useState('Location is off. Using your saved walk.'),[start,setStart]=useState(0),[rail,setRail]=useState(false),[edit,setEdit]=useState<Journey>(),[editDir,setEditDir]=useState<'outbound'|'inbound'>('outbound'),[saving,setSaving]=useState(false),[pref,setPref]=useState(defaults);
 const mounted=useRef(true),refreshing=useRef(false),request=useRef(0),manualDirection=useRef(false);
 const [originOpen,setOriginOpen]=useState(false),[originPostcode,setOriginPostcode]=useState(''),[originBusy,setOriginBusy]=useState(false);
 const [boarded,setBoarded]=useState<Boarding[]>([]);
 const originRequest=useRef(0);
 const builder=useJourneyBuilder(<T,>(path:string,signal?:AbortSignal)=>api(path,undefined,signal) as Promise<T>);
 const journey=saved.journeys.find(j=>j.id===journeyId)||saved.journeys[0]||example,legs=journey[direction];
 useEffect(()=>{mounted.current=true;sessionExpired=()=>{setSignedOut(true);setBoards({});setPosition(undefined);};(async()=>{try{setBootstrap(await api('bootstrap'));const me=await api('me');csrf=me.csrf;setIsOwner(me.user.role==='owner');const s=await api('state');setSaved(s.state);setPref(s.state.preferences);setRail(s.railConfigured);if(s.state.journeys[0])setJourneyId(s.state.journeys[0].id);}catch(e){setError((e as Error).message);setSignedOut((e as Error).message.includes('Sign in'));}finally{setLoading(false);}})();const t=setInterval(()=>setNow(Date.now()),1000);return()=>{mounted.current=false;clearInterval(t);};},[]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),4500);return()=>clearTimeout(t);},[toast]);
 async function refresh(){
  if(refreshing.current||signedOut||loading)return;refreshing.current=true;setBusy(true);const id=++request.current;
  const getBoard=async(q:string):Promise<Board>=>{try{return await api(q);}catch(e){return{arrivals:[],fetchedAt:new Date().toISOString(),source:'TfL',error:(e as Error).message};}};
  try{const entries=await Promise.all(legs.map(async l=>{
   const livePromise=getBoard(l.mode==='national-rail'?`rail?crs=${l.crs}&to=${l.toCrs}`:`arrivals?stop=${encodeURIComponent(l.stop.id)}`);
   if(l.mode!=='bus')return[l.id,await livePromise] as const;
   const schedules=await Promise.all([...new Set(l.line.split(',').filter(Boolean))].slice(0,8).map(line=>getBoard(`timetable?stop=${encodeURIComponent(l.stop.id)}&line=${encodeURIComponent(line)}`)));
   return[l.id,mergeBusBoards(l,await livePromise,schedules,Date.now())] as const;
  }));if(mounted.current&&id===request.current)setBoards(Object.fromEntries(entries));}finally{refreshing.current=false;setBusy(false);}
 }
 async function loadStatus(){try{setStatuses(await api('status'));setStatusError('No line status was returned. Please refresh.');}catch(e){setStatusError((e as Error).message);}}
 useEffect(()=>{if(loading||signedOut)return;request.current++;refreshing.current=false;setBoards({});setStart(0);setBoarded([]);void refresh();const t=setInterval(()=>{if(!document.hidden)void refresh();},30000);const visible=()=>{if(!document.hidden){void refresh();setNow(Date.now());}};document.addEventListener('visibilitychange',visible);return()=>{clearInterval(t);document.removeEventListener('visibilitychange',visible);request.current++;};},[journey.id,direction,loading,signedOut,JSON.stringify(legs)]);
 useEffect(()=>{if(page!=='status'||loading||signedOut)return;void loadStatus();const t=setInterval(()=>{if(!document.hidden)void loadStatus();},30000);return()=>clearInterval(t);},[page,loading,signedOut]);
 async function persist(s:Saved){await api('state',s);setSaved(s);}
 const notify=(text:string)=>setToast(text);
 function resetOriginEditor(){
  originRequest.current++;setOriginOpen(false);setOriginPostcode('');setOriginBusy(false);
 }
 function beginEdit(j:Journey){resetOriginEditor();setEdit(structuredClone(j));setEditDir(direction);builder.reset();setPage('editor');setError('');}
 async function saveOrigin(kind:'originLookup'|'originLocate',key:'home'|'work'){
  const requestID=++originRequest.current;
  setOriginBusy(true);
  try{
   let origin:Origin;
   if(kind==='originLookup')origin=await api('origin-lookup',{postcode:originPostcode});
   else {
    const p=await getPosition();
    if(!usablePosition(p,Date.now()))throw new Error('Location is too approximate. Try again or enter a postcode.');
    origin={lat:p.lat,lon:p.lon,source:'location'};
   }
   if(requestID!==originRequest.current)return;
   setEdit(current=>current?{...current,[key]:origin}:current);
   resetOriginEditor();
  }catch(error){if(requestID===originRequest.current)setError((error as Error).message);}
  finally{if(requestID===originRequest.current)setOriginBusy(false);}
 }
 async function act(intent:string,payload?:unknown){setError('');try{
  if(['today','board','saved','status','settings'].includes(intent)){resetOriginEditor();setPage(intent);return;}
  if(intent==='login'){const r=await fetch(base+'/api/'+(bootstrap.needsSetup?'setup':'login'),{method:'POST',headers:{'Content-Type':'application/json','X-Setup-Token':setupToken},body:JSON.stringify({email,password})});if(!r.ok){const e=await r.json();throw new Error(e.error||'Sign in failed');}setPassword('');location.reload();return;}
  if(intent==='logout'){const r=await fetch(base+'/auth/logout',{method:'POST',headers:{'X-CSRF-Token':csrf}});if(!r.ok)throw new Error('Sign out failed. Please retry.');csrf='';setSaved({journeys:[],preferences:defaults});setBoards({});setPosition(undefined);setSignedOut(true);return;}
  if(intent==='showArrivals'||intent==='showTimetables'){setBoardMode(intent==='showArrivals'?'arrivals':'timetables');return;}
  if(intent==='refresh'){await refresh();if(page==='status')await loadStatus();return;}
  if(intent==='outbound'||intent==='inbound'){manualDirection.current=true;setDirection(intent);return;}
  if(intent==='locate'){
   setLocationState('Finding your location…');
   try{
    const pos=await getPosition();
    setPosition(pos);setLocationState('Location found');
    const suggest=suggestDirection(journey,pos,Date.now());
    if(suggest&&!manualDirection.current&&!boarded.length){
     setDirection(suggest);
     const key=originKey(suggest);
     notify(journey[key]?`You appear near ${originName(key)}. Showing ${suggest==='outbound'?'To work':'Going home'}.`:suggest==='outbound'?'You appear near your outward stop. Showing To work.':'You appear near your return stop. Showing Going home.');
    }
   }catch{setPosition(undefined);setLocationState('Location unavailable. Your saved walking times still work.');}
   return;
  }
  if(intent==='startHere'){setBoarded([]);setStart(Number(payload));notify('Connection plan starts at this stop.');return;}
  if(intent==='boardLeg'){
   const leg=legs[start];if(!leg)return;
   setBoarded([...boarded,{index:start,arrival:Date.now()+leg.rideMinutes*60000}]);setStart(start+1);
   void refresh();return;
  }
  if(intent==='undoBoarding'){
   const last=boarded.at(-1);if(last){setStart(last.index);setBoarded(boarded.slice(0,-1));}return;
  }
  if(intent==='restartTrip'){setStart(0);setBoarded([]);return;}
  if(intent==='importError')throw new Error(String(payload));
  if(intent==='importJourney'){let input:any;try{input=JSON.parse(String(payload));}catch{throw new Error('Choose a valid journey JSON file.');}if(input?.schema&&input.schema!==1)throw new Error('Unsupported journey file version.');const j:Journey=await api('journey-import',{journey:input?.journey??input});j.id=uid();j.outbound.forEach(l=>l.id=uid());j.inbound.forEach(l=>l.id=uid());beginEdit(j);setEditDir('outbound');notify('Review both directions, then save the journey to your account.');return;}
  if(intent==='new'){beginEdit({id:uid(),name:'My work commute',outbound:[],inbound:[]});return;}
  if(intent==='edit'){beginEdit(journey.id==='example'?{...structuredClone(example),id:uid(),name:'My work commute'}:journey);return;}
  if(intent==='openJourney'){setJourneyId(String(payload));setPage('today');return;}
  if(intent==='editJourney'){const j=saved.journeys.find(j=>j.id===payload);if(j)beginEdit(j);return;}
  if(intent==='deleteJourney'){const j=saved.journeys.find(j=>j.id===payload);if(j&&confirm(`Delete saved journey “${j.name}”?`)){await persist({...saved,journeys:saved.journeys.filter(x=>x.id!==payload)});notify('Journey removed.');}return;}
  if(intent==='cancelEdit'){resetOriginEditor();builder.reset();setEdit(undefined);setPage('today');return;}
  if(intent==='editOutbound'||intent==='editInbound'){
   if(builder.active)throw new Error('Add or cancel this leg before switching journeys.');
   resetOriginEditor();setEditDir(intent==='editOutbound'?'outbound':'inbound');return;
  }
  if(intent==='toggleOrigin'&&edit){if(originOpen)resetOriginEditor();else setOriginOpen(true);return;}
  if((intent==='originLookup'||intent==='originLocate')&&edit&&!originBusy){await saveOrigin(intent,originKey(editDir));return;}
  if(intent==='removeOrigin'&&edit){const key=originKey(editDir);resetOriginEditor();setEdit({...edit,[key]:undefined});return;}
  if(intent==='startLeg'&&edit){if(edit[editDir].length>=8)throw new Error('Use up to eight legs per direction.');resetOriginEditor();builder.start();return;}
  if(intent==='cancelLeg'){builder.reset();return;}
  if(intent==='chooseBus'){builder.chooseMode('bus');return;}
  if(intent==='chooseTrain'){builder.go('train');return;}
  if(intent==='chooseTrainMode'){builder.chooseMode(payload as Mode);return;}
  if(intent==='builderBack'){builder.back();return;}
  if(intent==='builderStop'){await builder.chooseStop(String(payload));return;}
  if(intent==='builderContinue'){await builder.loadAlighting();return;}
  if(intent==='builderAlight'){builder.alight(String(payload));return;}
  if(intent==='builderChangeRoute'){builder.changeRoute();return;}
  if(intent==='builderOptions'){builder.toggleOptions();return;}
  if(intent==='builderOverride'){builder.override();return;}
  if(intent==='removeLeg'&&edit){setEdit({...edit,[editDir]:edit[editDir].filter(l=>l.id!==payload)});return;}
  if(intent==='editLeg'&&edit){const leg=edit[editDir].find(l=>l.id===payload);if(leg){resetOriginEditor();builder.edit(leg);};return;}
  if((intent==='moveLegUp'||intent==='moveLegDown')&&edit){
   const items=[...edit[editDir]];
   const from=items.findIndex(l=>l.id===payload);
   const to=from+(intent==='moveLegUp'?-1:1);
   if(from>=0&&to>=0&&to<items.length){const [leg]=items.splice(from,1);items.splice(to,0,leg);setEdit({...edit,[editDir]:items});}
   return;
  }
  if(intent==='addLeg'&&edit){
   const leg=builder.checkedLeg(),items=edit[editDir];
   setEdit({...edit,[editDir]:builder.editing?items.map(l=>l.id===leg.id?leg:l):[...items,leg]});
   notify(builder.editing?'Leg updated.':'Leg added. You can add another or save.');builder.reset();return;
  }
  if(intent==='saveJourney'&&edit){if(builder.active)throw new Error('Add or cancel the current leg before saving your journey.');if(!edit.name.trim())throw new Error('Give your journey a name.');if(!edit.outbound.length&&!edit.inbound.length)throw new Error('Add at least one leg before saving.');setSaving(true);try{await persist({...saved,journeys:[...saved.journeys.filter(j=>j.id!==edit.id),edit]});setJourneyId(edit.id);setDirection(editDir);setPage('today');setEdit(undefined);notify('Journey saved to your account.');}finally{setSaving(false);}return;}
  if(intent==='saveProviders'){const result=await api('providers',{tflKey:providerKey,railToken:providerRail});setRail(result.railConfigured);setProviderKey('');setProviderRail('');notify('Transport data connections saved.');await refresh();return;}
  if(intent==='savePreferences'){if(!Number.isFinite(pref.buffer)||pref.buffer<1||pref.buffer>15||!Number.isFinite(pref.finalWalk)||pref.finalWalk<0||pref.finalWalk>60)throw new Error('Use a buffer of 1–15 minutes and a final walk of 0–60 minutes.');await persist({...saved,preferences:pref});notify('Preferences saved.');}
 }catch(e){setError((e as Error).message);}}
 function change(name:string,value:string){
  setError('');
  if(name.startsWith('builder')){builder.change(name,value);return;}
  if(name==='timetableDay')setTimetableDay(value);
  if(name==='providerKey')setProviderKey(value);
  if(name==='providerRail')setProviderRail(value);
  if(name==='email')setEmail(value);
  if(name==='password')setPassword(value);
  if(name==='journey'){setJourneyId(value);manualDirection.current=false;}
  if(name==='journeyName'&&edit)setEdit({...edit,name:value});
  if(name==='originPostcode')setOriginPostcode(value);
  if(['buffer','walkSpeed','finalWalk'].includes(name))setPref({...pref,[name]:Number(value)});
 }
 const lastBoarded=boarded.at(-1),onBoard=!!lastBoarded&&lastBoarded.arrival>now;
 const prefs=saved.preferences,origin=journey[originKey(direction)],steps=connect(legs,boards,prefs,now,lastBoarded?undefined:position,start,origin,lastBoarded?.arrival),first=steps[0],last=steps.at(-1),complete=steps.length>0&&steps.every(s=>s.chosen),firstBoard=first&&boards[first.leg.id],next=first?candidates(first.leg,firstBoard,now):[],chosen=first?.chosen;
 const startingPoint=originName(originKey(direction)),editOriginName=originName(originKey(editDir)),editOrigin=edit?.[originKey(editDir)];
 const locationLabel=lastBoarded?'Journey in progress':first?.walkSource==='live'?'Using your location · approximate walking time':
  first?.walkSource==='origin'?`Starting from saved ${startingPoint} · ${first.walk} min estimated walk`:
  position&&!usablePosition(position,now)?'Location expired or approximate. Using saved walk.':
  position?'Your location is too far from this stop. Using saved walk.':locationState;
 const row=(a:Arrival,l:Leg,b:Board|undefined)=>({line:a.lineName||l.lineName,tone:tone(l.mode),destination:a.destinationName,detail:[a.platformName,a.timetabled?'Scheduled · not live':'',a.cancelled?'Cancelled':b&&!fresh(a,b,now)?'Out of date':a.id===steps.find(s=>s.leg.id===l.id)?.chosen?.id?'Recommended connection':a.timetabled?'':a.status||'Live prediction'].filter(Boolean).join(' · '),minutes:a.cancelled?'Cancelled':a.expectedArrival&&Number.isFinite(Date.parse(a.expectedArrival))?`${minutes(a.expectedArrival,now)} min`:a.status||'Time unknown',clock:a.expectedArrival&&Number.isFinite(Date.parse(a.expectedArrival))?clock(a.expectedArrival):a.scheduled||''});
 const tripSteps=legs.map((leg,index)=>{
  const step=steps[index-start],progress=boarded.find(item=>item.index===index);
  const active=index===start;
  const phase=progress?(progress===lastBoarded&&onBoard?'On board':'Boarded'):index<start?'Skipped':active?'Next leg':'Later';
  return {index,phase,icon:leg.mode==='bus'?'bus':'train',tone:tone(leg.mode),title:`${leg.lineName} · ${leg.stop.name}`,
   summary:`${index+1}. ${leg.lineName} → ${leg.to}`,showStart:index>start&&!onBoard,
   walkLabel:step?`${step.walk} MIN ${index===0||!lastBoarded&&active?'WALK TO STOP':'INTERCHANGE WALK'} · ESTIMATE`:phase,
   time:step?.chosen?clock(step.chosen.expectedArrival):phase,
   detail:`To ${leg.to} · ${step?.chosen?rideTime(leg,step.chosen):leg.rideMinutes} min estimated ride`,
   connection:progress?`Estimated arrival ${clock(progress.arrival)}`:step?.chosen?`${step.chosen.platformName||step.chosen.destinationName} · ${Math.ceil(step.wait!)} min wait · arrive ${clock(step.arriveAt!)}`:step?.reason||''};
 });
 const nextReady=lastBoarded&&first?first.readyAt+prefs.buffer*60000:now;
 const quickNext=firstBoard?next.filter(a=>!a.cancelled&&fresh(a,firstBoard,now)&&Date.parse(a.expectedArrival)>=nextReady).slice(0,2):[];
 const tripProgress=lastBoarded
  ?onBoard?`On board · estimated arrival at ${legs[lastBoarded.index]?.to} at ${clock(lastBoarded.arrival)}`
   :first?'Previous leg boarded. Check your next connection.':'All legs marked as boarded.'
  :'';
 const headings:Record<string,[string,string]>={today:[direction==='outbound'?'A smoother way to work.':'Let’s get you home.','Your next ride. Your next connection. A little less guesswork.'],board:['Every arrival, in one place.','Live arrivals, scheduled departures and full-day bus timetables.'],status:['Know before you go.','Service updates across the London transport network.'],saved:['The journeys you know.','Save your regular routes. We’ll keep an eye on the next ride.'],settings:['Make it your commute.','A few small preferences for a journey that fits you.'],editor:['Build your everyday journey.','Your stops, your services, both directions.']};
 const busTimetables=legs.filter(l=>l.mode==='bus').flatMap(l=>(boards[l.id]?.timetables||[]).map(t=>({...t,stopName:l.stop.name})));
 const timetableOptions=[{value:'',label:'Today’s confirmed pattern'},...[...new Set(busTimetables.flatMap(t=>t.schedules.map(s=>s.name)))].map(name=>({value:name,label:name}))];
 const timetableCards=busTimetables.map(t=>{const selected=t.schedules.filter(s=>s.name===(timetableDay||t.todaySchedule));return{title:`${t.lineName} · ${t.stopName}`,message:t.warning||'Published schedule. Disruptions and traffic may change actual service.',empty:!selected.length,patterns:selected.map(s=>({name:s.name,rows:timetableRows(s),frequencies:s.frequencies.map(text=>({text}))}))};});
 const recommendedTrain=steps.find(s=>s.leg.mode!=='bus'&&s.chosen);
 const d:any={hasBusLegs:legs.some(l=>l.mode==='bus'),showUpcoming:boardMode==='arrivals',showTimetables:boardMode==='timetables'&&busTimetables.length>0,arrivalsVariant:boardMode==='arrivals'?'selected':'segment',timetablesVariant:boardMode==='timetables'?'selected':'segment',emptyTimetables:boardMode==='timetables'&&!busTimetables.length,timetableDay,timetableOptions,timetableCards,hasBusTimetables:busTimetables.length>0,isOwner,providerKey,providerRail,localLogin:bootstrap.oidc===false,localLoginDescription:bootstrap.needsSetup?'Local preview setup. Use the one-time link printed by the app and a password of at least 12 characters.':'Local preview account. Managed installations use MyAccounts automatically.',localLoginLabel:bootstrap.needsSetup?'Create local account':'Sign in',email,password,time:clock(now),date:new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',timeZone:'Europe/London'}).format(now).toUpperCase(),title:headings[page][0],subtitle:headings[page][1],error,toast,loading,signedOut,loginURL:base+'/auth/login',logoutURL:base+'/auth/logout',busy,refreshLabel:busy?'Updating…':'Refresh',example:journey.id==='example'&&['today','board'].includes(page),showJourney:page==='today',showBoard:page==='board',showStatus:page==='status',showSaved:page==='saved',showSettings:page==='settings',showEditor:page==='editor',journeyId:journey.id,journeyOptions:(saved.journeys.length?saved.journeys:[example]).map(j=>({value:j.id,label:j.name})),outboundVariant:direction==='outbound'?'selected':'segment',inboundVariant:direction==='inbound'?'selected':'segment',locationLabel,locationButton:position?'Update location':'Use my location',emptyDirection:!legs.length,directionSuggestion:'',heroBadge:chosen?(chosen.timetabled?'SCHEDULED CONNECTION · NOT LIVE':'YOUR NEXT CONNECTION'):'WAITING FOR LIVE DATA',heroKicker:chosen?`${modeLabel[first.leg.mode]} · ${first.leg.lineName}`:'A clearer journey starts here',heroTitle:chosen?`${chosen.timetabled?'Plan for':'Catch the'} ${clock(chosen.expectedArrival)}`:'Let’s find your next ride',heroCopy:chosen?`Towards ${chosen.destinationName}. ${first.walk} min to your stop, with ${prefs.buffer} min breathing room.`:first?.reason||'Add your journey to start planning.',leaveBy:lastBoarded&&first?clock(first.readyAt):chosen?clock(Date.parse(chosen.expectedArrival)-(first.walk+prefs.buffer)*60000):'—',arriveBy:complete?clock(last!.arriveAt!+prefs.finalWalk*60000):'—',platformWait:recommendedTrain?`${Math.ceil(recommendedTrain.wait!)} min`:'—',estimateNote:complete?(steps.some(s=>s.chosen?.timetabled)?'This plan includes scheduled buses, not confirmed live vehicles. Arrival and platform wait are estimates.':'Arrival is estimated using your saved ride and walking times.'):'Connections use live predictions or clearly labelled published bus departures. Frequency-only services cannot give an exact connection.',steps:tripSteps,destination:legs.at(-1)?.to||'Your destination',finalWalkLabel:`${prefs.finalWalk} min final walk · estimated`,firstStop:first?.leg.stop.name||'',feedTone:firstBoard&&!firstBoard.error&&next.some(a=>!a.timetabled&&fresh(a,firstBoard,now))?'mint':next.some(a=>a.timetabled)?'amber':'neutral',feedLabel:firstBoard?.error?'Unavailable':next.some(a=>!a.timetabled&&firstBoard&&fresh(a,firstBoard,now))?'Live':next.some(a=>a.timetabled)?'Scheduled':'No times',nextArrivals:quickNext.map(a=>row(a,first.leg,firstBoard)),noNextArrivals:!quickNext.length,firstBoardMessage:first?.reason||'Add stops to see arrivals.',bufferNote:`We allow ${prefs.buffer} minutes before boarding, plus your walking time. You can slow the pace or give yourself more time.`,updatedLabel:firstBoard?`Last checked ${clock(firstBoard.fetchedAt)} · ${firstBoard.source}`:'Waiting for a feed response.',boards:legs.map(l=>{const b=boards[l.id];const aa=(b?.arrivals||[]).filter(a=>matches(a,l)).filter(a=>!a.expectedArrival||Date.parse(a.expectedArrival)>=now||a.cancelled).sort((a,b)=>Date.parse(a.expectedArrival)-Date.parse(b.expectedArrival));return{label:modeLabel[l.mode],name:l.stop.name,tone:b&&!b.error?'mint':'neutral',state:b?.error?'Unavailable':aa.some(a=>!a.timetabled&&fresh(a,b!,now))?'Live':aa.some(a=>a.timetabled)?'Scheduled':'No times',filter:`${l.lineName} · ${l.services?.length?'towards '+[...new Set(l.services.map(s=>s.terminus))].join(' / '):l.destination?'towards '+l.destination:l.direction&&!['inbound','outbound'].includes(l.direction)?l.direction:'Selected stop'} · get off at ${l.to}`,rows:aa.map(a=>row(a,l,b)),message:[b?.error,b?.liveError?`Live arrivals unavailable: ${b.liveError}`:'',b?.timetableError,...(b?.timetables||[]).map(t=>t.warning),!aa.length?'No matching departures available. Check your filters or browse the bus timetable.':`${aa.length} services · ${b?.source} · checked ${clock(b!.fetchedAt)}`].filter(Boolean).join(' ')};}),statuses:statuses.map(s=>({name:s.name,status:s.lineStatuses?.map((x:any)=>x.statusSeverityDescription).join(', ')||'Status unavailable',tone:s.lineStatuses?.every((x:any)=>x.statusSeverity===10)?'mint':'amber',reason:s.lineStatuses?.map((x:any)=>x.reason||'').join(' ')||''})),noStatus:!statuses.length,statusMessage:statusError,noSaved:!saved.journeys.length,savedJourneys:saved.journeys.map(j=>({...j,description:`${j.outbound.length} legs to work · ${j.inbound.length} legs going home`})),buffer:pref.buffer,walkSpeed:pref.walkSpeed,finalWalk:pref.finalWalk,walkOptions:[{value:3,label:'Relaxed · 3 km/h'},{value:4.5,label:'Steady · 4.5 km/h'},{value:5.5,label:'Brisk · 5.5 km/h'}],railAvailability:rail?'National Rail: Darwin credentials configured on this server.':'National Rail: live boards require a server-side Darwin access token. TfL feeds work independently.',editorTitle:'Your saved route',editName:edit?.name||'',editOutboundVariant:editDir==='outbound'?'selected':'segment',editInboundVariant:editDir==='inbound'?'selected':'segment',
 nextTitle:first?(first.leg.mode==='bus'?'Next buses':'Next trains'):'Journey progress',showConnectionPlan:!!first,tripProgress,canUseLocation:boarded.length===0,canUndoBoarding:boarded.length>0,readyLabel:lastBoarded?'EST. AT NEXT STOP':'LEAVE BY',boardLegLabel:first?.leg.mode==='bus'?'I’m on the bus':'I’m on the train',
 builder:{...builder.view,cannotContinue:!builder.view.canContinue},buildingLeg:builder.active,showLegList:!builder.active,
 editLegs:(edit?.[editDir]||[]).map((l,i,items)=>({id:l.id,icon:l.mode==='bus'?'bus':'train',title:`${i+1}. ${l.lineName} · ${l.stop.name}`,detail:`${l.to} · ${l.walkMinutes} min walk + ${l.rideMinutes} min ride`,first:i===0,last:i===items.length-1})),
 editOriginName,originOpen,originPostcode,originBusy,originPostcodeLabel:`${editOriginName} postcode`,hasEditOrigin:!!editOrigin,postcodeDisabled:originBusy||originPostcode.trim().length<5,
 originAction:originOpen?'Close':editOrigin?'Change starting point':'Set starting point',
 originDescription:editOrigin?(editOrigin.source==='postcode'?'Saved from a postcode · approximate':'Saved from your device location'):`Optional. Set ${editOriginName} to estimate the walk to your first stop.`,
 editorSummary:`${edit?.outbound.length||0} outward · ${edit?.inbound.length||0} return legs`,saving:saving||originBusy};
 for(const tab of ['today','board','status','saved','settings'])d[tab+'Variant']=page===tab?'nav-active':'nav';
 return h(Actions.Provider,{value:{act,change}},h(Dashboard,{data:d,onAction:act}));
}
createRoot(document.getElementById('root')!).render(h(App));
