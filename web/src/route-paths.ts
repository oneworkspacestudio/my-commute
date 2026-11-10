import {destinationKey} from './engine';
import type {Leg,LegService,Stop} from './engine';

export type Path=Omit<LegService,'minutes'>&{source:string;stops:(Stop&{minutes:number})[]};
export type Load=<T>(path:string,signal?:AbortSignal)=>Promise<T>;

function branchKey(path:Pick<LegService,'lineId'|'direction'|'terminusId'>){
 return [path.lineId,path.direction,path.terminusId].join('|');
}

export function pathsTo(paths:Path[],stopId:string){
 const missing=new Set(paths.filter(path=>!path.stops.some(stop=>stop.id===stopId)).map(branchKey));
 return paths.filter(path=>!missing.has(branchKey(path)));
}

export function routeDetails(paths:Path[],stop:Stop,busRoutes:LegService[]):Pick<Leg,'to'|'alight'|'services'|'direction'|'destination'|'rideMinutes'|'rideSource'|'rideOverride'>{
 const usable=pathsTo(paths,stop.id),branches=new Map<string,LegService>();
 for(const path of usable){
  const aliases=busRoutes.filter(route=>route.lineId===path.lineId&&route.direction===path.direction);
  const sameTerminus=paths.filter(other=>other.lineId===path.lineId&&other.direction===path.direction).every(other=>other.terminusId===path.terminusId);
  const alias=aliases.find(route=>destinationKey(route.terminus)===destinationKey(path.terminus))||(aliases.length===1&&sameTerminus?aliases[0]:undefined);
  const service={lineId:path.lineId,direction:path.direction,terminus:path.terminus,terminusId:path.terminusId,
   vehicleDestination:alias?.vehicleDestination,minutes:path.stops.find(point=>point.id===stop.id)!.minutes};
  const key=branchKey(service);
  if((branches.get(key)?.minutes||0)<service.minutes)branches.set(key,service);
 }
 const services=[...branches.values()];
 return {to:stop.name,alight:{id:stop.id,name:stop.name,lat:stop.lat,lon:stop.lon},services,direction:'',destination:'',
  rideMinutes:Math.max(...services.map(service=>service.minutes)),
  rideSource:usable.some(path=>path.source!=='TfL timetable')?'Estimate from TfL stop spacing':'TfL timetable',rideOverride:false};
}
