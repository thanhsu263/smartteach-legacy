
import { chromium } from 'playwright';
import fs from 'node:fs';
import zlib from 'node:zlib';
const label = process.env.SMARTTEACH_MOTION_LABEL ?? 'after';
const root = 'artifacts/motion-build-20261112/' + label;
const origin = 'http://localhost:' + (process.env.PLAYWRIGHT_PORT ?? '3100');
fs.mkdirSync(root, {recursive:true});
(async () => {
 const browser = await chromium.launch();
 try {
  const metrics = {};
  for (const route of ['/', '/tools/countdown', '/play']) {
   const context = await browser.newContext({viewport:{width:1280,height:800}, reducedMotion:'no-preference'});
   const page = await context.newPage();
   const client = await context.newCDPSession(page);
   await client.send('Network.enable');
   await client.send('Network.setCacheDisabled',{cacheDisabled:true});
   const assets = new Set();
   page.on('request', req => {
     const url = new URL(req.url());
     if (url.origin === origin && /^\/_next\/static\/.*\.(js|css)$/.test(url.pathname)) assets.add(url.pathname);
   });
   await page.goto(origin + route, {waitUntil:'networkidle'});
   await page.evaluate(() => document.fonts.ready);
   const resources = [...assets].sort().map(path => {
    const content = fs.readFileSync(path.replace('/_next/', '.next/'));
    return {path, raw: content.length, gzip: zlib.gzipSync(content).length};
   });
   const sums = {};
   for (const ext of ['js','css']) sums[ext] = resources.filter(r=>r.path.endsWith('.'+ext)).reduce((sum,r)=>({raw:sum.raw+r.raw,gzip:sum.gzip+r.gzip}),{raw:0,gzip:0});
   metrics[route] = { ...sums, resources };
   const slug = route === '/' ? 'landing' : route.split('/').pop();
   await page.screenshot({path:root+'/'+slug+'-1280.png',animations:'disabled'});
   if (route !== '/play') {
    for(let pass=1;pass<=3;pass++) {
     const done = new Promise(resolve=>client.once('Tracing.tracingComplete', resolve));
     await client.send('Tracing.start',{categories:'devtools.timeline,blink.user_timing,loading,disabled-by-default-devtools.timeline',transferMode:'ReturnAsStream'});
     if (route === '/') {
      await page.mouse.move(1010,350);
      await page.mouse.move(1150,450,{steps:12});
      await page.mouse.move(350,430);
      await page.mouse.wheel(0,780);
      await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      await page.mouse.wheel(0,-160);
      await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
     } else {
      await page.getByRole('button',{name:'Thu gọn menu'}).click();
      await page.mouse.move(400,250);
      await page.mouse.move(45,230);
      await page.mouse.move(430,250);
      await page.getByRole('button',{name:'Mở rộng menu'}).click();
      await page.mouse.move(430,250);
     }
     await client.send('Tracing.end');
     const {stream}=await done;
     const file=fs.openSync(root+'/'+slug+'-'+pass+'.json','w');
     try {
      while (true) {
       const data=await client.send('IO.read',{handle:stream});
       fs.writeSync(file, data.base64Encoded?Buffer.from(data.data,'base64'):data.data);
       if (data.eof) break;
      }
     } finally {fs.closeSync(file); await client.send('IO.close',{handle:stream});}
    }
   }
   await context.close();
  }
  fs.writeFileSync(root+'/bundle.json',JSON.stringify(metrics,null,2));
  for (const [route,{js,css}] of Object.entries(metrics)) console.log(route,'JS gzip:',js.gzip,'CSS gzip:',css.gzip);
 } finally { await browser.close(); }
})().catch(err=>{console.error(err);process.exitCode=1;});
