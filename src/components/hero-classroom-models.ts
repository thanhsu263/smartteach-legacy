import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const white = 0xffffff;
const pale = 0xf0f5ff;
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

function contactShadow() {
  const image = document.createElement("canvas");
  image.width = image.height = 64;
  const ctx = image.getContext("2d")!;
  const gradient = ctx.createRadialGradient(32, 32, 5, 32, 32, 32);
  gradient.addColorStop(0, "rgba(50, 77, 129, .30)");
  gradient.addColorStop(0.55, "rgba(50, 77, 129, .14)");
  gradient.addColorStop(1, "rgba(50, 77, 129, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const map = new THREE.CanvasTexture(image);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false });
}

export function addClassroom(scene: THREE.Scene) {
  const room = new THREE.Group();
  scene.add(room);
  const plaster = material(0xe3ecfa);
  const floor = material(0xe2eaf7);
  const trim = material(0xf9fcff);
  const aluminum = material(0xa7badb);
  const glass = new THREE.MeshBasicMaterial({ color: 0xe7f6ff });
  const sunlitGlass = new THREE.MeshBasicMaterial({ color: 0xf2faff });
  const top = material(0xe8d3a9);
  const seat = material(0xbbcce7);
  const book = material(0x91abd4);

  const roomWidth = 19.8;
  const roomDepth = 21.6;
  const roomHeight = 6.85;
  const roomCenterZ = 5;
  const sidePlaster = material(0xd6e3f7);
  const ceiling = material(0xeaf1fc);
  box(room, plaster, roomWidth, roomHeight, 0.25, 0, roomHeight / 2, -5.8);
  box(room, floor, roomWidth, 0.15, roomDepth, 0, -0.09, roomCenterZ);
  box(room, ceiling, roomWidth, 0.18, roomDepth, 0, roomHeight, roomCenterZ);
  box(room, trim, roomWidth, 0.18, 0.13, 0, 0.11, -5.6, 0.02);
  box(room, trim, roomWidth, 0.08, 0.14, 0, 5.9, -5.61, 0.02);

  const grid = new THREE.GridHelper(34, 17, 0xc7d6ee, 0xc7d6ee);
  grid.position.y = -0.012;
  grid.material.transparent = true;
  grid.material.opacity = 0.48;
  room.add(grid);

  function addWindow(x: number, y: number, z: number, angle = 0) {
    const window = new THREE.Group();
    window.position.set(x, y, z);
    window.rotation.y = angle;
    room.add(window);
    box(window, trim, 3.75, 2.77, 0.17, 0, 0, 0, 0.05);
    box(window, glass, 3.48, 2.50, 0.09, 0, 0, 0.10, 0.02);
    box(window, sunlitGlass, 3.45, 0.96, 0.018, 0, 0.74, 0.14, 0.007);
    box(window, trim, 0.08, 2.57, 0.13, 0, 0, 0.16);
    box(window, trim, 3.54, 0.08, 0.13, 0, 0.19, 0.16);
    box(window, trim, 3.98, 0.12, 0.47, 0, -1.4, 0.15, 0.03);
  }

  addWindow(-6.25, 4.77, -5.55);
  addWindow(6.25, 4.77, -5.55);

  for (const side of [-1, 1]) {
    const wallX = side * roomWidth / 2;
    box(room, sidePlaster, 0.24, roomHeight, roomDepth, wallX, roomHeight / 2, roomCenterZ);
    box(room, trim, 0.15, 0.18, roomDepth, wallX - side * 0.17, 0.11, roomCenterZ);
    box(room, trim, 0.15, 0.08, roomDepth, wallX - side * 0.17, 5.9, roomCenterZ);
    for (const z of [-2.3, 2.4]) addWindow(wallX - side * 0.15, 3.75, z, -side * Math.PI / 2);

    const cabinet = new THREE.Group();
    cabinet.position.set(side * 8.6, 0, -5.14);
    room.add(cabinet);
    box(cabinet, seat, 1.62, 1.25, 0.65, 0, 0.66, 0, 0.045);
    box(cabinet, top, 1.70, 0.09, 0.72, 0, 1.32, 0, 0.032);
    for (const x of [-0.39, 0.39]) {
      box(cabinet, trim, 0.74, 0.99, 0.08, x, 0.66, 0.34, 0.03);
      box(cabinet, aluminum, 0.09, 0.19, 0.055, x * 0.37, 0.71, 0.40, 0.02);
    }
  }

  for (const x of [-5, 0, 5]) {
    for (const z of [-3.25, 0.85, 4.95]) {
      box(room, aluminum, 1.42, 0.09, 2.12, x, 6.72, z, 0.035);
      box(room, sunlitGlass, 1.32, 0.035, 2.01, x, 6.66, z, 0.02);
    }
  }

  box(room, aluminum, 6.15, 2.48, 0.14, 0.05, 3.32, -5.56, 0.08);
  box(room, material(0xf7fbff), 5.98, 2.29, 0.10, 0.05, 3.35, -5.45, 0.05);
  box(room, trim, 6.22, 0.10, 0.34, 0.05, 2.09, -5.4, 0.03);
  box(room, book, 0.31, 0.055, 0.10, 1.36, 2.16, -5.26, 0.012);

  const desk = new THREE.Group();
  box(desk, top, 1.66, 0.13, 0.86, 0, 1.02, 0, 0.055);
  box(desk, aluminum, 1.47, 0.1, 0.72, 0, 0.9, 0, 0.02);
  for (const x of [-0.65, 0.65]) {
    for (const z of [-0.29, 0.29]) box(desk, aluminum, 0.09, 0.93, 0.09, x, 0.465, z, 0.02);
  }
  box(desk, seat, 0.68, 0.12, 0.57, 0, 0.48, 0.76, 0.04);
  box(desk, seat, 0.68, 0.43, 0.10, 0, 0.81, 1.00, 0.055);
  for (const x of [-0.26, 0.26]) {
    box(desk, aluminum, 0.065, 0.45, 0.065, x, 0.23, 0.56, 0.01);
    box(desk, aluminum, 0.065, 0.8, 0.065, x, 0.4, 0.98, 0.01);
  }
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.0), contactShadow());
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.007, 0.32);
  desk.add(shadow);

  const desks: THREE.Vector3[] = [];
  const positions = [-7.1, -4.8, -2.45, 0, 2.45, 4.8, 7.1];
  for (const [row, z] of [-3.7, -1.7, 0.65, 2.8].entries()) {
    for (const [column, x] of positions.entries()) {
      if (row === 2 && column % 3 === 1) continue;
      if (row === 3 && Math.abs(x) < 4) continue;
      const center = new THREE.Vector3(x + (row === 1 ? 0.6 : 0), 0, z);
      desks.push(center);
      if ((column + row) % 3 === 0) {
        box(room, book, 0.46, 0.075, 0.33, center.x + 0.29, 1.12, z - 0.13, 0.025).rotation.y = -0.19;
      }
    }
  }
  const transform = new THREE.Matrix4();
  const translation = new THREE.Matrix4();
  for (const part of desk.children) {
    if (!(part instanceof THREE.Mesh)) continue;
    part.updateMatrix();
    const copies = new THREE.InstancedMesh(part.geometry, part.material, desks.length);
    desks.forEach(({ x, y, z }, index) => {
      translation.makeTranslation(x, y, z);
      copies.setMatrixAt(index, transform.multiplyMatrices(translation, part.matrix));
    });
    room.add(copies);
  }
  return room;
}

