import * as THREE from "three";
import { addClassroom, disposeClassroom, makeClassroomObjects } from "./hero-classroom-models";
import { classroomPose, pointerImpulse } from "./hero-pointer-motion";

type ClassroomOptions = {
  canvas: HTMLCanvasElement;
  hero: HTMLElement;
  onQuiz: () => void;
  onFailure: () => void;
};

const homeCamera = new THREE.Vector3(0, 3.30, 12.4);
const cameraFocus = new THREE.Vector3(0, 2.34, -0.8);
const classroomLayer = 0;
const floatingObjectsLayer = 1;
const compactPositions = [[0.14, 0.10], [0.76, 0.11], [0.66, 0.77], [0.85, 0.62], [0.19, 0.81], [0.40, 0.92], [0.22, 0.66]];

export function mountClassroom({ canvas, hero, onQuiz, onFailure }: ClassroomOptions) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
  renderer.autoClear = false;
  renderer.setClearColor(0xf0f5ff);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xeaf1fc, 12, 25);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 45);
  camera.position.copy(homeCamera);
  camera.lookAt(cameraFocus);
  camera.updateMatrixWorld();
  const roomView = camera.clone();

  const daylight = new THREE.DirectionalLight(0xfff5e3, 2.35);
  daylight.position.set(-4, 8, 5);
  const fill = new THREE.DirectionalLight(0xdce9ff, 1.15);
  fill.position.set(6, 4, -2);
  const ambient = new THREE.HemisphereLight(0xf5f9ff, 0xa1b5dd, 2.25);
  for (const light of [ambient, daylight, fill]) {
    light.layers.enable(floatingObjectsLayer);
    scene.add(light);
  }
  const room = addClassroom(scene);
  room.matrixAutoUpdate = false;

  const models = makeClassroomObjects();
  const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const placements = [
    { model: models.pencil, action: "move", x: 0.14, y: 0.14, z: 3.4, scale: 0.55, tilt: [0.10, -0.08, -0.52], drift: 0.12, phase: 1.2 },
    { model: models.extraQuiz, action: "quiz", x: 0.373, y: 0.15, z: 2.3, scale: 0.54, tilt: [-0.13, 0.23, -0.14], drift: 0.10, phase: 2.8 },
    { model: models.quiz, action: "quiz", x: 0.738, y: 0.46, z: 4.3, scale: 0.99, tilt: [0.04, -0.24, 0.10], drift: 0.20, phase: 0.2 },
    { model: models.globe.model, action: "rotate", x: 0.925, y: 0.15, z: 3.3, scale: 0.71, tilt: [0.06, 0.12, -0.27], drift: 0.10, phase: 4.8 },
    { model: models.notebook, action: "rotate", x: 0.238, y: 0.87, z: 3.9, scale: 0.73, tilt: [-0.24, -0.22, -0.08], drift: 0.17, phase: 3.8 },
    { model: models.cube, action: "rotate", x: 0.57, y: 0.83, z: 3.0, scale: 0.76, tilt: [0.55, -0.55, -0.18], drift: 0.11, phase: 5.7 },
    { model: models.ruler, action: "move", x: 0.89, y: 0.79, z: 3.4, scale: 0.78, tilt: [-0.13, -0.11, 0.21], drift: 0.13, phase: 1.9 },
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
    return { ...placement, hit, home: new THREE.Vector3(), offset: new THREE.Vector3(), spin: new THREE.Vector2(), time: 0 };
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
  const position = new THREE.Vector3();
  let lastPointer: { x: number; y: number; at: number } | undefined;
  let gesture: {
    object: (typeof objects)[number]; id: number; x: number; y: number; moved: boolean;
    offset: THREE.Vector3; spin: THREE.Vector2; origin: THREE.Vector3;
  } | undefined;
  let running = false;
  let lost = false;
  let lastFrame = 0;
  let roomTime = 0;

  function trackRoomPointer(event: PointerEvent) {
    if (!running || gesture || event.pointerType !== "mouse" || event.buttons !== 0) return;
    if (event.target instanceof Element && event.target.closest("button, a, dialog")) {
      lastPointer = undefined;
      velocity.set(0, 0);
      return;
    }
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
    roomView.position.set(homeCamera.x + pose.x, homeCamera.y + pose.y, homeCamera.z + pose.z);
    aim.set(cameraFocus.x + pose.lookX, cameraFocus.y + pose.lookY, cameraFocus.z);
    roomView.lookAt(aim);
    roomView.rotateZ(pose.roll);
    roomView.updateMatrixWorld();
    // Apply the moving viewpoint to the room alone. Foreground rendering and picking share the fixed camera.
    room.matrix.multiplyMatrices(camera.matrixWorld, roomView.matrixWorldInverse);
    room.matrixWorldNeedsUpdate = true;

    for (const object of objects) {
      if (gesture?.object !== object) {
        object.time += delta;
        object.offset.multiplyScalar(Math.exp(-delta * 3.6));
        object.spin.multiplyScalar(Math.exp(-delta * 2.8));
      }
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
    camera.layers.set(classroomLayer);
    renderer.render(scene, camera);
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
    const narrow = width <= 650;
    const modelScale = narrow ? THREE.MathUtils.clamp(width / 950, 0.31, 0.67) : Math.min(1, width / 1040);
    for (const [index, object] of objects.entries()) {
      const [x, y] = narrow ? compactPositions[index] : [object.x, object.y];
      object.model.scale.setScalar(object.scale * modelScale);
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

  function resetCursor() {
    canvas.style.cursor = "";
    lastPointer = undefined;
    velocity.set(0, 0);
  }

  function pointerDown(event: PointerEvent) {
    if (gesture || !event.isPrimary || event.button !== 0) return;
    const object = objectAtPointer(event);
    if (!object || (object.action !== "quiz" && (!running || event.pointerType !== "mouse"))) return;
    const origin = new THREE.Vector3();
    plane.constant = -object.z;
    raycaster.ray.intersectPlane(plane, origin);
    gesture = {
      object, id: event.pointerId, x: event.clientX, y: event.clientY, moved: false,
      offset: object.offset.clone(),
      spin: object.spin.clone(),
      origin,
    };
    if (object.action !== "quiz") {
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
    }
    velocity.set(0, 0);
    lastPointer = undefined;
  }

  function pointerMove(event: PointerEvent) {
    if (!gesture) {
      const object = objectAtPointer(event);
      canvas.style.cursor = object?.action === "quiz" ? "pointer" : object && running ? "grab" : "";
      return;
    }
    if (gesture.id !== event.pointerId) return;
    const { object, x, y, origin, offset, spin } = gesture;
    const dx = event.clientX - x;
    const dy = event.clientY - y;
    if (Math.hypot(dx, dy) > 8) gesture.moved = true;
    if (object.action === "move") {
      pointerRay(event);
      plane.constant = -object.z;
      if (raycaster.ray.intersectPlane(plane, position)) {
        object.offset.copy(position).sub(origin).add(offset);
        object.offset.x = THREE.MathUtils.clamp(object.offset.x, -1.65, 1.65);
        object.offset.y = THREE.MathUtils.clamp(object.offset.y, -1.12, 1.12);
      }
    } else if (object.action === "rotate") {
      object.spin.set(spin.x + dy * 0.016, spin.y + dx * 0.018);
    }
  }

  function cancelGesture() {
    const previous = gesture;
    gesture = undefined;
    if (previous && canvas.hasPointerCapture(previous.id)) canvas.releasePointerCapture(previous.id);
    resetCursor();
  }

  function pointerUp(event: PointerEvent) {
    if (gesture?.id !== event.pointerId) return;
    const { object, moved } = gesture;
    cancelGesture();
    if (object.action === "quiz" && !moved && objectAtPointer(event) === object) onQuiz();
  }

  function pointerLeave() {
    if (gesture?.object.action === "quiz") cancelGesture();
    resetCursor();
  }

  function stop() {
    running = false;
    renderer.setAnimationLoop(null);
    cancelGesture();
    lastFrame = 0;
  }

  function contextLost(event: Event) {
    event.preventDefault();
    lost = true;
    stop();
    onFailure();
  }

  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  hero.addEventListener("pointermove", trackRoomPointer);
  hero.addEventListener("pointerleave", resetCursor);
  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerup", pointerUp);
  canvas.addEventListener("pointerleave", pointerLeave);
  canvas.addEventListener("pointercancel", cancelGesture);
  canvas.addEventListener("lostpointercapture", cancelGesture);
  canvas.addEventListener("webglcontextlost", contextLost);

  return {
    setRunning(active: boolean, reducedMotion: boolean) {
      if (!active || lost) {
        stop();
        if (reducedMotion && !lost) {
          roomTime = 0;
          orbit.set(0, 0);
          for (const object of objects) {
            object.time = 0;
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
      stop();
      observer.disconnect();
      hero.removeEventListener("pointermove", trackRoomPointer);
      hero.removeEventListener("pointerleave", resetCursor);
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointerleave", pointerLeave);
      canvas.removeEventListener("pointercancel", cancelGesture);
      canvas.removeEventListener("lostpointercapture", cancelGesture);
      canvas.removeEventListener("webglcontextlost", contextLost);
      disposeClassroom(scene);
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
