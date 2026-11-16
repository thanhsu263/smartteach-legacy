import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const cobalt = 0x2259ed;
const navy = 0x102b68;
const yellow = 0xffd453;

function material(color: number) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.76 });
}

function box(
  parent: THREE.Object3D, surface: THREE.Material,
  width: number, height: number, depth: number,
  x = 0, y = 0, z = 0, radius = 0,
) {
  const geometry = radius
    ? new RoundedBoxGeometry(width, height, depth, 2, radius)
    : new THREE.BoxGeometry(width, height, depth);
  const mesh = new THREE.Mesh(geometry, surface);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function cylinder(
  parent: THREE.Object3D, surface: THREE.Material,
  top: number, bottom: number, height: number, y = 0, segments = 24,
) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, segments), surface);
  mesh.position.y = y;
  parent.add(mesh);
  return mesh;
}

function pencil() {
  const model = new THREE.Group();
  cylinder(model, material(yellow), 0.078, 0.078, 1.62, 0, 6);
  cylinder(model, material(0xffe6b8), 0.016, 0.078, 0.26, 0.94, 6);
  cylinder(model, material(navy), 0, 0.022, 0.095, 1.09, 8);
  cylinder(model, material(0xa8bade), 0.081, 0.081, 0.17, -0.88);
  cylinder(model, material(0xeaa9b3), 0.075, 0.071, 0.19, -1.03);
  return model;
}

function notebook() {
  const model = new THREE.Group();
  const cover = material(cobalt);
  const paper = material(0xfffaf0);
  const rule = material(0xaabde1);
  for (const side of [-1, 1]) {
    const leaf = new THREE.Group();
    const x = 0.57 * side;
    leaf.rotation.y = -0.23 * side;
    box(leaf, cover, 1.16, 1.41, 0.13, x, 0, -0.04, 0.052);
    box(leaf, paper, 1.08, 1.32, 0.11, x, 0.01, 0.045, 0.039);
    for (let i = 0; i < 8; i += 1) box(leaf, rule, 0.89, 0.009, 0.008, x, 0.45 - i * 0.12, 0.104);
    box(leaf, material(0xe2abac), 0.009, 1.16, 0.008, x - 0.34, 0, 0.105);
    model.add(leaf);
  }
  return model;
}

function ruler() {
  const model = new THREE.Group();
  const mark = material(0x9b6a32);
  box(model, material(yellow), 2.1, 0.34, 0.095, 0, 0, 0, 0.042);
  for (let i = 0; i < 21; i += 1) {
    const height = i % 5 === 0 ? 0.13 : 0.07;
    box(model, mark, 0.014, height, 0.01, -0.92 + i * 0.092, 0.14 - height / 2, 0.05);
  }
  return model;
}

function globe() {
  const model = new THREE.Group();
  const image = document.createElement("canvas");
  image.width = 512;
  image.height = 256;
  const ctx = image.getContext("2d")!;
  ctx.fillStyle = "#376ed9";
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = "#6591e4";
  for (let i = 0; i < 16; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 32, 0);
    ctx.lineTo(i * 32, 256);
    ctx.stroke();
  }
  for (let i = 1; i < 8; i += 1) {
    ctx.beginPath();
    ctx.moveTo(0, i * 32);
    ctx.lineTo(512, i * 32);
    ctx.stroke();
  }
  ctx.fillStyle = "#adcaff";
  const land = new Path2D("M35 57 L65 40 116 41 139 53 128 74 100 80 90 99 107 110 91 123 64 105 55 79 Z M102 124 L134 119 166 141 158 165 138 181 127 220 112 195 116 173 98 151 Z M205 64 L230 45 265 55 297 46 331 56 362 48 407 69 434 84 398 101 375 119 354 126 338 111 316 129 297 98 273 107 254 91 223 102 208 90 Z M237 105 L267 116 279 144 258 185 241 172 227 144 209 129 Z M365 162 L391 148 425 161 438 184 408 198 367 186 Z M145 33 L183 20 205 31 186 61 162 65 Z");
  ctx.fill(land);
  const map = new THREE.CanvasTexture(image);
  map.colorSpace = THREE.SRGBColorSpace;
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.57, 32, 24), new THREE.MeshStandardMaterial({ map, roughness: 0.72 }));
  model.add(sphere);
  const stand = material(navy);
  const meridian = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.025, 12, 40, Math.PI), stand);
  meridian.rotation.z = Math.PI / 2;
  meridian.rotation.y = 0.26;
  model.add(meridian);
  const pins = material(yellow);
  cylinder(model, pins, 0.065, 0.065, 0.10, 0.645);
  cylinder(model, pins, 0.065, 0.065, 0.10, -0.645);
  const pedestal = new THREE.Group();
  pedestal.rotation.z = 0.27;
  cylinder(pedestal, stand, 0.048, 0.079, 0.205, -0.70);
  cylinder(pedestal, stand, 0.10, 0.22, 0.082, -0.82);
  cylinder(pedestal, stand, 0.265, 0.285, 0.085, -0.89, 40);
  cylinder(pedestal, pins, 0.268, 0.271, 0.017, -0.86, 40);
  model.add(pedestal);
  return { model, sphere };
}

export function makeClassroomObjects(eraser: THREE.Group) {
  return { pencil: pencil(), notebook: notebook(), ruler: ruler(), eraser, globe: globe() };
}

export function disposeClassroom(scene: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const images = new Set<ImageBitmap>();
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)) return;
    if (object instanceof THREE.InstancedMesh) object.dispose();
    geometries.add(object.geometry);
    const surfaces: THREE.Material[] = Array.isArray(object.material) ? object.material : [object.material];
    for (const surface of surfaces) {
      materials.add(surface);
      for (const value of Object.values(surface)) {
        if (!(value instanceof THREE.Texture)) continue;
        textures.add(value);
        if (typeof ImageBitmap !== "undefined" && value.image instanceof ImageBitmap) images.add(value.image);
      }
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((surface) => surface.dispose());
  textures.forEach((texture) => texture.dispose());
  images.forEach((image) => image.close());
}
