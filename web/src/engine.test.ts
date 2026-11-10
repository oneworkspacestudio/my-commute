import {test} from 'node:test';import assert from 'node:assert/strict';
import {connect,defaults,example,suggestDirection,candidates} from './engine.ts';
import type {Arrival,Board} from './engine.ts';
test('selected bus terminus controls matching and uses its own duration unless overridden',()=>{
 const leg={...example.outbound[0],mode:'bus' as const,line:'24,29',direction:'',destination:'',walkMinutes:0,rideMinutes:15,services:[
  {lineId:'24',direction:'inbound',terminus:'Grosvenor Road',terminusId:'stop-grosvenor',vehicleDestination:'Pimlico',minutes:10},
  {lineId:'29',direction:'inbound',terminus:'Trafalgar Square Station',terminusId:'stop-trafalgar',minutes:15},
 ]};
 const board=b([a(3,{lineId:'24',destinationName:'Camden Town'}),a(4,{lineId:'24',destinationName:'Pimlico'}),a(5,{lineId:'29',destinationName:'Trafalgar Square'})]);
 const step=connect([leg],{[leg.id]:board},defaults,now)[0];
 assert.equal(step.chosen?.id,'4');
 assert.equal(step.arriveAt,now+14*60000);
 assert.equal(connect([{...leg,rideOverride:true}],{[leg.id]:board},defaults,now)[0].arriveAt,now+19*60000);
});
const now=Date.parse('2026-11-05T08:00:00Z');
function a(min:number,extra:Partial<Arrival>={}):Arrival{return{id:String(min),lineId:'victoria',lineName:'Victoria',destinationName:'Brixton',direction:'inbound',platformName:'Southbound',expectedArrival:new Date(now+min*60000).toISOString(),timestamp:new Date(now).toISOString(),...extra};}
function b(arrivals:Arrival[]):Board{return{arrivals,fetchedAt:new Date(now).toISOString(),source:'TfL'};}
test('wait includes walk and boarding buffer; too-soon service stays on full board',()=>{const l=example.outbound[0];const board=b([a(3),a(8),a(12)]);const s=connect([l],{[l.id]:board},defaults,now)[0];assert.equal(s.chosen?.id,'8');assert.equal(s.wait,3);assert.equal(candidates(l,board,now).length,3);});
test('connection includes ride and interchange, cannot catch earlier train',()=>{const one={...example.outbound[0],id:'one',walkMinutes:1,rideMinutes:10};const two={...one,id:'two',walkMinutes:4};const steps=connect([one,two],{one:b([a(4)]),two:b([a(17),a(21)])},defaults,now);assert.equal(steps[1].chosen?.id,'21');assert.equal(steps[1].wait,3);});
test('wrong direction, cancelled, stale and unknown times cannot be recommended',()=>{const l=example.outbound[0];const board=b([a(8,{direction:'outbound'}),a(9,{cancelled:true}),a(10,{timestamp:new Date(now-180000).toISOString()}),a(11,{expectedArrival:''})]);assert.equal(connect([l],{[l.id]:board},defaults,now)[0].chosen,undefined);});
test('missing upstream service blocks downstream recommendation',()=>{const first=example.outbound[0],second={...first,id:'second'};const s=connect([first,second],{second:b([a(30)])},defaults,now);assert.equal(s[1].chosen,undefined);});
test('location direction requires fresh accurate and separated endpoints',()=>{const j=example,p={...j.inbound[0].stop,at:now,accuracy:10};assert.equal(suggestDirection(j,p,now),'inbound');assert.equal(suggestDirection(j,{...p,accuracy:500},now),undefined);assert.equal(suggestDirection(j,{...p,at:now-180000},now),undefined);assert.equal(suggestDirection({...j,inbound:j.outbound},p,now),undefined);});
test('walking from GPS applies only near stop and keeps transfer walks',()=>{const l=example.outbound[0],p={...l.stop,at:now,accuracy:10};assert.equal(connect([l],{[l.id]:b([a(8)])},defaults,now,p)[0].walk,1);assert.equal(connect([l],{},defaults,now,{...p,lat:52})[0].walk,5);});
test('alternative buses choose the first catchable accepted route',()=>{const l={...example.outbound[0],line:'19,38',destination:'',direction:'',mode:'bus' as const};const board=b([a(8,{lineId:'73'}),a(9,{lineId:'38'}),a(10,{lineId:'19'})]);assert.equal(connect([l],{[l.id]:board},defaults,now)[0].chosen?.lineId,'38');});
test('exact buffer boundary is catchable and one second early is rejected',()=>{const l=example.outbound[0],early=a(7,{id:'early',expectedArrival:new Date(now+7*60000-1000).toISOString()}),exact=a(7);assert.equal(connect([l],{[l.id]:b([early,exact])},defaults,now)[0].chosen?.id,'7');});
test('feed errors invalidate even formerly fresh predictions',()=>{const l=example.outbound[0];assert.equal(connect([l],{[l.id]:{...b([a(8)]),error:'Offline'}},defaults,now)[0].chosen,undefined);});
