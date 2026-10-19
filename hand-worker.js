let detector,backend='CPU',HandLandmarker,files;
async function createDetector(delegate){
 const options={baseOptions:{modelAssetPath:new URL('./vendor/models/hand_landmarker.task',self.location.href).href,delegate},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.5,minTrackingConfidence:.5,minHandPresenceConfidence:.5};
 if(delegate==='GPU')options.canvas=new OffscreenCanvas(512,384);
 const task=await HandLandmarker.createFromOptions(files,options);backend=delegate;return task;
}
self.onmessage=async({data})=>{
 try{
  if(data.type==='init'){
   const vision=await import('./vendor/mediapipe/vision_bundle.mjs');HandLandmarker=vision.HandLandmarker;
   files=await vision.FilesetResolver.forVisionTasks(new URL('./vendor/mediapipe/wasm',self.location.href).href);
   // GPU availability varies by browser; CPU remains a fully functional fallback.
   if(typeof OffscreenCanvas!=='undefined'){try{detector=await createDetector('GPU');}catch{}}
   detector??=await createDetector('CPU');self.postMessage({type:'ready',backend});
  }else if(data.type==='frame'){
   const start=performance.now();
   try{
    let result;
    try{result=detector.detectForVideo(data.bitmap,data.timestamp);}catch(error){
     if(backend!=='GPU')throw error;
     detector.close();detector=await createDetector('CPU');result=detector.detectForVideo(data.bitmap,data.timestamp);
    }
    self.postMessage({type:'result',timestamp:data.timestamp,generation:data.generation,inferenceMs:performance.now()-start,backend,result});
   }finally{data.bitmap.close();}
  }
 }catch(error){self.postMessage({type:'error',message:error.message});}
};
