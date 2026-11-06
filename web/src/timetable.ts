import {fresh,matches} from './engine.ts';
import type {Arrival,Board,Leg} from './engine';

// Merge predictions and published times without showing a scheduled duplicate
// beside its live vehicle, or resurrecting a cancelled service as a fallback.
export function mergeBusBoards(leg:Leg,live:Board,schedules:Board[],now:number):Board {
 const predictions=live.error?[]:live.arrivals.filter(a=>!a.timetabled&&matches(a,leg)&&fresh(a,live,now));
 const scheduled=schedules.flatMap(b=>b.error?[]:b.arrivals.filter(a=>a.timetabled&&matches(a,leg)&&fresh(a,b,now)));
 const result:Arrival[]=[...predictions];const ids=new Set<string>();
 for(const a of scheduled){
  const at=Date.parse(a.expectedArrival);if(at<now||!Number.isFinite(at))continue;
  const same=predictions.filter(p=>p.lineId===a.lineId&&p.direction===a.direction);
  if(same.some(p=>p.cancelled&&(!p.expectedArrival||Math.abs(Date.parse(p.expectedArrival)-at)<=180000)))continue;
  const horizon=Math.max(-Infinity,...same.map(p=>Date.parse(p.expectedArrival)).filter(Number.isFinite));
  if(at<=horizon+120000||ids.has(a.id))continue;
  ids.add(a.id);result.push(a);
 }
 const failures=schedules.filter(b=>b.error).map(b=>b.error).join(' ');
 return {arrivals:result.sort((a,b)=>Date.parse(a.expectedArrival)-Date.parse(b.expectedArrival)),fetchedAt:new Date(now).toISOString(),source:'TfL live arrivals + published bus timetables',timetables:schedules.flatMap(b=>b.timetable?[b.timetable]:[]),liveError:live.error,timetableError:failures||undefined,error:!result.length&&live.error&&schedules.every(b=>b.error)?live.error:undefined};
}

export function timetableRows(schedule:{departures:{time:string;destination:string;minutes:number}[]}) {
 const groups=new Map<string,{hour:string;destination:string;times:string[]}>();
 for(const d of schedule.departures){const hour=String(Math.floor(d.minutes/60)).padStart(2,'0');const key=hour+'|'+d.destination;const group=groups.get(key)||{hour,destination:d.destination,times:[]};if(!group.times.includes(d.time.slice(-2)))group.times.push(d.time.slice(-2));groups.set(key,group);}
 return [...groups.values()].map(g=>({hour:g.hour+':',destination:g.destination||'Destination not supplied',times:g.times.join(' · ')}));
}
