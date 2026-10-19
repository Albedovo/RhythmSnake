// Camera and hand tracking are separate stages so failures are actionable.
export function cameraError(error, stage='camera') {
  if (error.name==='NotAllowedError' || error.name==='SecurityError') return 'Camera permission denied. Allow this site and your browser in macOS System Settings → Privacy & Security → Camera.';
  if (error.name==='NotFoundError') return 'No camera found. Check your built-in camera or reconnect an external camera.';
  if (error.name==='NotReadableError') return 'Camera unavailable. Close other apps using it, then reconnect.';
  if (error.name==='TimeoutError') return stage==='model'?'Hand model loading timed out. Please retry.':'No camera frames received. Check the permission prompt or open localhost in Chrome / Safari.';
  if (stage==='model') return 'Hand tracking could not load. Check the local vendor files and use localhost.';
  return `Connection failed: ${error.message || error.name}. Select another camera and retry.`;
}
// Ask for a genuine 60-FPS camera mode, rather than relabeling 30-FPS frames.
export async function preferSixtyFps(track){
 const capabilities=track?.getCapabilities?.()||{},maximum=capabilities.frameRate?.max;
 const read=()=>track?.getSettings?.().frameRate||0;
 if(!track?.applyConstraints||maximum!=null&&maximum<59.5)return {requested:60,maximum:maximum??null,actual:read()};
 const attempts=[{frameRate:{exact:60},width:{ideal:640},height:{ideal:480}},{frameRate:{exact:60},width:{exact:320},height:{exact:240}}];
 for(const constraints of attempts){try{await track.applyConstraints(constraints);if(read()>=59.5)break;}catch{/* Keep the working camera if this mode is unsupported. */}}
 return {requested:60,maximum:maximum??null,actual:read()};
}
export class CameraController {
  constructor({video, preview, onStatus=()=>{}, media=globalThis.navigator?.mediaDevices, loadDetector}) {
    Object.assign(this,{video,preview,onStatus,media});this.stream=null;this.detector=null;this.generation=0;
    this.loadDetector=loadDetector || (async()=>{
      const {HandLandmarker,FilesetResolver}=await import('./vendor/mediapipe/vision_bundle.mjs');
      const files=await FilesetResolver.forVisionTasks(new URL('./vendor/mediapipe/wasm',import.meta.url).href);
      return HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:new URL('./vendor/models/hand_landmarker.task',import.meta.url).href,delegate:'CPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.55,minTrackingConfidence:.55});
    });
  }
  stop(){this.generation++;this.detector?.stop?.();this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;for(const video of [this.video,this.preview])if(video)video.srcObject=null;}
  async start(deviceId='') {
    this.stop();const generation=this.generation;let stage='permission';
    try {
      if(!this.media?.getUserMedia)throw new Error('Camera access is unavailable. Use Chrome / Safari on localhost or HTTPS.');
      this.onStatus('permission','Allow camera access in the browser or system prompt.');
      // Ask before model loading: permission requests stay directly connected to the click.
      const pending=this.media.getUserMedia({video:deviceId?{deviceId:{exact:deviceId},width:{ideal:640},height:{ideal:480},frameRate:{ideal:60,max:60}}:{facingMode:{ideal:'user'},width:{ideal:640},height:{ideal:480},frameRate:{ideal:60,max:60}},audio:false});
      pending.then(s=>{if(generation!==this.generation)s.getTracks().forEach(t=>t.stop())},()=>{});
      const stream=await pending;
      if(generation!==this.generation)return null;
      this.stream=stream;this.capture=await preferSixtyFps(stream.getVideoTracks?.()[0]||stream.getTracks()[0]);if(generation!==this.generation)return null;stage='video';this.onStatus('video','Camera allowed. Waiting for video…');
      this.video.srcObject=stream;if(this.preview)this.preview.srcObject=stream;
      await this.video.play();if(this.preview)this.preview.play().catch(()=>{});
      if(this.video.readyState<2)await new Promise((resolve,reject)=>{
        let timer;const clean=()=>{clearTimeout(timer);this.video.removeEventListener('loadeddata',ready);this.video.removeEventListener('error',fail)};
        const ready=()=>{clean();resolve()},fail=()=>{clean();reject(new Error('Cannot read video frames'))};
        this.video.addEventListener('loadeddata',ready,{once:true});this.video.addEventListener('error',fail,{once:true});
        timer=setTimeout(()=>{clean();reject(Object.assign(new Error('Video timed out'),{name:'TimeoutError'}))},10000);
      });
      if(generation!==this.generation)return null;
      stage='model';this.onStatus('model','Video connected. Loading local hand tracking…');
      if(!this.detector)this.detector=await this.loadDetector();
      if(generation!==this.generation)return null;
      this.onStatus('ready','Camera ready. Open your hands; keep both visible for CLAP.');
      const devices=this.media.enumerateDevices?await this.media.enumerateDevices().catch(()=>[]):[];
      return {stream,detector:this.detector,devices:devices.filter(d=>d.kind==='videoinput')};
    }catch(error){if(generation===this.generation){this.stop();this.onStatus('error',cameraError(error,stage));}throw error;}
  }
}
