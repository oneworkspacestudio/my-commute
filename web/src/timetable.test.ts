import {test} from 'node:test';import assert from 'node:assert/strict';
import {frequencyWindow,mergeBusBoards,timetableGroups} from './timetable.ts';
import {connect,defaults,example} from './engine.ts';import type {Arrival,Board} from './engine.ts';
const now=Date.parse('2026-11-06T08:00:00Z'),leg={...example.outbound[0],mode:'bus' as const,line:'24',direction:'inbound',destination:'',walkMinutes:2};
const arrival=(min:number,extra:Partial<Arrival>={}):Arrival=>({id:String(min),lineId:'24',lineName:'24',direction:'inbound',destinationName:'Synthetic terminus',platformName:'',expectedArrival:new Date(now+min*60000).toISOString(),timestamp:new Date(now).toISOString(),...extra});
const board=(arrivals:Arrival[],error?:string):Board=>({arrivals,error,fetchedAt:new Date(now).toISOString(),source:'test'});
test('live vehicles replace scheduled duplicates while later scheduled services remain',()=>{const b=mergeBusBoards(leg,board([arrival(10)]),[board([arrival(9,{timetabled:true}),arrival(30,{timetabled:true})])],now);assert.deepEqual(b.arrivals.map(a=>a.id),['10','30']);assert.equal(connect([leg],{[leg.id]:b},defaults,now)[0].chosen?.timetabled,undefined);});
test('feed outage uses a labelled scheduled bus and carries its ride into the next connection',()=>{const b=mergeBusBoards(leg,board([],'Offline'),[board([arrival(8,{timetabled:true})])],now);const second={...leg,id:'second',mode:'tube' as const,walkMinutes:3};const s=connect([leg,second],{[leg.id]:b,second:board([arrival(35)])},defaults,now);assert.equal(s[0].chosen?.timetabled,true);assert.equal(s[1].chosen?.id,'35');assert.equal(b.liveError,'Offline');});
test('stale timetable and wrong-direction services cannot supply a fallback',()=>{const b=mergeBusBoards(leg,board([],'Offline'),[board([arrival(8,{timetabled:true,timestamp:new Date(now-901000).toISOString()}),arrival(9,{timetabled:true,direction:'outbound'})])],now);assert.equal(connect([leg],{[leg.id]:b},defaults,now)[0].chosen,undefined);});
test('cancelled live service cannot return as a scheduled bus',()=>{const b=mergeBusBoards(leg,board([arrival(10,{cancelled:true})]),[board([arrival(10,{timetabled:true}),arrival(30,{timetabled:true})])],now);assert.equal(connect([leg],{[leg.id]:b},defaults,now)[0].chosen?.id,'30');});
test('an outage keeps known bus predictions and cached schedules at their original ages',()=>{
 const predictionTime=new Date(now-3*60_000).toISOString();
 const scheduleTime=new Date(now-20*60_000).toISOString();
 const live={...board([arrival(10,{timestamp:predictionTime}),arrival(12,{timestamp:predictionTime,cancelled:true})]),
  fetchedAt:predictionTime,cacheState:'estimated' as const};
 const schedule={...board([arrival(12,{timestamp:scheduleTime,timetabled:true}),arrival(30,{timestamp:scheduleTime,timetabled:true})]),
  fetchedAt:scheduleTime,cacheState:'estimated' as const};
 const merged=mergeBusBoards(leg,live,[schedule],now);
 assert.equal(merged.fetchedAt,predictionTime);
 assert.equal(merged.arrivals.find(service=>service.id==='30')?.scheduleFetchedAt,scheduleTime);
 assert.equal(merged.arrivals.filter(service=>service.id==='12').length,1);
 assert.equal(connect([leg],{[leg.id]:merged},defaults,now)[0].chosen?.id,'10');
 assert.equal(connect([leg],{[leg.id]:merged},defaults,now+11*60_000)[0].chosen?.id,'30');
});
test('frequency windows remain separate and destination groups retain full chronological times',()=>{
 const b=mergeBusBoards(leg,board([]),[board([])],now);
 assert.equal(b.arrivals.length,0);
 const groups=timetableGroups({departures:[
  {time:'08:05',minutes:485,destination:'A'},{time:'08:25',minutes:505,destination:'A'},
  {time:'08:15',minutes:495,destination:'B'},{time:'24:10',minutes:1450,destination:'A'},
 ]});
 assert.deepEqual(groups,[
  {heading:'Towards A',rows:[{hour:'08',times:[{text:'08:05'},{text:'08:25'}]},{hour:'24',times:[{text:'24:10'}]}]},
  {heading:'Towards B',rows:[{hour:'08',times:[{text:'08:15'}]}]},
 ]);
 assert.deepEqual(frequencyWindow('09:00–17:59: every 10–14 minutes'),{window:'09:00–17:59',detail:'Every 10–14 minutes'});
});
