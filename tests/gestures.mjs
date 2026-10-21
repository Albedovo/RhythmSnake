import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { ClapGesture } from '../hand-input.mjs';
import { setPlayLayout, targetRadius, sweepRadius, toScreen, beatPanelRect, segmentCircleInterval, timingGrade, onSide, LEVELS } from '../rhythm-core.mjs';
import { buildPhrase, SONGS } from '../rhythm-chart.mjs';
import { Tutorial } from '../tutorial.mjs';

let checks = 0;
function test(name, fn) { fn(); checks++; console.log('PASS', name); }
const pair = ratio => ({ ratio });
test('wide clap survives multiple lost frames before predicted contact', () => {
 const c = new ClapGesture();
 assert.equal(c.update(pair(8), 0), null);
 assert.equal(c.update(pair(4.5), 50), null);
 assert.equal(c.update(null, 66), null);
 const at = c.update(null, 116);
 assert.ok(at >= 90 && at <= 116);
 assert.equal(c.update(null, 140), null);
});
test('stationary, separating, and expired hands do not produce a clap', () => {
 for (const values of [[5,5],[3,5]]) {
  const c=new ClapGesture(); c.update(pair(values[0]),0); c.update(pair(values[1]),50);
  assert.equal(c.update(null,130),null);
 }
 const c=new ClapGesture(); c.update(pair(8),0); c.update(pair(4),50);
 assert.equal(c.update(null,260),null);
});
test('visible contact, rebound without contact frame, and repeated claps', () => {
 const c = new ClapGesture(); c.update(pair(5),0);
 assert.equal(c.update(pair(.8),50),50);
 assert.equal(c.update(pair(.8),100),null);
 c.update(pair(5),160); assert.equal(c.update(pair(.8),210),210);
 const rebound = new ClapGesture(); rebound.update(pair(5),0); rebound.update(pair(1.8),50);
 assert.ok(rebound.update(pair(4),100) > 50);
});

// Run the game's actual judge functions with synthetic input and the real geometry.
const source=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
const grades=[];
const c=vm.createContext({running:true,paused:false,cameraMode:true,w:1280,h:800,notes:[],
 targetRadius,sweepRadius,toScreen,segmentCircleInterval,timingGrade,onSide,
 judgeTime:t=>t,win:()=>({perfect:.11,good:.24}),lag:()=>0,
 award:(n,grade)=>grades.push(grade),feedback(){},performance:{now:()=>0},
 fail:n=>n.state='miss',score:{add:grade=>(grades.push(grade),100),drain:()=>1},
 sound:{confirmSound(){}},effects:[],pxOf:pos=>toScreen(pos,1280,800),updateHud(){},burst(){},practice:true});
