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

export function timetableGroups(schedule:{departures:{time:string;destination:string;minutes:number}[]}) {
 const destinations=new Map<string,Map<number,Set<string>>>();
 for(const departure of [...schedule.departures].sort((a,b)=>a.minutes-b.minutes)){
  const hour=Math.floor(departure.minutes/60);
  const rows=destinations.get(departure.destination)||new Map<number,Set<string>>();
  const times=rows.get(hour)||new Set<string>();
  times.add(departure.time);
  rows.set(hour,times);
  destinations.set(departure.destination,rows);
 }
 return [...destinations].map(([destination,rows])=>({
  heading:destination?`Towards ${destination}`:'Destination not supplied',
  rows:[...rows].map(([hour,times])=>({
   hour:String(hour).padStart(2,'0'),
   times:[...times].map(text=>({text})),
  })),
 }));
}

export function frequencyWindow(text:string){
 const split=text.indexOf(': ');
 const detail=split<0?text:text.slice(split+2);
 return {window:split<0?'':text.slice(0,split),detail:detail.charAt(0).toUpperCase()+detail.slice(1)};
}
