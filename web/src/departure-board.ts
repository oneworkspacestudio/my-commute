import {fresh,predictionRetention,timetableRetention} from './engine';
import type {Arrival,Board} from './engine';

export function offlineBoard(previous:Board|undefined,source:string,error:string,now:number):Board{
 if(previous){
  const age=now-Date.parse(previous.fetchedAt);
  const limit=previous.timetable?timetableRetention:predictionRetention;
  if(age>=-60_000&&age<limit)return {...previous,cacheState:'estimated',refreshError:error};
 }
 return {arrivals:[],fetchedAt:'',source,error};
}

export function fetchAge(fetchedAt:string,now:number){
 const seconds=Math.max(0,Math.floor((now-Date.parse(fetchedAt))/1000));
 if(!Number.isFinite(seconds))return '';
 return seconds<60?`${seconds}s ago`:`${Math.floor(seconds/60)} min ago`;
}

export function boardFreshness(board:Board|undefined,now:number){
 if(!board)return '';
 const age=fetchAge(board.fetchedAt,now);
 if(!age){
  const scheduled=board.arrivals.find(arrival=>arrival.scheduleFetchedAt&&Date.parse(arrival.expectedArrival)>=now&&fresh(arrival,board,now));
  return scheduled?`Timetable fetched ${fetchAge(scheduled.scheduleFetchedAt!,now)}`:'';
 }
 if(board.cacheState==='estimated'){
  const expired=now-Date.parse(board.fetchedAt)>=predictionRetention;
  return `Last live fetch ${age} · ${expired?'cached estimates expired':'cached estimates'}`;
 }
 if(board.cacheState==='cached')return `Cached · fetched ${age}`;
 return `Last live fetch ${age}`;
}

export function boardBadge(board:Board|undefined,arrivals:Arrival[],now:number){
 if(!board)return {label:'Loading',tone:'neutral'};
 const valid=arrivals.filter(arrival=>!arrival.cancelled&&fresh(arrival,board,now));
 if(valid.some(arrival=>!arrival.timetabled)){
  if(board.cacheState==='estimated')return {label:'Estimated',tone:'amber'};
  if(board.cacheState==='cached')return {label:'Cached',tone:'neutral'};
  return {label:'Live',tone:'mint'};
 }
 if(valid.some(arrival=>arrival.timetabled))return {label:'Scheduled',tone:'amber'};
 if(board.error||board.refreshError||board.liveError)return {label:'Unavailable',tone:'neutral'};
 return {label:'No times',tone:'neutral'};
}