function quizCard() {
  const model = new THREE.Group();
  const paper = material(white);
  const ink = material(navy);
  const accent = material(cobalt);
  const border = material(0xc4d4f4);
  const muted = material(0x9ab1da);
  const fill = material(pale);
  box(model, border, 2.95, 1.94, 0.18, 0, 0, -0.04, 0.07);
  box(model, paper, 2.95, 1.93, 0.14, 0, 0.035, 0.04, 0.07);
  box(model, accent, 2.95, 0.38, 0.085, 0, 0.8, 0.115, 0.04);
  box(model, material(yellow), 0.078, 0.078, 0.025, -1.31, 0.80, 0.174, 0.011);
  box(model, paper, 0.57, 0.042, 0.023, -0.93, 0.80, 0.175, 0.01);
  for (let i = 0; i < 3; i += 1) box(model, fill, 0.04, 0.04, 0.02, 1.11 + i * 0.11, 0.80, 0.172, 0.007);
  box(model, ink, 1.48, 0.075, 0.025, -0.58, 0.45, 0.121, 0.014);
  box(model, muted, 0.91, 0.045, 0.025, -0.865, 0.30, 0.121, 0.012);
  for (const [index, [x, y]] of [[-0.69, 0.04], [0.69, 0.04], [-0.69, -0.37], [0.69, -0.37]].entries()) {
    const selected = index === 1;
    box(model, selected ? accent : border, 1.25, 0.31, 0.052, x, y, 0.119, 0.035);
    box(model, fill, 1.21, 0.27, 0.05, x, y, 0.135, 0.024);
    box(model, selected ? accent : border, 0.15, 0.14, 0.03, x - 0.48, y, 0.165, 0.02);
    box(model, selected ? accent : muted, 0.51, 0.04, 0.03, x - 0.08, y, 0.165, 0.01);
    if (selected) {
      box(model, accent, 0.095, 0.042, 0.03, x + 0.415, y - 0.016, 0.168, 0.008).rotation.z = -0.62;
      box(model, accent, 0.145, 0.042, 0.03, x + 0.48, y + 0.017, 0.168, 0.008).rotation.z = 0.91;
    }
  }
  box(model, border, 2.6, 0.036, 0.024, 0, -0.71, 0.121, 0.009);
  box(model, accent, 1.18, 0.036, 0.029, -0.71, -0.71, 0.124, 0.009);
  return model;
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

function cube() {
  const model = new THREE.Group();
  const frame = material(0x17171b);
  // Right/left, up/down, front/back. White up and green front put red on the right.
  const palette = [0xda1e29, 0xff7209, 0xffffff, 0xffd500, 0x009e55, 0x0059c8].map(material);
  box(model, frame, 1, 1, 1, 0, 0, 0, 0.065);
  const normals = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)];
  for (const [i, normal] of normals.entries()) {
    const face = new THREE.Group();
    face.position.copy(normal).multiplyScalar(0.5);
    face.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    for (let row = -1; row <= 1; row += 1) {
      for (let col = -1; col <= 1; col += 1) box(face, palette[i], 0.27, 0.27, 0.028, col * 0.307, row * 0.307, 0.012, 0.012);
    }
    model.add(face);
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

export function makeClassroomObjects() {
  return { pencil: pencil(), notebook: notebook(), quiz: quizCard(), extraQuiz: quizCard(), ruler: ruler(), cube: cube(), globe: globe() };
}

export function disposeClassroom(scene: THREE.Scene) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)) return;
    if (object instanceof THREE.InstancedMesh) object.dispose();
    geometries.add(object.geometry);
    const surfaces: THREE.Material[] = Array.isArray(object.material) ? object.material : [object.material];
    for (const surface of surfaces) {
      materials.add(surface);
      if ("map" in surface && surface.map instanceof THREE.Texture) textures.add(surface.map);
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((surface) => surface.dispose());
  textures.forEach((texture) => texture.dispose());
}
