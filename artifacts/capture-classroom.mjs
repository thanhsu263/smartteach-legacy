import { chromium } from '@playwright/test';
import sharp from 'sharp';
const browser = await chromium.launch();
try {
  for (const width of [1440, 375]) {
    const page = await browser.newPage({ viewport: { width, height: 956 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => console.log('pageerror', error.message));
    page.on('console', message => { if (message.type() === 'error') console.log('consoleerror', message.text()); });
    await page.goto('http://localhost:3000');
    await page.locator('[data-scene=paused]').waitFor({ timeout: 30000 });
    await page.addStyleTag({content: 'nextjs-portal{display:none!important}'});
    const gpu = await page.locator('canvas').evaluate(canvas => {
      const gl = canvas.getContext('webgl2');
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      return info && gl.getParameter(info.UNMASKED_RENDERER_WEBGL);
    });
    console.log(width, gpu, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator('section:has(h1)').screenshot({path:`artifacts/classroom-glb-${width}.png`});
    if (width === 1440) {
      await page.addStyleTag({content: '[data-hero-classroom] > :not([data-hero-scenery]) {display:none!important} section:has(h1) > :not([data-hero-classroom]) {opacity:0!important} [data-hero-classroom]::after, [data-hero-scenery]::after{display:none!important}'});
      const png = await page.locator('section:has(h1)').screenshot();
      await sharp(png).webp({quality:84}).toFile('public/hero/classroom-poster.webp');
    }
    await page.close();
  }
} finally { await browser.close(); }
