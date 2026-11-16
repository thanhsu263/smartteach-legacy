import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { disposeClassroom, makeClassroomObjects } from "./hero-classroom-models";
import { loadClassroomAssets } from "./hero-classroom-assets";
import { createHeroSideRays } from "./hero-side-rays";
import { classroomPose, pointerImpulse } from "./hero-pointer-motion";

type ClassroomOptions = {
  canvas: HTMLCanvasElement;
  hero: HTMLElement;
  onFailure: () => void;
  signal: AbortSignal;
};

const homeCamera = new THREE.Vector3(0, 3.30, 12.4);
const cameraFocus = new THREE.Vector3(0, 2.34, -0.8);
const roomCameraHome = new THREE.Vector3(-4.0, 5.4, 5.8);
const roomCameraFocus = new THREE.Vector3(6.2, 0.2, -9.5);
const classroomLayer = 0;
const floatingObjectsLayer = 1;
const compactPositions = [[0.14, 0.08], [0.88, 0.56], [0.14, 0.94], [0.36, 0.93], [0.68, 0.61]];

export async function mountClassroom({ canvas, hero, onFailure, signal }: ClassroomOptions) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
  let assets: Awaited<ReturnType<typeof loadClassroomAssets>>;
  try {
    assets = await loadClassroomAssets(signal);
  } catch (error) {
    renderer.dispose();
    renderer.forceContextLoss();
    throw error;
  }
  renderer.autoClear = false;
  renderer.setClearColor(0xf0f5ff);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  const environmentScene = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(environmentScene, 0.04);
  environmentScene.dispose();
  pmrem.dispose();
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.65;
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 45);
  camera.position.copy(homeCamera);
  camera.lookAt(cameraFocus);
  camera.updateMatrixWorld();
  const roomView = new THREE.PerspectiveCamera(55, 1, 0.1, 45);
  roomView.layers.set(classroomLayer);
  const rays = createHeroSideRays();

  const daylight = new THREE.DirectionalLight(0xfff5e3, 2.35);
  daylight.position.set(-4, 8, 5);
  const fill = new THREE.DirectionalLight(0xdce9ff, 1.15);
  fill.position.set(6, 4, -2);
  const ambient = new THREE.HemisphereLight(0xf5f9ff, 0xa1b5dd, 2.25);
  for (const light of [ambient, daylight, fill]) {
    light.layers.set(floatingObjectsLayer);
    scene.add(light);
  }
  const roomDaylight = new THREE.DirectionalLight(0xfff2da, 1.6);
  roomDaylight.position.set(-7, 7.5, 2);
  const roomAmbient = new THREE.HemisphereLight(0xf5f8ff, 0x9b8370, 1.25);
  scene.add(roomDaylight, roomAmbient);
  const room = new THREE.Group();
  room.add(assets.room);
  scene.add(room);

  const models = makeClassroomObjects(assets.eraser);
  const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const placements = [
    { id: "pencil", model: models.pencil, x: 0.14, y: 0.14, z: 3.4, scale: 0.55, tilt: [0.10, -0.08, -0.52], drift: 0.12, phase: 1.2 },
    { id: "globe", model: models.globe.model, x: 0.91, y: 0.085, z: 3.3, scale: 0.50, tilt: [0.06, 0.12, -0.27], drift: 0.07, phase: 4.8 },
    { id: "notebook", model: models.notebook, x: 0.17, y: 0.86, z: 3.9, scale: 0.58, tilt: [-0.24, -0.22, -0.08], drift: 0.09, phase: 3.8 },
    { id: "eraser", model: models.eraser, x: 0.40, y: 0.18, z: 3.0, scale: 0.38, tilt: [0.20, -0.30, -0.18], drift: 0.07, phase: 5.7 },
    { id: "ruler", model: models.ruler, x: 0.87, y: 0.90, z: 3.4, scale: 0.58, tilt: [-0.13, -0.11, 0.21], drift: 0.07, phase: 1.9 },
  ] as const;
  const objects = placements.map((placement) => {
    const { model } = placement;
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3()).max(new THREE.Vector3(0.45, 0.45, 0.30));
    const hit = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), hitMaterial);
    hit.position.copy(bounds.getCenter(new THREE.Vector3()));
    model.add(hit);
    model.traverse((part) => part.layers.set(floatingObjectsLayer));
    model.scale.setScalar(placement.scale);
    model.rotation.set(placement.tilt[0], placement.tilt[1], placement.tilt[2]);
    scene.add(model);
    return { ...placement, hit, home: new THREE.Vector3(), offset: new THREE.Vector3(), spin: new THREE.Vector2(), time: 0, hover: 0, baseScale: placement.scale as number };
  });

  const targets = objects.map(({ hit }) => hit);
  const globe = objects.find(({ model }) => model === models.globe.model)!;
  const raycaster = new THREE.Raycaster();
  raycaster.layers.set(floatingObjectsLayer);
  const cursor = new THREE.Vector2();
  const orbit = new THREE.Vector2();
  const velocity = new THREE.Vector2();
  const aim = new THREE.Vector3();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const projected = new THREE.Vector3();
  const hoverAim = new THREE.Vector2();
  let lastPointer: { x: number; y: number; at: number } | undefined;
  let hovered: (typeof objects)[number] | undefined;
  let disposed = false;
  let running = false;
  let lost = false;
  let lastFrame = 0;
  let roomTime = 0;
  let reduced = false;

  function trackRoomPointer(event: PointerEvent) {
    if (event.pointerType === "mouse") {
      const rect = canvas.getBoundingClientRect();
      rays.point((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
    }
    if (!running || reduced || event.pointerType !== "mouse" || event.buttons !== 0) {
      clearHover();
      return;
    }
    if (event.target instanceof Element && event.target.closest("button, a, dialog, [data-hero-quiz-deck]")) {
      clearHover();
      lastPointer = undefined;
      velocity.set(0, 0);
      return;
    }
    hovered = objectAtPointer(event);
    if (hovered) {
      hovered.hit.getWorldPosition(projected).project(camera);
      hoverAim.set(
        THREE.MathUtils.clamp((cursor.x - projected.x) * 5, -1, 1),
        THREE.MathUtils.clamp((cursor.y - projected.y) * 5, -1, 1),
      );
      canvas.dataset.hoverObject = hovered.id;
    } else clearHover();
    const current = { x: event.clientX, y: event.clientY, at: event.timeStamp };
    if (lastPointer) velocity.copy(pointerImpulse(lastPointer, current));
    lastPointer = current;
  }

  function draw(now: number) {
    const elapsed = lastFrame && running ? (now - lastFrame) / 1000 : 0;
    const delta = Math.min(0.05, elapsed);
    lastFrame = now;
    roomTime += elapsed;
    if (!lastPointer || now - lastPointer.at > 55) velocity.multiplyScalar(Math.exp(-delta * 8));
    orbit.x = THREE.MathUtils.damp(orbit.x, velocity.x, 12, delta);
    orbit.y = THREE.MathUtils.damp(orbit.y, velocity.y, 12, delta);
    const pose = classroomPose(roomTime, orbit);
    roomView.position.set(roomCameraHome.x + pose.x, roomCameraHome.y + pose.y, roomCameraHome.z + pose.z);
    aim.set(roomCameraFocus.x + pose.lookX, roomCameraFocus.y + pose.lookY, roomCameraFocus.z);
    roomView.lookAt(aim);
    roomView.rotateZ(pose.roll);
    roomView.updateMatrixWorld();

    for (const object of objects) {
      object.time += delta;
      const active = hovered === object && running && !reduced;
      object.hover = THREE.MathUtils.damp(object.hover, active ? 1 : 0, 7, delta);
      object.offset.x = THREE.MathUtils.damp(object.offset.x, active ? hoverAim.x * 0.12 : 0, 7, delta);
      object.offset.y = THREE.MathUtils.damp(object.offset.y, active ? 0.08 + hoverAim.y * 0.10 : 0, 7, delta);
      object.spin.x = THREE.MathUtils.damp(object.spin.x, active ? -hoverAim.y * 0.22 : 0, 7, delta);
      object.spin.y = THREE.MathUtils.damp(object.spin.y, active ? hoverAim.x * 0.28 : 0, 7, delta);
      object.model.scale.setScalar(object.baseScale * (1 + object.hover * 0.07));
      const wave = object.time * 0.69 + object.phase;
      object.model.position.copy(object.home).add(object.offset);
      object.model.position.x += Math.cos(wave) * object.drift * 0.63;
      object.model.position.y += Math.sin(wave) * object.drift;
      object.model.position.z += Math.sin(wave + 0.5) * object.drift * 0.45;
      object.model.rotation.set(
        object.tilt[0] + object.spin.x + Math.sin(wave) * 0.1,
        object.tilt[1] + object.spin.y + Math.cos(wave) * 0.13,
        object.tilt[2] + Math.sin(wave + 1) * 0.072,
      );
    }
    models.globe.sphere.rotation.y = globe.time * 0.31;
    renderer.clear();
    renderer.render(scene, roomView);
    rays.render(renderer, delta, reduced);
    // Keep the classroom image, but let only floating objects occlude each other.
    renderer.clearDepth();
    camera.layers.set(floatingObjectsLayer);
    renderer.render(scene, camera);
  }

  function resize() {
    if (lost) return;
    const { clientWidth: width, clientHeight: height } = canvas;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5, Math.sqrt(2_300_000 / (width * height))));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    // Raise only the classroom image by 10% from its original position, preserving its angle.
    roomView.setViewOffset(width, height, 0, height * 0.1, width, height);
    const narrow = width <= 650;
    const modelScale = narrow ? THREE.MathUtils.clamp(width / 950, 0.31, 0.67) : Math.min(1, width / 1040);
    for (const [index, object] of objects.entries()) {
      let [x, y] = narrow ? compactPositions[index] : [object.x, object.y];
      if (object.id === "eraser") {
        const anchor = hero.querySelector("[data-hero-eraser-anchor]")?.getBoundingClientRect();
        if (anchor) {
          const rect = canvas.getBoundingClientRect();
          x = (anchor.left + anchor.width / 2 - rect.left) / rect.width;
          y = (anchor.top - THREE.MathUtils.clamp(anchor.height * 0.55, 28, 50) - rect.top) / rect.height;
        }
      }
      object.baseScale = object.scale * modelScale;
      object.model.scale.setScalar(object.baseScale);
      cursor.set(x * 2 - 1, 1 - y * 2);
      raycaster.setFromCamera(cursor, camera);
      plane.constant = -object.z;
      raycaster.ray.intersectPlane(plane, object.home);
    }
    draw(performance.now());
  }

  function pointerRay(event: PointerEvent) {
    const { left, top, width, height } = canvas.getBoundingClientRect();
    cursor.set(((event.clientX - left) / width) * 2 - 1, 1 - ((event.clientY - top) / height) * 2);
    raycaster.setFromCamera(cursor, camera);
  }

  function objectAtPointer(event: PointerEvent) {
    pointerRay(event);
    const match = raycaster.intersectObjects(targets, false)[0];
    return match && objects.find(({ hit }) => hit === match.object);
  }

  function clearHover() {
    hovered = undefined;
    hoverAim.set(0, 0);
    delete canvas.dataset.hoverObject;
  }

  function resetPointer() {
    clearHover();
    rays.point();
    lastPointer = undefined;
    velocity.set(0, 0);
  }

  function stop() {
    running = false;
    renderer.setAnimationLoop(null);
    resetPointer();
    lastFrame = 0;
  }

  function contextLost(event: Event) {
    event.preventDefault();
    lost = true;
    stop();
    onFailure();
  }

  resize();
  void document.fonts.ready.then(() => { if (!disposed) resize(); });
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  hero.addEventListener("pointermove", trackRoomPointer);
  hero.addEventListener("pointerleave", resetPointer);
  hero.addEventListener("pointercancel", resetPointer);
  window.addEventListener("blur", resetPointer);
  canvas.addEventListener("webglcontextlost", contextLost);

  return {
    setRunning(active: boolean, reducedMotion: boolean) {
      reduced = reducedMotion;
      if (!active || lost) {
        stop();
        if (reducedMotion && !lost) {
          roomTime = 0;
          orbit.set(0, 0);
          for (const object of objects) {
            object.time = 0;
            object.hover = 0;
            object.offset.set(0, 0, 0);
            object.spin.set(0, 0);
          }
          draw(performance.now());
        }
      } else if (!running) {
        lastFrame = 0;
        running = true;
        renderer.setAnimationLoop(draw);
      }
    },
    dispose() {
      disposed = true;
      stop();
      observer.disconnect();
      hero.removeEventListener("pointermove", trackRoomPointer);
      hero.removeEventListener("pointerleave", resetPointer);
      hero.removeEventListener("pointercancel", resetPointer);
      window.removeEventListener("blur", resetPointer);
      canvas.removeEventListener("webglcontextlost", contextLost);
      disposeClassroom(scene);
      rays.dispose();
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
