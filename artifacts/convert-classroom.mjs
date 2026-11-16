import { createServer } from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = process.cwd();
const server = createServer(async (req, res) => {
  if (req.url === '/') {
    res.setHeader('Content-Type', 'text/html');
    res.end('<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>');
    return;
  }
  const file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try {
    const data = await fs.readFile(file);
    const types = { '.js': 'application/javascript', '.png': 'image/png' };
    res.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream');
    res.end(data);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(3104, '127.0.0.1', resolve));
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.exposeFunction('saveClassroom', async data => {
    await fs.writeFile('hero/classroom-source/classroom-clean.glb', Buffer.from(data, 'base64'));
  });
  await page.goto('http://127.0.0.1:3104');
  const result = await page.evaluate(async () => {
    const THREE = await import('three');
    const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
    const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
    // The FBX's original absolute texture paths are replaced with the supplied PBR maps below.
    const originalLoad = THREE.TextureLoader.prototype.load;
    THREE.TextureLoader.prototype.load = () => new THREE.Texture();
    const scene = new FBXLoader().parse(await (await fetch('/hero/classroom-source/source/classroom.fbx')).arrayBuffer(), '');
    THREE.TextureLoader.prototype.load = originalLoad;
    const removed = [];
    scene.traverse(o => { if (/^(light_rays|dust|glow)$/.test(o.name)) removed.push(o); });
    for (const mesh of removed) mesh.removeFromParent();
    const textures = new THREE.TextureLoader();
    const load = async name => {
      const texture = await textures.loadAsync('/hero/classroom-source/textures/' + name + '.png');
      texture.name = name;
      if (name.includes('Base_color')) texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };
    const materials = {};
    for (const name of ['walls', 'tables', 'details', 'posters']) {
      // The structural atlas includes the floor and lower panels; use a neutral finish.
      const map = name === 'walls' ? null : await load(name + '_Base_color');
      const material = new THREE.MeshStandardMaterial({name, map, roughness: 1, metalness: 0});
      if (name === 'walls') material.color.set('#E1E4E9').multiplyScalar(0.49);
      if (name !== 'posters') {
        const [normal, ao, roughness] = await Promise.all(['_Normal_OpenGL', '_AO', '_Roughness'].map(suffix => load(name + suffix)));
        material.normalMap = normal;
        material.aoMap = ao;
        material.aoMapIntensity = 0.7;
        material.roughnessMap = roughness;
        if (name !== 'walls') { material.metalnessMap = await load(name + '_Metallic'); material.metalness = 1; }
      }
      materials[name] = material;
    }
    materials.floor = materials.walls.clone();
    materials.floor.name = 'floor';
    materials.floor.color.multiplyScalar(0.64);
    scene.scale.multiplyScalar(0.01);
    scene.updateMatrixWorld(true);
    let triangles = 0;
    let floorTriangles = 0;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const normal = new THREE.Vector3(), edge = new THREE.Vector3();
    scene.traverse(o => {
      if (!o.isMesh) return;
      const old = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!materials[old.name]) throw new Error('Unexpected material ' + old.name);
      o.material = materials[old.name];
      if (old.name === 'walls') {
        // Separate upward-facing walking surfaces from the shared wall atlas.
        // Room floor and raised platform are below 0.6 m; upper moldings stay unchanged.
        const geometry = o.geometry;
        const positions = geometry.attributes.position;
        const indices = geometry.index;
        const count = indices?.count ?? positions.count;
        o.material = [materials.walls, materials.floor];
        geometry.clearGroups();
        let start = 0, materialIndex = -1;
        for (let i = 0; i < count; i += 3) {
          a.fromBufferAttribute(positions, indices ? indices.getX(i) : i).applyMatrix4(o.matrixWorld);
          b.fromBufferAttribute(positions, indices ? indices.getX(i + 1) : i + 1).applyMatrix4(o.matrixWorld);
          c.fromBufferAttribute(positions, indices ? indices.getX(i + 2) : i + 2).applyMatrix4(o.matrixWorld);
          normal.subVectors(b, a).cross(edge.subVectors(c, a)).normalize();
          const floor = normal.y > 0.9 && (a.y + b.y + c.y) / 3 < 0.6;
          const next = floor ? 1 : 0;
          if (floor) floorTriangles++;
          if (next !== materialIndex) {
            if (materialIndex !== -1) geometry.addGroup(start, i - start, materialIndex);
            start = i;
            materialIndex = next;
          }
        }
        geometry.addGroup(start, count - start, materialIndex);
      }
      if (o.geometry.attributes.uv) o.geometry.setAttribute('uv1', o.geometry.attributes.uv.clone());
      triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
    });
    if (!floorTriangles) throw new Error('No floor surfaces found');
    const bounds = new THREE.Box3().setFromObject(scene);
    const binary = await new GLTFExporter().parseAsync(scene, {binary: true, maxTextureSize: 1024});
    const bytes = new Uint8Array(binary);
    let encoded = '';
    for (let i = 0; i < bytes.length; i += 8192) encoded += String.fromCharCode(...bytes.subarray(i, i + 8192));
    await window.saveClassroom(btoa(encoded));
    return {removed: removed.map(o=>o.name), triangles, floorTriangles, bytes: binary.byteLength, min:bounds.min.toArray(), max:bounds.max.toArray()};
  });
  console.log(result);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
