import {useEffect,useRef,useState} from 'react';
import type {Board,Leg,LegService,Mode,Stop} from './engine';
import {pathsTo,routeDetails} from './route-paths';
import type {Load,Path} from './route-paths';

type Stage='summary'|'mode'|'train'|'board'|'services'|'alight'|'review';
export const modeLabel:Record<Mode,string>={bus:'Bus',tube:'Underground',overground:'Overground','elizabeth-line':'Elizabeth line',dlr:'DLR','national-rail':'National Rail'};
const trainModes=(Object.keys(modeLabel) as Mode[]).filter(mode=>mode!=='bus');
const emptyStop:Stop={id:'',name:'',lat:0,lon:0};
function newLeg(mode:Mode,id:string=crypto.randomUUID()):Leg {
 return {id,mode,stop:emptyStop,line:'',lineName:'',direction:'',destination:'',rideMinutes:0,walkMinutes:5,to:''};
}

function describeError(error:unknown){return error instanceof Error?error.message:'Transport data is unavailable.';}

export function useJourneyBuilder(load:Load){
 const [stage,setStage]=useState<Stage>('summary');
 const [leg,setLeg]=useState<Leg>(()=>newLeg('bus'));
 const [editing,setEditing]=useState(false);
 const [query,setQuery]=useState('');
 const [results,setResults]=useState<Stop[]>([]);
 const [busRoutes,setBusRoutes]=useState<LegService[]>([]);
 const [paths,setPaths]=useState<Path[]>([]);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState('');
 const [optionsOpen,setOptionsOpen]=useState(false);
 const [autoRide,setAutoRide]=useState(0);
 const [autoSource,setAutoSource]=useState('');
 const pending=useRef<AbortController|undefined>(undefined);

 function go(next:Stage){
  pending.current?.abort();
  setBusy(false);setQuery('');setResults([]);setNotice('');setStage(next);
 }
 function reset(){go('summary');setEditing(false);setOptionsOpen(false);setPaths([]);setBusRoutes([]);setAutoRide(0);setAutoSource('');}
 function start(){reset();setLeg(newLeg('bus'));setStage('mode');}
 function edit(existing:Leg){
  reset();setEditing(true);setLeg(structuredClone(existing));setAutoRide(existing.services?.length?Math.max(...existing.services.map(s=>s.minutes)):existing.rideMinutes);setAutoSource(existing.rideSource||'Saved estimate');setStage('review');
 }
 function setUpReturn(existing:Leg,boarding:string){
  reset();setEditing(true);setLeg({...newLeg(existing.mode,existing.id),walkMinutes:existing.walkMinutes});setQuery(boarding);setStage('board');
 }
 function chooseMode(mode:Mode){setLeg({...newLeg(mode,leg.id),walkMinutes:leg.walkMinutes});go('board');}
 function changeRoute(){setLeg({...newLeg(leg.mode,leg.id),walkMinutes:leg.walkMinutes});setPaths([]);setBusRoutes([]);setAutoRide(0);setAutoSource('');go('board');}

 const searching=stage==='board'||(stage==='alight'&&leg.mode==='national-rail');
 useEffect(()=>{
  const term=query.trim();
  if(!searching||term.length<2)return;
  const controller=new AbortController();
  const timer=setTimeout(async()=>{
   setBusy(true);
   try {
    const stops=await load<Stop[]>(`search?q=${encodeURIComponent(term)}&mode=${leg.mode}`,controller.signal);
    if(!controller.signal.aborted){setResults(stops);setNotice(stops.length?'':'No matches. Try another stop or station name.');}
   } catch(error){if(!controller.signal.aborted)setNotice(describeError(error));}
   finally{if(!controller.signal.aborted)setBusy(false);}
  },300);
  return()=>{clearTimeout(timer);controller.abort();};
 },[query,searching,leg.mode,stage]);

 useEffect(()=>{
  if(stage!=='services'||leg.mode!=='bus')return;
  const controller=new AbortController();
  setBusy(true);setNotice('');setBusRoutes([]);
  load<LegService[]>(`bus-services?stop=${encodeURIComponent(leg.stop.id)}`,controller.signal).then(routes=>{
   if(!controller.signal.aborted){setBusRoutes(routes);if(!routes.length)setNotice('No active bus routes were found at this boarding stop.');}
  }).catch(error=>{if(!controller.signal.aborted)setNotice(describeError(error));}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});
  return()=>controller.abort();
 },[stage,leg.stop.id,leg.mode]);

 useEffect(()=>{
  if(stage!=='review'||leg.mode!=='national-rail'||leg.rideOverride||!leg.alight||!leg.crs||!leg.toCrs||!(/^[A-Z]{3}$/).test(leg.crs)||!(/^[A-Z]{3}$/).test(leg.toCrs)||leg.crs===leg.toCrs)return;
  const controller=new AbortController();
  const timer=setTimeout(async()=>{
   setBusy(true);setNotice('');
   try {
    const board=await load<Board>(`rail?crs=${leg.crs}&to=${leg.toCrs}`,controller.signal);
    if(controller.signal.aborted)return;
    const times=board.arrivals.filter(a=>!a.cancelled&&a.rideMinutes).map(a=>a.rideMinutes!);
    const minutes=times.length?Math.max(...times):0;
    setAutoRide(minutes);setAutoSource(minutes?'National Rail timetable':'');
    setLeg(current=>({...current,rideMinutes:minutes,rideSource:minutes?'National Rail timetable':undefined}));
    if(!minutes)setNotice('No scheduled travel time was returned. Set a duration override to use this leg.');
   } catch(error){if(!controller.signal.aborted)setNotice(describeError(error));}
   finally{if(!controller.signal.aborted)setBusy(false);}
  },300);
  return()=>{clearTimeout(timer);controller.abort();};
 },[stage,leg.mode,leg.alight?.id,leg.crs,leg.toCrs,leg.rideOverride]);

 async function chooseStop(id:string){
  if(!results.some(s=>s.id===id))return;
  pending.current?.abort();const controller=new AbortController();pending.current=controller;setBusy(true);setNotice('');
  try {
   const stop=await load<Stop>(`stop?id=${encodeURIComponent(id)}`,controller.signal);
   if(controller.signal.aborted)return;
   if(stage==='board'){
    setLeg(current=>({...current,stop,line:'',lineName:'',services:undefined,alight:undefined,to:'',rideMinutes:0,rideOverride:false,rideSource:undefined}));
    go(leg.mode==='national-rail'?'alight':'services');
   } else {
    if(stop.id===leg.stop.id){setNotice('Choose a different station to get off at.');return;}
    setLeg(current=>({...current,alight:stop,to:stop.name,rideMinutes:0,lineName:modeLabel[leg.mode]}));
    go('review');
   }
  } catch(error){if(!controller.signal.aborted)setNotice(describeError(error));}
  finally{if(!controller.signal.aborted)setBusy(false);}
 }

 const routes=leg.mode==='bus'?Array.from(new Set(busRoutes.map(r=>r.lineId))).map(id=>({id,name:id.toUpperCase(),towards:[...new Set(busRoutes.filter(r=>r.lineId===id).map(r=>r.terminus))]})):(leg.stop.lines||[]).map(line=>({...line,towards:[]}));
 const selected=leg.line.split(',').filter(Boolean);
 function selectRoutes(value:string){
  const ids=value.split(',').filter(id=>routes.some(r=>r.id===id));
  if(ids.length>8){setNotice('Choose up to eight services for one leg.');return;}
  setNotice('');setLeg(current=>({...current,line:ids.join(','),lineName:ids.map(id=>routes.find(r=>r.id===id)?.name).join(' / ')}));
 }
 async function loadAlighting(){
  if(!selected.length||busy)return;
  pending.current?.abort();const controller=new AbortController();pending.current=controller;setBusy(true);setNotice('');
  try {
   const choices=await Promise.all(selected.map(async id=>{
    const dirs=leg.mode==='bus'?[...new Set(busRoutes.filter(r=>r.lineId===id).map(r=>r.direction))]:[''];
    const results=await Promise.allSettled(dirs.map(direction=>load<Path[]>(`service-paths?mode=${leg.mode}&line=${encodeURIComponent(id)}&stop=${encodeURIComponent(leg.stop.id)}&direction=${direction}`,controller.signal)));
    const list=results.flatMap(result=>result.status==='fulfilled'?result.value:[]);
    if(!list.length)throw new Error(`Stops for ${id.toUpperCase()} could not be loaded. Retry or select other services.`);
    return list;
   }));
   if(!controller.signal.aborted){setPaths(choices.flat());go('alight');}
  } catch(error){if(!controller.signal.aborted)setNotice(describeError(error));}
  finally{if(!controller.signal.aborted)setBusy(false);}
 }

 const allStops=Array.from(new Map(paths.flatMap(path=>path.stops.map(stop=>[stop.id,stop] as const))).values());
 const commonStops=stage==='alight'&&leg.mode!=='national-rail'?allStops.filter(stop=>{
  const served=new Set(pathsTo(paths,stop.id).map(p=>p.lineId));
  return selected.every(id=>served.has(id));
 }):[];
 function alight(id:string){
  const stop=commonStops.find(s=>s.id===id);if(!stop)return;
  const details=routeDetails(paths,stop,busRoutes);
  setAutoRide(details.rideMinutes);setAutoSource(details.rideSource||'');
  setLeg(current=>({...current,...details}));
  go('review');
 }

 function back(){
  if(stage==='train'||stage==='board')go('mode');
  else if(stage==='services')go('board');
  else if(stage==='alight')go(leg.mode==='national-rail'?'board':'services');
  else if(stage==='review')changeRoute();
 }
 function override(){
  setNotice('');setOptionsOpen(true);
  setLeg(current=>({...current,rideOverride:!current.rideOverride,rideMinutes:current.rideOverride?autoRide:current.rideMinutes,rideSource:autoSource||undefined}));
 }
 function change(name:string,value:string){
  if(name==='builderSearch'){pending.current?.abort();setQuery(value);setResults([]);setNotice('');setBusy(false);return;}
  if(name==='builderServices'){selectRoutes(value);return;}
  if(name==='builderWalk'||name==='builderRide'){setLeg(current=>({...current,[name==='builderWalk'?'walkMinutes':'rideMinutes']:Number(value)}));return;}
  if(name==='builderCrs'||name==='builderToCrs'){
   setAutoRide(0);setAutoSource('');
   setLeg(current=>({...current,[name==='builderCrs'?'crs':'toCrs']:value.toUpperCase(),rideMinutes:current.rideOverride?current.rideMinutes:0,rideSource:undefined}));
  }
 }
 function checkedLeg(){
  if(stage!=='review'||busy)throw new Error('Finish this leg before adding it.');
  if(leg.mode==='national-rail'&&(!/^[A-Z]{3}$/.test(leg.crs||'')||!/^[A-Z]{3}$/.test(leg.toCrs||'')||leg.crs===leg.toCrs))throw new Error('Enter different three-letter station codes.');
  if(!leg.stop.id||!leg.to.trim()||(leg.mode!=='national-rail'&&!leg.line))throw new Error('Choose a boarding stop, service and stop to get off at.');
  if(!Number.isFinite(leg.rideMinutes)||leg.rideMinutes<1||leg.rideMinutes>180)throw new Error('Add a duration override between 1 and 180 minutes.');
  if(!Number.isFinite(leg.walkMinutes)||leg.walkMinutes<0||leg.walkMinutes>90)throw new Error('Enter a walking time between 0 and 90 minutes.');
  return leg;
 }

 const contains=(text:string)=>text.toLowerCase().includes(query.trim().toLowerCase());
 const view={
  showMode:stage==='mode',showTrain:stage==='train',showBoardStop:stage==='board',showServices:stage==='services',showAlight:stage==='alight',showReview:stage==='review',
  showBack:!['summary','mode','review'].includes(stage),showSearch:searching,searchLabel:stage==='board'?(leg.mode==='bus'?'Find your boarding stop':'Find your boarding station'):'Find the station you get off at',
  title:{summary:'',mode:'Choose transport',train:'Choose a train type',board:'Where do you board?',services:leg.mode==='bus'?'Which buses can you take?':'Which lines can you take?',alight:'Where do you get off?',review:'Review this leg'}[stage],
  trainModes:trainModes.map(id=>({id,label:modeLabel[id]})),query,busy,notice,stopName:leg.stop.name,
  searchResults:results.map(s=>({id:s.id,label:s.name})),
  serviceLabel:leg.mode==='bus'?'Search bus number or destination':'Search train line',
  serviceOptions:routes.filter(r=>selected.includes(r.id)||[r.name,...r.towards].some(contains)).map(r=>({value:r.id,label:r.towards.length?`${r.name} towards ${r.towards.join(' / ')}`:r.name})),
  hasServices:routes.length>0,selectedServices:leg.line,canContinue:!busy&&selected.length>0,
  rail:leg.mode==='national-rail',noCommonStop:stage==='alight'&&leg.mode!=='national-rail'&&!commonStops.length,
  alightOptions:commonStops.filter(s=>contains(s.name)).map(s=>({id:s.id,label:s.name})),
  crs:leg.crs||'',toCrs:leg.toCrs||'',summary:`${leg.lineName||modeLabel[leg.mode]} · ${leg.stop.name} → ${leg.to}`,
  destinations:[...new Set(leg.services?.map(s=>s.terminus)||[])].join(' / '),
  estimate:leg.rideMinutes?`${leg.rideMinutes} min · ${leg.rideOverride?'Duration override':leg.rideSource||'Saved estimate'}`:'Travel time unavailable',
  optionsOpen,optionsLabel:optionsOpen?'Hide time options':'Time options',walk:leg.walkMinutes,ride:leg.rideMinutes||'',override:!!leg.rideOverride,overrideLabel:leg.rideOverride?'Use automatic time':'Override ride time',addLabel:editing?'Update leg':'Add leg to journey',
 };
 return {stage,active:stage!=='summary',editing,reset,start,edit,setUpReturn,go,chooseMode,chooseStop,loadAlighting,alight,back,changeRoute,override,change,checkedLeg,view,toggleOptions:()=>setOptionsOpen(!optionsOpen)};
}
