import {destinationKey,distance} from './engine';
import type {Board,Leg,LegService,Stop} from './engine';
import {pathsTo,routeDetails} from './route-paths';
import type {Load,Path} from './route-paths';

export function stopSearchName(name:string){
 return name.split(/\s+·\s+(?:stop|towards)\b|\s+\/\s+/i)[0].trim();
}

function stopKey(name:string,bus:boolean){
 const plain=stopSearchName(name);
 return bus?plain.toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim():destinationKey(plain);
}

function sameStop(reference:Stop,candidate:Stop,bus:boolean){
 if(reference.id&&reference.id===candidate.id)return true;
 if(!stopKey(reference.name,bus)||stopKey(reference.name,bus)!==stopKey(candidate.name,bus))return false;
 return !reference.lat||(candidate.lat!==0&&distance(reference,candidate)<=300);
}

function allowedReturnDirection(leg:Leg,line:string,direction:string){
 const saved=leg.services?.filter(service=>service.lineId===line).map(service=>service.direction);
 const outward=saved?.length?saved:[leg.direction];
 const known=outward.filter(value=>value==='inbound'||value==='outbound');
 return !known.length||known.some(value=>value!==direction);
}

function placeholder(leg:Leg,walkMinutes:number):Leg {
 return {id:crypto.randomUUID(),mode:leg.mode,stop:leg.alight||{id:'',name:leg.to,lat:0,lon:0},
  line:leg.line,lineName:leg.lineName,direction:'',destination:'',rideMinutes:0,walkMinutes,to:leg.stop.name};
}

async function reverseRail(leg:Leg,draft:Leg,load:Load,signal:AbortSignal){
 const {crs,toCrs}=leg;
 if(!crs||!toCrs||crs===toCrs)return draft;
 const stop=leg.alight||{id:toCrs,name:leg.to,lat:0,lon:0};
 const reversed:Leg={...draft,stop,alight:leg.alight&&leg.stop.id!==crs?leg.stop:undefined,crs:toCrs,toCrs:crs,rideMinutes:leg.rideMinutes,
  rideOverride:true,rideSource:'Outward ride estimate'};
 try{
  const board=await load<Board>(`rail?crs=${toCrs}&to=${crs}`,signal);
  const times=board.arrivals.filter(arrival=>!arrival.cancelled&&arrival.rideMinutes).map(arrival=>arrival.rideMinutes!);
  if(times.length)return {...reversed,rideMinutes:Math.max(...times),rideOverride:false,rideSource:'National Rail timetable'};
 }catch{signal.throwIfAborted();}
 return reversed;
}

async function findReturn(leg:Leg,draft:Leg,load:Load,signal:AbortSignal):Promise<Leg>{
 if(leg.mode==='national-rail')return reverseRail(leg,draft,load,signal);
 const bus=leg.mode==='bus',lines=[...new Set(leg.line.split(',').filter(Boolean))];
 if(!lines.length)return draft;
 const reference=draft.stop;
 let candidates:Stop[];
 if(leg.alight&&!bus)candidates=[leg.alight];
 else {
  const matches=await load<Stop[]>(`search?q=${encodeURIComponent(stopSearchName(reference.name))}&mode=${leg.mode}`,signal);
  candidates=[...(leg.alight?[leg.alight]:[]),...matches.filter(stop=>sameStop(reference,stop,bus))];
 }
 const unique=[...new Map(candidates.map(stop=>[stop.id,stop])).values()];
 if(unique.length>6)return draft;
 const returns:Leg[]=[];
 for(const candidate of unique){
  signal.throwIfAborted();
  const busRoutes=bus?await load<LegService[]>(`bus-services?stop=${encodeURIComponent(candidate.id)}`,signal):[];
  const requests=lines.map(line=>({
   line,directions:bus?[...new Set(busRoutes.filter(route=>route.lineId===line&&allowedReturnDirection(leg,line,route.direction)).map(route=>route.direction))]:[''],
  }));
  if(requests.some(request=>!request.directions.length))continue;
  const paths=(await Promise.all(requests.flatMap(({line,directions})=>directions.map(direction=>
   load<Path[]>(`service-paths?mode=${leg.mode}&line=${encodeURIComponent(line)}&stop=${encodeURIComponent(candidate.id)}&direction=${direction}`,signal)
  )))).flat().filter(path=>allowedReturnDirection(leg,path.lineId,path.direction));
  const stops=new Map(paths.flatMap(path=>path.stops.filter(stop=>sameStop(leg.stop,stop,bus)).map(stop=>[stop.id,stop] as const)));
  for(const stop of stops.values()){
   const usable=pathsTo(paths,stop.id);
   if(lines.some(line=>new Set(usable.filter(path=>path.lineId===line).map(path=>path.direction)).size!==1))continue;
   const details=routeDetails(paths,stop,busRoutes);
   if(details.services!.length>32)continue;
   const boarding=await load<Stop>(`stop?id=${encodeURIComponent(candidate.id)}`,signal);
   returns.push({...draft,...details,stop:boarding});
   if(returns.length>1)return draft;
  }
 }
 return returns[0]||draft;
}

export async function reverseJourney(outward:Leg[],firstWalk:number,load:Load,signal:AbortSignal){
 const inbound:Leg[]=[];
 for(let index=outward.length-1;index>=0;index--){
  signal.throwIfAborted();
  const leg=outward[index],draft=placeholder(leg,outward[index+1]?.walkMinutes??firstWalk);
  try{inbound.push(await findReturn(leg,draft,load,signal));}
  catch{signal.throwIfAborted();inbound.push(draft);}
 }
 return inbound;
}
