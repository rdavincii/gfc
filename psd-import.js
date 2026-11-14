(() => {
  const fail = message => { throw new Error(message); };
  async function readPsdComposite(file) {
    const header=await file.slice(0,26).arrayBuffer(),view=new DataView(header);
    const ascii=String.fromCharCode(...new Uint8Array(header,0,4));
    if(ascii!=='8BPS')fail('This file is not a Photoshop PSD/PSB.');
    const version=view.getUint16(4,false);if(version!==1&&version!==2)fail('This Photoshop file version is not supported.');
    const channels=view.getUint16(12,false),height=view.getUint32(14,false),width=view.getUint32(18,false),depth=view.getUint16(22,false),mode=view.getUint16(24,false);
    if(!width||!height||width>10000||height>10000||width*height>40000000)fail('The template is too large to render. Export a smaller card-sized PSD or PNG.');
    if(depth!==8)fail('This file uses '+depth+'-bit colour. Save a copy as 8-bit RGB or export it as PNG, then import again.');
    if(mode!==3&&mode!==1)fail('This file uses a colour mode the card workshop cannot read. Save a copy as RGB, then import again.');
    if(channels<(mode===3?3:1))fail('The Photoshop file does not contain enough colour channels.');
    const readU32=async offset=>new DataView(await file.slice(offset,offset+4).arrayBuffer()).getUint32(0,false);
    const readU64=async offset=>{const n=new DataView(await file.slice(offset,offset+8).arrayBuffer()).getBigUint64(0,false);if(n>BigInt(Number.MAX_SAFE_INTEGER))fail('This Photoshop file has a section too large to read.');return Number(n);};
    let offset=26;
    for(let i=0;i<2;i++){const length=await readU32(offset);offset+=4+length;if(offset>file.size)fail('The PSD sections are incomplete.');}
    const maskLength=version===2?await readU64(offset):await readU32(offset);offset+=(version===2?8:4)+maskLength;
    if(offset+2>file.size)fail('The PSD composite image is missing.');
    const compression=new DataView(await file.slice(offset,offset+2).arrayBuffer()).getUint16(0,false);offset+=2;
    const pixelCount=width*height,planes=[];
    if(compression===0){const raw=await file.slice(offset,offset+channels*pixelCount).arrayBuffer();if(raw.byteLength<channels*pixelCount)fail('The PSD composite image is incomplete.');for(let c=0;c<channels;c++)planes.push(new Uint8Array(raw,c*pixelCount,pixelCount));}
    else if(compression===1){
      const rowLengthBytes=channels*height*(version===2?4:2),table=await file.slice(offset,offset+rowLengthBytes).arrayBuffer();if(table.byteLength!==rowLengthBytes)fail('The compressed PSD rows are incomplete.');
      const tv=new DataView(table),rowLengths=new Uint32Array(channels*height);for(let i=0;i<rowLengths.length;i++)rowLengths[i]=version===2?tv.getUint32(i*4,false):tv.getUint16(i*2,false);offset+=rowLengthBytes;
      const packed=await file.slice(offset).arrayBuffer(),pv=new DataView(packed);let cursor=0;
      for(let c=0;c<channels;c++){const plane=new Uint8Array(pixelCount);for(let y=0;y<height;y++){const end=cursor+rowLengths[c*height+y],row=y*width;let x=0;while(cursor<end&&x<width){const n=pv.getInt8(cursor++);if(n>=0){const take=n+1;plane.set(new Uint8Array(packed,cursor,take),row+x);cursor+=take;x+=take;}else if(n!==-128){const take=1-n,value=pv.getUint8(cursor++);plane.fill(value,row+x,row+x+take);x+=take;}}if(x<width)fail('A compressed PSD row is incomplete.');cursor=end;}planes.push(plane);}
    }else if(compression===2||compression===3){
      const compressed=file.slice(offset);let inflated;try{inflated=new Uint8Array(await new Response(compressed.stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());}catch{fail('The Photoshop composite image could not be decompressed. Export a PNG copy and import that instead.');}
      if(inflated.length<channels*pixelCount)fail('The PSD composite image data is incomplete.');
      if(compression===3){for(let c=0;c<channels;c++)for(let y=0;y<height;y++){const row=(c*height+y)*width;for(let x=1;x<width;x++)inflated[row+x]=(inflated[row+x]+inflated[row+x-1])&255;}}
      for(let c=0;c<channels;c++)planes.push(inflated.subarray(c*pixelCount,(c+1)*pixelCount));
    }else fail('The PSD uses an unsupported compression type.');
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d'),image=ctx.createImageData(width,height),pixels=image.data;
    if(mode===3){for(let i=0;i<pixelCount;i++){const d=i*4;pixels[d]=planes[0][i];pixels[d+1]=planes[1][i];pixels[d+2]=planes[2][i];pixels[d+3]=channels>3?planes[3][i]:255;}}
    else for(let i=0;i<pixelCount;i++){const d=i*4,v=planes[0][i];pixels[d]=pixels[d+1]=pixels[d+2]=v;pixels[d+3]=255;}
    ctx.putImageData(image,0,0);return {canvas,width,height,channels,version};
  }
  window.GFC_READ_PSD_COMPOSITE=readPsdComposite;
})();
