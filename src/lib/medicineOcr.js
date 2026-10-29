export async function readMedicineLabel(file,onProgress=()=>{}) {
 const {createWorker}=await import('tesseract.js');
 const worker=await createWorker('eng',1,{
  workerPath:'/ocr/worker.min.js',corePath:'/ocr/core',langPath:'/ocr/lang',
  logger:m=>{if(m.status==='recognizing text')onProgress(Math.round(m.progress*100));else if(m.status.includes('loading'))onProgress('Preparing the local label reader…');},
 });
 try {
  const {data}=await worker.recognize(file);
  let barcode='';
  if(typeof BarcodeDetector!=='undefined'){
   try{const image=await createImageBitmap(file);try{const codes=await new BarcodeDetector().detect(image);barcode=codes.map(c=>c.rawValue).join(', ');}finally{image.close();}}catch{/* OCR still works when barcode support is unavailable. */}
  }
  return {text:data.text.trim(),confidence:Math.round(data.confidence),barcode,status:data.text.trim()?'unverified':'unreadable'};
 } finally {await worker.terminate();}
}
