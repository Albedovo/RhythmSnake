export class WorkerHandTracker{
 static async create(){const tracker=new WorkerHandTracker();await tracker.ready;return tracker;}
 constructor(){
  this.worker=new Worker(new URL('./hand-worker.js?v=13',import.meta.url));this.busy=false;this.latest=null;this.frameCount=0;this.lastMs=0;this.inferenceMs=0;this.fps=0;this.backend='CPU';this.error=null;
  this.received=[];this.cameraFrames=[];this.cameraFps=0;this.video=null;this.callback=null;this.generation=0;this.lastMediaTime=-1;this.availableFrame=0;this.submittedFrame=0;this.resizeSupported=true;
  this.ready=new Promise((resolve,reject)=>{
   this.worker.onmessage=({data})=>{
    if(data.type==='ready'){this.backend=data.backend||'CPU';resolve();}
    if(data.type==='result'){
     const now=performance.now();this.busy=false;if(data.generation!=null&&data.generation!==this.generation){if(this.video)this.submitLatest();return;}this.latest=data;this.lastMs=now-data.timestamp;this.inferenceMs=data.inferenceMs||0;this.backend=data.backend||this.backend;this.frameCount++;
     this.received.push(now);this.received=this.received.filter(t=>now-t<2000);this.fps=this.received.length>1?(this.received.length-1)*1000/(now-this.received[0]):0;
     // Consume the freshest available frame immediately. Never queue old images.
     if(this.video)this.submitLatest();
    }
    if(data.type==='error'){this.busy=false;this.error=data.message;this.stop();reject(Error(data.message));}
   };
   this.worker.onerror=error=>{this.busy=false;this.error=error.message;this.stop();reject(Error(error.message));};
  });this.worker.postMessage({type:'init'});
 }
 start(video){
  this.stop();this.video=video;this.lastMediaTime=-1;this.availableFrame=0;this.submittedFrame=0;this.lastCameraFrame=-1;this.received=[];this.fps=0;this.cameraFrames=[];this.cameraFps=0;
  const generation=this.generation;
  const tick=()=>{const now=performance.now();if(generation!==this.generation||this.video!==video)return;if(video.requestVideoFrameCallback){this.availableFrame++;}else{const quality=video.getVideoPlaybackQuality?.();this.availableFrame=quality?.totalVideoFrames||Math.floor(video.currentTime*60);}
   if(this.availableFrame!==this.lastCameraFrame){this.lastCameraFrame=this.availableFrame;this.cameraFrames.push(now);this.cameraFrames=this.cameraFrames.filter(t=>now-t<2000);this.cameraFps=this.cameraFrames.length>1?(this.cameraFrames.length-1)*1000/(now-this.cameraFrames[0]):0;}
   this.submitLatest();this.callback=video.requestVideoFrameCallback?video.requestVideoFrameCallback(tick):requestAnimationFrame(tick);};
  this.callback=video.requestVideoFrameCallback?video.requestVideoFrameCallback(tick):requestAnimationFrame(tick);
 }
 stop(){
  const video=this.video;this.video=null;this.generation++;
  if(this.callback!=null){if(video?.cancelVideoFrameCallback)video.cancelVideoFrameCallback(this.callback);else if(typeof cancelAnimationFrame==='function')cancelAnimationFrame(this.callback);}
  this.callback=null;this.latest=null;
 }
 submitLatest(){
  const video=this.video;if(!video||this.availableFrame===this.submittedFrame||video.readyState<2||this.busy||this.error)return;
  this.submittedFrame=this.availableFrame;this.lastMediaTime=video.currentTime;void this.request(video,performance.now());
 }
 async request(video,timestamp){
  if(this.busy||this.error||video.readyState<2)return false;this.busy=true;
  const generation=this.generation;let bitmap;
  try{
   // Keep the visible camera full-size, but reduce upload/copy cost for inference.
   const width=Math.min(512,video.videoWidth||512),height=Math.round(width*(video.videoHeight||384)/(video.videoWidth||512));
   if(this.resizeSupported){try{bitmap=await createImageBitmap(video,{resizeWidth:width,resizeHeight:height,resizeQuality:'low'});}catch{this.resizeSupported=false;}}
   bitmap??=await createImageBitmap(video);
   if(generation!==this.generation){bitmap.close();this.busy=false;this.submitLatest();return false;}
   this.worker.postMessage({type:'frame',bitmap,timestamp,generation},[bitmap]);return true;
  }catch{bitmap?.close();this.busy=false;return false;}
 }
 takeResult(){const result=this.latest;this.latest=null;return result;}
}
