export type Mode='bus'|'tube'|'overground'|'elizabeth-line'|'dlr'|'national-rail';
export type Stop={id:string;name:string;lat:number;lon:number;lines?:{id:string;name:string}[]};
export type LegService={lineId:string;direction:string;terminus:string;terminusId:string;vehicleDestination?:string;minutes:number};
export type Leg={id:string;mode:Mode;stop:Stop;line:string;lineName:string;direction:string;destination:string;rideMinutes:number;walkMinutes:number;to:string;crs?:string;toCrs?:string;alight?:Stop;services?:LegService[];rideOverride?:boolean;rideSource?:string};
export type Journey={id:string;name:string;outbound:Leg[];inbound:Leg[]};
export type Preferences={buffer:number;walkSpeed:number;finalWalk:number};
export type Saved={journeys:Journey[];preferences:Preferences};
export type Arrival={id:string;lineId:string;lineName:string;destinationName:string;destinationNaptanId?:string;direction:string;platformName:string;expectedArrival:string;timestamp:string;cancelled?:boolean;scheduled?:string;status?:string;timetabled?:boolean;rideMinutes?:number};
export type BusSchedule={name:string;departures:{time:string;destination:string;minutes:number}[];frequencies:string[]};
export type BusTimetable={lineId:string;lineName:string;direction:string;schedules:BusSchedule[];todaySchedule:string;warning:string};
export type Board={arrivals:Arrival[];fetchedAt:string;error?:string;source:string;timetable?:BusTimetable;timetables?:BusTimetable[];liveError?:string;timetableError?:string};
export type Position={lat:number;lon:number;accuracy:number;at:number};
export function distance(a:{lat:number;lon:number},b:{lat:number;lon:number}){const r=Math.PI/180, dlat=(b.lat-a.lat)*r,dlon=(b.lon-a.lon)*r;return 6371000*2*Math.asin(Math.sqrt(Math.sin(dlat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dlon/2)**2));}
export function usablePosition(p:Position|undefined,now:number){return !!p&&now-p.at<120000&&p.accuracy<=100;}
export function suggestDirection(j:Journey,p:Position|undefined,now:number):'outbound'|'inbound'|undefined{if(!usablePosition(p,now)||!j.outbound[0]||!j.inbound[0])return;const a=distance(p!,j.outbound[0].stop),b=distance(p!,j.inbound[0].stop);if(Math.min(a,b)>1500||Math.abs(a-b)<300)return;return a<b?'outbound':'inbound';}
export function destinationKey(name:string){
 return name.toLowerCase().replace(/\b(?:(?:railway|rail|underground|dlr|overground|bus)\s+)?station\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
}
function serviceMatches(a:Arrival,s:LegService){
 if(a.lineId!==s.lineId||(a.direction&&a.direction!==s.direction))return false;
 const destination=destinationKey(a.destinationName);
 return a.destinationNaptanId===s.terminusId||Boolean(destination&&[s.terminus,s.vehicleDestination||''].some(name=>destinationKey(name)===destination));
}
export function matches(a:Arrival,l:Leg){
 if(l.services?.length)return l.services.some(s=>serviceMatches(a,s));
 return (!l.line||l.line.split(',').includes(a.lineId))&&(!l.direction||a.direction===l.direction||a.platformName===l.direction)&&(!l.destination||a.destinationName.toLowerCase().includes(l.destination.toLowerCase()));
}
export function rideTime(l:Leg,a:Arrival){
 if(l.rideOverride)return l.rideMinutes;
 const durations=l.services?.filter(s=>serviceMatches(a,s)).map(s=>s.minutes)||[];
 return durations.length?Math.max(...durations):l.rideSource==='National Rail timetable'&&a.rideMinutes?a.rideMinutes:l.rideMinutes;
}
export function fresh(a:Arrival,b:Board,now:number){const t=Date.parse(a.timestamp),f=Date.parse(b.fetchedAt);return Number.isFinite(t)&&Number.isFinite(f)&&now-t<(a.timetabled?900000:120000)&&now-t>=-60000&&now-f<(a.timetabled?900000:90000);}
export function candidates(l:Leg,b:Board|undefined,now:number){return (b?.arrivals||[]).filter(a=>matches(a,l)&&Date.parse(a.expectedArrival)>=now).sort((a,b)=>Date.parse(a.expectedArrival)-Date.parse(b.expectedArrival));}
export type Step={leg:Leg;readyAt:number;walk:number;chosen?:Arrival;wait?:number;arriveAt?:number;reason?:string};
export function connect(legs:Leg[],boards:Record<string,Board>,prefs:Preferences,now:number,p?:Position,start=0):Step[]{let ready=now;let blocked=false;return legs.slice(start).map((leg,i)=>{let walk=leg.walkMinutes;if(i===0&&usablePosition(p,now)){const metres=distance(p!,leg.stop);if(metres<=2500)walk=Math.max(1,Math.ceil(metres*1.3/(prefs.walkSpeed*1000/60)));}const readyAt=ready+walk*60000;const b=boards[leg.id];const all=candidates(leg,b,now);const chosen=!blocked&&b&&!b.error?all.find(a=>!a.cancelled&&fresh(a,b,now)&&Date.parse(a.expectedArrival)>=readyAt+prefs.buffer*60000):undefined;let reason='';if(blocked)reason='Waiting for an earlier connection';else if(b?.error)reason=b.error;else if(!b)reason='Loading live predictions';else if(!chosen)reason=all.some(a=>!fresh(a,b,now))?'Predictions are out of date. Refresh to plan.':'No catchable service in the available departures';if(!chosen){blocked=true;return{leg,readyAt,walk,reason};}const departure=Date.parse(chosen.expectedArrival);ready=departure+rideTime(leg,chosen)*60000;return{leg,readyAt,walk,chosen,wait:(departure-readyAt)/60000,arriveAt:ready};});}
export function clock(t:number|string){return new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit'}).format(new Date(t));}
export function minutes(t:string,now:number){return Math.max(0,Math.ceil((Date.parse(t)-now)/60000));}
export const defaults:Preferences={buffer:2,walkSpeed:4.5,finalWalk:3};
export const example:Journey={id:'example',name:'Highbury → Oxford Circus',outbound:[{id:'example-tube',mode:'tube',stop:{id:'940GZZLUHAI',name:'Highbury & Islington',lat:51.546,lon:-0.1033,lines:[{id:'victoria',name:'Victoria'}]},line:'victoria',lineName:'Victoria',direction:'inbound',destination:'Brixton',rideMinutes:9,walkMinutes:5,to:'Oxford Circus'}],inbound:[{id:'example-return',mode:'tube',stop:{id:'940GZZLUOXC',name:'Oxford Circus',lat:51.5152,lon:-0.1419,lines:[{id:'victoria',name:'Victoria'}]},line:'victoria',lineName:'Victoria',direction:'outbound',destination:'Walthamstow',rideMinutes:9,walkMinutes:5,to:'Highbury & Islington'}]};
