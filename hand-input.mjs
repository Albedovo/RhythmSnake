// Keep gesture history attached to physical hands, even when detector order changes.
export class HandTracks {
 constructor(){this.reset();}
 reset(){this.hands=[];this.nextId=0;}
 update(features,now){
  const old=this.hands.filter(h=>now-h.seen<350),assigned=new Set();
  // With two hands there are only two possible assignments; minimize total travel.
  let order=features.map((_,i)=>i);
  if(features.length===2&&old.length===2){
   const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
   if(d(features[0],old[1])+d(features[1],old[0])<d(features[0],old[0])+d(features[1],old[1]))order=[1,0];
  }
  const live=features.map((f,i)=>{
   let previous=features.length===2&&old.length===2?old[order[i]]:old.filter(h=>!assigned.has(h.id)).sort((a,b)=>Math.hypot(a.x-f.x,a.y-f.y)-Math.hypot(b.x-f.x,b.y-f.y))[0];
   if(previous&&Math.hypot(previous.x-f.x,previous.y-f.y)>.45)previous=null;
   const h=previous||{id:++this.nextId,fist:false,armed:false,candidate:null,history:[],lastSwipe:-1000,drawX:f.x,drawY:f.y};
   const dt=(now-(h.seen??now))/1000,dx=f.x-h.x,dy=f.y-h.y;
   h.vx=dt>0&&dt<.12&&Math.abs(dx)<.15?dx/dt:0;h.vy=dt>0&&dt<.12&&Math.abs(dy)<.15?dy/dt:0;
   assigned.add(h.id);Object.assign(h,{...f,rawFist:f.fist,fist:h.fist,seen:now,visible:f.visible!==false});return h;
  });
  this.hands=[...live,...old.filter(h=>!assigned.has(h.id)).map(h=>({...h,visible:false}))];return live;
 }
}
// Clap from the palm distance in hand lengths. It arms once the hands are apart and fires as they
// close in. Fast or wide claps often blur, or the two hands merge into one detection, before the
// touching frame is ever seen; a fast approach that then vanishes counts as a clap at the predicted
// contact time.
export const CLAP = { apart: 1.4, contact: .9, closingSpeed: 4, lostWithin: 180, armedFor: 600, cooldown: 80 };
export class ClapGesture {
 constructor(){this.reset();}
 reset(){this.last=null;this.prev=null;this.prevClosing=null;this.armedAt=-1e9;this.lastHit=-1e9;}
 armed(t){return t-this.armedAt<CLAP.armedFor&&t-this.lastHit>CLAP.cooldown;}
 hit(t){this.lastHit=t;this.armedAt=-1e9;this.last=this.prev=this.prevClosing=null;return t;}
 // Returns the contact timestamp (ms, same clock as `now`) or null.
 update(pair,now){
  if(!pair){
   const a=this.last,b=this.prev;
   if(!a||!b||now-a.t>CLAP.lostWithin||!this.armed(now)){if(a&&now-a.t>CLAP.lostWithin)this.last=this.prev=null;return null;}
   const dt=(a.t-b.t)/1000,v=dt>0?(a.r-b.r)/dt:0;
   // Wide, fast claps can disappear well before contact. Keep the last two samples
   // until the predicted contact, rather than discarding them on the first lost frame.
   const travel=v<-CLAP.closingSpeed?(a.r-CLAP.contact)/-v*1000:Infinity;
   const contact=a.t+Math.max(0,travel);
   return travel<=140&&now>=contact?this.hit(contact):null;
  }
  const s={t:now,r:pair.ratio},p=this.last&&now-this.last.t<150?this.last:null;
  this.prev=p;this.last=s;
  if(s.r>=CLAP.apart)this.armedAt=now; // separating re-arms even during the cooldown, for rapid claps
  if(!this.armed(now))return null;
  const v=p&&now>p.t?(s.r-p.r)/((now-p.t)/1000):0;
  // Two visible samples may straddle contact entirely. Recover the minimum of
  // the approach/rebound when the hands were already within two hand lengths.
  const before=this.prevClosing;
  this.prevClosing=v<-CLAP.closingSpeed?{t:now,r:s.r,v}:null;
  if(p&&before&&p.t===before.t&&v>CLAP.closingSpeed&&p.r<=CLAP.contact*2.2){
   const contact=p.t+Math.max(0,(p.r-CLAP.contact)/-before.v*1000);
   if(contact<=now)return this.hit(contact);
  }
  return s.r<=CLAP.contact||(s.r<=CLAP.contact*1.6&&v<-CLAP.closingSpeed)?this.hit(now):null;
 }
}

// Display-only extrapolation: raw coordinates used for judgement are never filtered.
export function responsiveCursor(hand,now,enabled=true){
 const age=(now-hand.seen)/1000;
 if(!enabled||!hand.visible||!Number.isFinite(age)||age<0||age>.10)return {...hand};
 const lead=Math.min(.035,age),dx=(hand.vx||0)*lead,dy=(hand.vy||0)*lead,scale=Math.min(1,.045/(Math.hypot(dx,dy)||1));
 return {...hand,x:Math.max(0,Math.min(1,hand.x+dx*scale)),y:Math.max(0,Math.min(1,hand.y+dy*scale))};
}
