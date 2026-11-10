import {test,expect} from '@playwright/test';
import {spawn,ChildProcess} from 'node:child_process';
import {mkdir,writeFile,rm,lstat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {randomUUID} from 'node:crypto';

const origin='http://127.0.0.1:19442',email='timetable@example.invalid',password='Synthetic-timetable-only-2026!';
const fixtureBase='C:/Projects/.cache/my-commute-timetable-20261106';
const artifacts='I:/Projects/tooling/my-commute-timetable-20261106';
let child:ChildProcess,root:string;
test.use({baseURL:origin});
test.beforeAll(async()=>{root=join(fixtureBase,randomUUID());await mkdir(root,{recursive:true});await mkdir(artifacts,{recursive:true});await writeFile(join(artifacts,'fixture-root.json'),JSON.stringify({root}));child=spawn(process.env.COMMUTE_TEST_EXE||join(artifacts,'MyCommute-timetable.exe'),['--data',root,'--listen','127.0.0.1:19442','--origin',origin,'--bootstrap-email',email,'--no-browser'],{env:{...process.env,WORKSPACE_BOOTSTRAP_PASSWORD:password,NATIONAL_RAIL_TOKEN:'',TFL_APP_KEY:''},windowsHide:true,stdio:'ignore'});await expect.poll(async()=>{try{return(await fetch(origin+'/healthz')).status}catch{return 0}},{timeout:45000}).toBe(200);});
test.afterAll(async()=>{if(child&&!child.killed){const closed=new Promise<void>(r=>child.once('exit',()=>r()));child.kill();await closed;}if(root&&resolve(root).startsWith(resolve(fixtureBase)+'\\')&&!(await lstat(root)).isSymbolicLink())await rm(root,{recursive:true});});

test('authenticated native bus timetable returns published patterns and enforces validation',async({request})=>{
 expect((await request.get('/api/timetable?line=24&stop=490000036S')).status()).toBe(401);
 expect((await request.post('/api/login',{headers:{Origin:origin},data:{email,password}})).status()).toBe(200);
 const response=await request.get('/api/timetable?line=24&stop=490000036S');expect(response.status()).toBe(200);
 const b=await response.json();expect(b.timetable.lineId).toBe('24');expect(b.timetable.schedules.length).toBeGreaterThan(0);expect(b.timetable.schedules.some((s:any)=>s.departures.length)).toBe(true);expect(b.arrivals.every((a:any)=>a.timetabled&&a.status==='Scheduled · not live')).toBe(true);
 expect((await request.get('/api/timetable?line=24/evil&stop=490000036S')).status()).toBe(400);
 await writeFile(join(artifacts,'live-timetable-summary.json'),JSON.stringify({passed:true,source:'TfL public route 24 and GOV.UK bank-holiday calendar',patterns:b.timetable.schedules.map((s:any)=>({name:s.name,departures:s.departures.length,frequencyWindows:s.frequencies.length})),automaticPattern:b.timetable.todaySchedule,warning:b.timetable.warning,fallbackDepartures:b.arrivals.length},null,2));
});

test('mobile full-day timetable, outage fallback, live replacement and branch filtering',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('heading',{name:'A smoother way to work.'})).toBeVisible();
 const me=await(await page.request.get('/api/me')).json(),at=Date.now();
 const leg={id:'bus-leg',mode:'bus',stop:{id:'490000036S',name:'Synthetic boarding stop',lat:51.53,lon:-.14,lines:[{id:'24',name:'24'}]},line:'24',lineName:'24',direction:'inbound',destination:'Synthetic terminus',walkMinutes:2,rideMinutes:12,to:'Synthetic interchange'};
 const state={journeys:[{id:'synthetic-commute',name:'Synthetic timetable journey',outbound:[leg],inbound:[]}],preferences:{buffer:2,walkSpeed:4.5,finalWalk:3}};
 expect((await page.request.put('/api/state',{headers:{Origin:origin,'X-CSRF-Token':me.csrf},data:state})).status()).toBe(200);
 const arrival=(id:string,min:number,timetabled:boolean)=>({id,lineId:'24',lineName:'24',direction:'inbound',destinationName:'Synthetic terminus',platformName:'',timestamp:new Date().toISOString(),expectedArrival:new Date(at+min*60000).toISOString(),timetabled,status:timetabled?'Scheduled · not live':'Live prediction'});
 const timetable={lineId:'24',lineName:'24',direction:'inbound',todaySchedule:'Monday to Friday',warning:'',schedules:[{name:'Monday to Friday',departures:[{time:'05:10',minutes:310,destination:'Synthetic terminus'},{time:'05:30',minutes:330,destination:'Synthetic terminus'}],frequencies:['09:00–17:59: every 10–14 minutes']},{name:'Sunday',departures:[{time:'06:20',minutes:380,destination:'Sunday terminus'}],frequencies:[]}]};
 await page.route('**/api/timetable?*',r=>r.fulfill({json:{arrivals:[arrival('scheduled-8',8,true),arrival('scheduled-30',30,true)],fetchedAt:new Date().toISOString(),source:'TfL published bus timetable',timetable}}));
 await page.route('**/api/arrivals?*',r=>r.fulfill({status:502,json:{error:'Synthetic live outage'}}));
 await page.reload();await expect(page.getByText('SCHEDULED CONNECTION · NOT LIVE',{exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Plan for',exact:false})).toBeVisible();
 await page.getByRole('button',{name:'Live',exact:true}).click();await page.getByRole('button',{name:'Bus timetables',exact:true}).click();await expect(page.getByRole('heading',{name:'Full-day bus timetables'})).toBeVisible();await expect(page.getByText('05:10',{exact:true})).toBeVisible();await expect(page.getByText('05:30',{exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Towards Synthetic terminus'})).toHaveCount(1);await expect(page.getByText('09:00–17:59',{exact:true})).toBeVisible();await expect(page.getByText('Every 10–14 minutes',{exact:true})).toBeVisible();
 await page.getByLabel('Bus timetable day pattern').selectOption('Sunday');await expect(page.getByRole('heading',{name:'Towards Sunday terminus'})).toBeVisible();
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.setViewportSize({width:390,height:844});await page.getByLabel('Bus timetable day pattern').selectOption('');await page.screenshot({path:join(artifacts,'timetable-mobile-synthetic.png'),fullPage:true});
 await page.unroute('**/api/arrivals?*');await page.route('**/api/arrivals?*',r=>r.fulfill({json:{arrivals:[arrival('live-9',9,false)],fetchedAt:new Date().toISOString(),source:'TfL'}}));await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByRole('button',{name:'Arrivals',exact:true}).click();await expect(page.getByText('Synthetic live outage',{exact:false})).toHaveCount(0);await page.getByRole('button',{name:'Journey',exact:true}).click();await expect(page.getByText('YOUR NEXT CONNECTION',{exact:true})).toBeVisible();await expect(page.getByText('SCHEDULED CONNECTION · NOT LIVE',{exact:true})).toHaveCount(0);
});
