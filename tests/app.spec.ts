import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {spawn,ChildProcess} from 'node:child_process';
import {mkdir,rm,lstat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
let process:ChildProcess;let fixtureRoot:string;
const email='commute-acceptance@example.invalid',password='Synthetic-only-commute-2026!';
const testExecutable=globalThis.process.env.COMMUTE_TEST_EXE||'I:/Projects/tooling/my-commute-20261105/MyCommute-ready.exe';
test.beforeAll(async()=>{const root='C:/Projects/.cache/my-commute-20261105/native-'+randomUUID();await mkdir(root,{recursive:true});fixtureRoot=root;process=spawn(testExecutable,['--data',root,'--listen','127.0.0.1:19440','--origin','http://127.0.0.1:19440','--bootstrap-email',email,'--no-browser'],{env:{...globalThis.process.env,WORKSPACE_BOOTSTRAP_PASSWORD:password,NATIONAL_RAIL_TOKEN:'',TFL_APP_KEY:''},windowsHide:true,stdio:'ignore'});await expect.poll(async()=>{try{return(await fetch('http://127.0.0.1:19440/healthz')).status}catch{return 0}},{timeout:45000}).toBe(200);await mkdir('docs/screenshots',{recursive:true});});
test.afterAll(async()=>{if(process&&process.exitCode===null){const stopped=new Promise<void>(r=>process.once('exit',()=>r()));process.kill();await stopped;}if(fixtureRoot&&resolve(fixtureRoot).startsWith(resolve('C:/Projects/.cache/my-commute-20261105')+'\\')&&!(await lstat(fixtureRoot)).isSymbolicLink())await rm(fixtureRoot,{recursive:true});});
async function login(page:any){await page.goto('/');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('heading',{name:'A smoother way to work.'})).toBeVisible();}
test('native live feed, phone and desktop layouts, saved preferences and logout',async({page})=>{const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1440,height:1000});await login(page);await expect(page.getByText('Brixton Underground Station',{exact:true}).first()).toBeVisible({timeout:30000});await page.screenshot({path:'docs/screenshots/desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'docs/screenshots/mobile.png',fullPage:true});for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Live',exact:true}).click();await expect(page.getByRole('heading',{name:'Every arrival, in one place.'})).toBeVisible();await expect(page.getByText('Brixton Underground Station').first()).toBeVisible();await page.getByRole('button',{name:'You',exact:true}).click();await page.getByLabel('Boarding safety buffer').fill('3');await page.getByRole('button',{name:'Save preferences',exact:true}).click();await expect(page.getByRole('status')).toContainText('Preferences saved');await page.reload();await page.getByRole('button',{name:'You',exact:true}).click();await expect(page.getByLabel('Boarding safety buffer')).toHaveValue('3');await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('heading',{name:'Your London. Your way.'})).toBeVisible();expect((await page.request.get('/api/state')).status()).toBe(401);expect(errors).toEqual([]);});
async function addVictoriaLeg(page:Page,boarding:string,alighting:string){
 await page.getByRole('button',{name:'Add a leg',exact:true}).click();
 await page.getByRole('button',{name:'Train',exact:true}).click();
 await page.getByRole('button',{name:'Underground',exact:true}).click();
 await page.getByLabel('Find your boarding station').fill(boarding);
 await page.getByRole('button',{name:new RegExp(boarding+' Underground Station','i')}).click();
 await page.getByRole('checkbox',{name:'Victoria',exact:true}).check();
 await page.getByRole('button',{name:'Choose where to get off'}).click();
 await page.getByLabel('Search stops to get off at').fill(alighting);
 await page.getByRole('button',{name:new RegExp(alighting+' Underground Station','i')}).click();
 await expect(page.getByText(/min · TfL timetable/)).toBeVisible();
 await page.getByRole('button',{name:'Add leg to journey',exact:true}).click();
}