vm.runInContext(source.slice(source.indexOf('const KIND ='),source.indexOf('// Opening the hand')),c);
vm.runInContext(source.slice(source.indexOf('const distPx ='),source.indexOf('// Position notes')),c);
vm.runInContext(source.slice(source.indexOf('function tickReach('),source.indexOf('const pxOf =')),c);
setPlayLayout({top:140,toolbarTop:740});
const note=(type='grab',side='A')=>({type,side,state:'waiting',time:1,pos:{x:.5,y:.5},dir:'right'});
const point=n=>{const p=toScreen(n.pos,1280,800);return{x:p.x/1280,y:p.y/800,visible:true,handId:'one',age:0};};
test('Grab hits inside its circle and rejects the same-side distant fist',()=>{
 const n=note();c.notes=[n]; const p=point(n);
 assert.equal(c.act('fist',{...p,x:p.x+.2},1),false);assert.equal(n.state,'waiting');
 assert.equal(c.act('fist',p,1),true);assert.equal(n.state,'hit');
});
test('Squeeze must start inside its circle',()=>{
 const n=note('squeeze');c.notes=[n];const p=point(n);
 assert.equal(c.act('fist',{...p,y:p.y+.2},1),false);
 assert.equal(c.act('fist',p,1),true);assert.equal(n.state,'holding');
});
test('circle boundary is shared by the judge and drawing',()=>{
 const n=note();const p=point(n),r=targetRadius(1280,800);
 c.notes=[n];assert.equal(c.act('fist',{...p,x:p.x+(r+1)/1280},1),false);
 assert.equal(c.act('fist',{...p,x:p.x+(r-1)/1280},1),true);
});
test('Flip crosses between two outside samples, on the beat',()=>{
 const n=note('flip');c.notes=[n];const p=point(n);
 const path=[{...p,x:p.x-.15,time:.94},{...p,x:p.x+.15,time:1.06}];
 assert.equal(c.act('flip',{...p,path},1.06,'right'),true);
 assert.equal(grades.at(-1),'perfect');
});
test('left Flip also judges the crossing instead of the starting point',()=>{
 const n=note('flip');n.dir='left';c.notes=[n];const p=point(n);
 const path=[{...p,x:p.x+.15,time:.94},{...p,x:p.x-.15,time:1.06}];
 assert.equal(c.act('flip',{...p,path},1.06,'left'),true);
});
test('Flip rejects wrong direction, remote, slow, stale and off-beat trajectories',()=>{
 for (const variant of ['direction','remote','slow','stale','early']) {
  const n=note('flip'),p=point(n);c.notes=[n];
  let path=[{...p,x:p.x-.15,time:.94},{...p,x:p.x+.15,time:1.06}];
  if(variant==='direction')path=path.map((p,i)=>({...p,x:path[1-i].x}));
  if(variant==='remote')path=path.map(a=>({...a,y:a.y+.2}));
  if(variant==='slow')path=[{...p,x:p.x-.001,time:.94},{...p,x:p.x+.001,time:1.06}];
  if(variant==='stale')path[0].time=.4;
  if(variant==='early')path=path.map(a=>({...a,time:a.time-.5}));
  assert.equal(c.act('flip',{...p,path},1.06,'right'),false,variant);
 }
});
test('Clap stays position independent and pointer presses cannot hit distant doubles',()=>{
 const n=note('clap');c.notes=[n];assert.equal(c.act('clap',{x:0,y:0},1),true);
 c.cameraMode=false;const left=note(),right=note();left.pos.x=.2;right.pos.x=.8;c.notes=[left,right];
 assert.equal(c.act('fist',point(left),1),true);assert.equal(right.state,'waiting');c.cameraMode=true;
});
test('Touch and Slide contact remains Perfect at early/on-time/late offsets; uncontacted targets Miss',()=>{
 for(const delta of [-.15,0,.15]) {
  const n=note('reach'),p=point(n);c.tickReach(n,1+delta,[p],targetRadius(1280,800),{good:.24});
  assert.equal(n.state,'hit');assert.equal(grades.at(-1),'perfect');
  const sw={...note('sweep'),ticks:[{time:1,state:'waiting',pos:n.pos}]};
  c.tickSweep(sw,1+delta,[p],targetRadius(1280,800),{good:.24});assert.equal(sw.ticks[0].state,'perfect');
 }
 const n=note('reach');c.tickReach(n,1.3,[],targetRadius(1280,800),{good:.24});assert.equal(n.state,'miss');
 const sw={...note('sweep'),ticks:[{time:1,state:'waiting',pos:n.pos}]};
 c.tickSweep(sw,1.3,[],targetRadius(1280,800),{good:.24});assert.equal(sw.ticks[0].state,'miss');
});
test('all chart targets stay between tutorial/HUD and the beat panel across viewports',()=>{
 for(const [w,h,top,toolbarTop] of [[1440,900,300,824],[1280,720,300,644],[800,600,265,510],[575,751,292,639],[390,844,329,732],[850,480,216,398]]) {
  setPlayLayout({top,toolbarTop});const r=targetRadius(w,h),panel=beatPanelRect(w,h);
  for(const key of Object.keys(LEVELS))for(const def of SONGS[key]) {
   const ph=buildPhrase(def,4,.5,0);
   for(const n of ph.notes)for(const pos of n.ticks?.map(k=>k.pos)||[n.pos]) {
    const p=toScreen(pos,w,h);
    assert.ok(p.y-r>top,`${w}x${h}: ${n.type} above card`);
    assert.ok(p.y+r+22<panel.y-30,`${w}x${h}: ${n.type} below mouth`);
    assert.ok(p.x-r>=0&&p.x+r<=w,`${w}x${h}: horizontal boundary`);
   }
  }
 }
});
test('every tutorial move has a separate demonstration before player attempts',()=>{
 const t=new Tutorial({camera:true});t.report(0,true,null,null,true);
 assert.equal(t.lesson.id,'aim');assert.equal(t.next().options.demo,true);
 t.report(1,true,null,null,true);assert.equal(t.passes,0);assert.equal(t.next().options.demo,false);
 t.report(1,true);t.report(1,true);assert.equal(t.lesson.id,'grab');assert.equal(t.next().options.demo,true);
});
console.log(`${checks} regression checks passed.`);