test('save outward and return journeys through actual stop search and reload',async({page})=>{
 await page.setViewportSize({width:390,height:844});await login(page);
 await page.getByRole('button',{name:'Saved',exact:true}).click();
 await page.getByRole('button',{name:'Add a journey',exact:true}).click();
 await page.getByLabel('Journey name').fill('Synthetic London acceptance');
 await addVictoriaLeg(page,'Highbury & Islington','Oxford Circus');
 await page.getByRole('button',{name:'Going home',exact:true}).click();
 await addVictoriaLeg(page,'Oxford Circus','Highbury & Islington');
 await page.getByRole('button',{name:'Save journey',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Let’s get you home.'})).toBeVisible();
 await page.reload();await page.getByRole('button',{name:'Saved',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Synthetic London acceptance'})).toBeVisible();
 await expect(page.getByText('1 legs to work · 1 legs going home')).toBeVisible();
});
test('location denial, feed outage, and National Rail missing credentials stay honest',async({page,context})=>{await login(page);await context.clearPermissions();await page.getByRole('button',{name:'Use my location',exact:true}).click();await expect(page.getByText('Location unavailable. Your saved walking times still work.')).toBeVisible({timeout:20000});await page.route('**/api/arrivals?*',r=>r.fulfill({status:502,contentType:'application/json',body:JSON.stringify({error:'Synthetic feed outage'})}));await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect(page.getByText('Synthetic feed outage').first()).toBeVisible();await expect(page.getByText('YOUR NEXT CONNECTION',{exact:true})).toHaveCount(0);const r=await page.request.get('/api/rail?crs=WAT&to=CLJ');expect(r.status()).toBe(503);expect(await r.text()).toContain('Darwin access token');});
test('location selects return direction and respects manual override',async({page,context})=>{await page.setViewportSize({width:390,height:844});await login(page);await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:51.5152,longitude:-.1419,accuracy:10});await page.getByRole('button',{name:'Use my location',exact:true}).click();await expect(page.getByRole('heading',{name:'Let’s get you home.'})).toBeVisible();await page.getByRole('button',{name:'To work',exact:true}).click();await page.getByRole('button',{name:'Update location',exact:true}).click();await expect(page.getByRole('heading',{name:'A smoother way to work.'})).toBeVisible();});
test('journeys are isolated by account, provider writes require owner and CSRF',async({page,browser})=>{await login(page);const me=await(await page.request.get('/api/me')).json();const origin='http://127.0.0.1:19440';const member='member-'+randomUUID()+'@example.invalid';const created=await page.request.post('/api/local-users',{headers:{Origin:origin,'X-CSRF-Token':me.csrf},data:{email:member,password}});expect(created.status()).toBe(201);const before=await(await page.request.get('/api/state')).json();expect((await page.request.put('/api/state',{headers:{Origin:origin},data:before.state})).status()).toBe(403);const other=await browser.newContext();try{expect((await other.request.post(origin+'/api/login',{headers:{Origin:origin},data:{email:member,password}})).status()).toBe(200);const s=await(await other.request.get(origin+'/api/state')).json();expect(s.state.journeys).toEqual([]);const user=await(await other.request.get(origin+'/api/me')).json();const provider=await other.request.put(origin+'/api/providers',{headers:{Origin:origin,'X-CSRF-Token':user.csrf},data:{tflKey:'synthetic-not-a-token',railToken:''}});expect(provider.status()).toBe(403);expect((await page.request.get('/api/state')).status()).toBe(200);}finally{await other.close();}});
test('bus to Tube connection carries ride time into platform wait and retains early buses',async({page})=>{
 await page.setViewportSize({width:390,height:844});await login(page);
 const at=Date.now(),origin='http://127.0.0.1:19440';
 const bus={id:'synthetic-bus',mode:'bus',stop:{id:'4900000000',name:'Synthetic bus stop',lat:51.55,lon:-.1,lines:[{id:'19',name:'19'}]},line:'19',lineName:'19',direction:'inbound',destination:'',walkMinutes:5,rideMinutes:8,to:'Highbury & Islington'};
 const tube={...bus,id:'synthetic-tube',mode:'tube',stop:{id:'940GZZLUHAI',name:'Highbury & Islington',lat:51.546,lon:-.1033,lines:[{id:'victoria',name:'Victoria'}]},line:'victoria',lineName:'Victoria',destination:'Brixton',walkMinutes:3,rideMinutes:9,to:'Oxford Circus'};
 function arrival(id:string,line:string,minutes:number){return{id,lineId:line,lineName:line==='19'?'19':'Victoria',direction:'inbound',destinationName:line==='19'?'Highbury & Islington':'Brixton',platformName:line==='19'?'Stop A':'Southbound platform',timestamp:new Date(at).toISOString(),expectedArrival:new Date(at+minutes*60000).toISOString()};}
 await page.route('**/api/arrivals?*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({arrivals:r.request().url().includes('4900000000')?[arrival('early','19',3),arrival('catch','19',8)]:[arrival('missed-train','victoria',17),arrival('next-train','victoria',22)],source:'Synthetic test feed',fetchedAt:new Date(at).toISOString()})}));
 const me=await(await page.request.get('/api/me')).json();expect((await page.request.put('/api/state',{headers:{Origin:origin,'X-CSRF-Token':me.csrf},data:{preferences:{buffer:2,walkSpeed:4.5,finalWalk:3},journeys:[{id:'synthetic-connection',name:'Synthetic bus + Tube test',outbound:[bus,tube],inbound:[]}]}})).status()).toBe(200);
 await page.reload();await expect(page.getByText('YOUR NEXT CONNECTION',{exact:true})).toBeVisible();await expect(page.getByText(/Southbound platform · 3 min wait/)).toBeVisible();await page.screenshot({path:'docs/screenshots/connection-synthetic.png',fullPage:true});await page.getByRole('button',{name:'Live',exact:true}).click();await expect(page.getByText('3 min',{exact:true}).first()).toBeVisible();await expect(page.getByText('Recommended connection').first()).toBeVisible();
});
test('private journey import previews before saving and supports alternative Underground services',async({page})=>{
 await page.setViewportSize({width:390,height:844});await login(page);await page.getByRole('button',{name:'Saved',exact:true}).click();
 const before=(await(await page.request.get('/api/state')).json()).state;
 const imported={schema:1,journey:{id:'synthetic-import',name:'Synthetic imported journey',outbound:[{id:'synthetic-import-leg',mode:'tube',stop:{id:'940GZZLUHAI',name:'Synthetic interchange',lat:51.546,lon:-.1033,lines:[{id:'circle',name:'Circle'},{id:'metropolitan',name:'Metropolitan'},{id:'hammersmith-city',name:'Hammersmith & City'}]},line:'circle,metropolitan',lineName:'Circle / Metropolitan',direction:'Westbound - Platform 2',destination:'',walkMinutes:4,rideMinutes:8,to:'Synthetic destination'}],inbound:[]}};
 await page.getByLabel('Import prepared journey').setInputFiles({name:'synthetic-journey.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(imported))});
 await expect(page.getByLabel('Journey name')).toHaveValue('Synthetic imported journey');expect((await(await page.request.get('/api/state')).json()).state).toEqual(before);
 await page.getByRole('button',{name:'Edit',exact:true}).click();
 await expect(page.getByText('8 min · Saved estimate',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Time options',exact:true}).click();
 await page.getByRole('button',{name:'Override ride time',exact:true}).click();
 await page.getByLabel('Ride duration override (minutes)').fill('9');
 await page.getByRole('button',{name:'Update leg',exact:true}).click();
 await page.getByRole('button',{name:'Save journey',exact:true}).click();
 await expect(page.getByRole('heading',{name:'A smoother way to work.'})).toBeVisible();const state=(await(await page.request.get('/api/state')).json()).state;const j=state.journeys.find((x:any)=>x.name==='Synthetic imported journey');expect(j.id).not.toBe('synthetic-import');expect(j.outbound[0].line.split(',')).toEqual(['circle','metropolitan']);expect(j.outbound[0].rideMinutes).toBe(9);expect(j.outbound[0].rideOverride).toBe(true);
});

test('native process restart preserves saved journeys and preferences',async({page})=>{
 await page.setViewportSize({width:390,height:844});await login(page);const before=(await(await page.request.get('/api/state')).json()).state;await page.getByRole('button',{name:'You',exact:true}).click();await page.getByRole('button',{name:'Sign out',exact:true}).click();
 await new Promise<void>(resolve=>{process.once('exit',()=>resolve());process.kill();});
 process=spawn(testExecutable,['--data',fixtureRoot,'--listen','127.0.0.1:19440','--origin','http://127.0.0.1:19440','--no-browser'],{env:{...globalThis.process.env,NATIONAL_RAIL_TOKEN:'',TFL_APP_KEY:''},windowsHide:true,stdio:'ignore'});
 await expect.poll(async()=>{try{return(await fetch('http://127.0.0.1:19440/healthz')).status}catch{return 0}},{timeout:45000}).toBe(200);await login(page);expect((await(await page.request.get('/api/state')).json()).state).toEqual(before);
});


test('search bus alternatives by number or terminus, calculate a shared stop, and reorder after adding',async({page})=>{
 await page.setViewportSize({width:320,height:844});await login(page);
 await page.getByRole('button',{name:'Saved',exact:true}).click();
 await page.getByRole('button',{name:'Add a journey',exact:true}).click();
 await page.getByLabel('Journey name').fill('Synthetic bus and rail order');
 await addVictoriaLeg(page,'Highbury & Islington','Oxford Circus');
 await page.getByRole('button',{name:'Add a leg',exact:true}).click();
 await page.getByRole('button',{name:'Bus',exact:true}).click();
 await page.getByLabel('Find your boarding stop').fill('Camden Town Station');
 await page.getByRole('button',{name:/Camden Town Station.*towards Great Portland St Or Tottenham Court Road/}).click();
 const search=page.getByLabel('Search bus number or destination');
 await search.fill('24');
 await page.getByRole('checkbox',{name:/^24 towards Grosvenor Road/}).check();
 await search.fill('Trafalgar Square');
 await page.getByRole('checkbox',{name:/^29 towards Trafalgar Square/}).check();
 await expect(page.getByRole('checkbox',{name:/^24 towards Grosvenor Road/})).toBeChecked();
 await expect(page.getByLabel('Bus route or line')).toHaveCount(0);
 await expect(page.getByText(/\b(inbound|outbound)\b/i)).toHaveCount(0);
 await page.getByRole('button',{name:'Choose where to get off'}).click();
 await page.getByLabel('Search stops to get off at').fill('Warren Street');
 await page.getByRole('button',{name:/Warren Street Station.*Euston Road/}).click();
 await expect(page.getByText(/min · TfL timetable/)).toBeVisible();
 await expect(page.getByLabel('Ride duration override (minutes)')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Add leg to journey',exact:true}).click();
 const busCard=page.locator('.stack--leg-card').filter({hasText:'24 / 29'});
 await busCard.getByRole('button',{name:'Move up',exact:true}).click();
 await expect(page.locator('.stack--leg-card').first()).toContainText('1. 24 / 29');
 await page.getByRole('button',{name:'Save journey',exact:true}).click();
 const state=(await(await page.request.get('/api/state')).json()).state;
 const journey=state.journeys.find((j:any)=>j.name==='Synthetic bus and rail order');
 expect(journey.outbound.map((leg:any)=>leg.mode)).toEqual(['bus','tube']);
 expect(journey.outbound[0].alight.id).toBe('490015042U');
 expect(journey.outbound[0].services.map((service:any)=>service.lineId).sort()).toEqual(['24','29']);
 expect(journey.outbound[0].rideMinutes).toBeGreaterThan(0);
});
