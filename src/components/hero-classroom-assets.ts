import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { disposeClassroom } from "./hero-classroom-models";

export async function loadClassroomAssets(signal: AbortSignal) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

  async function load(name: string) {
    const response = await fetch(`/hero/models/${name}.glb`, { signal });
    if (!response.ok) throw new Error(`Unable to load hero model ${name}`);
    const data = await response.arrayBuffer();
    signal.throwIfAborted();
    return (await loader.parseAsync(data, "/hero/models/")).scene;
  }

  const results = await Promise.allSettled([load("classroom"), load("eraser")]);
  const failure = results.find((result) => result.status === "rejected");
  if (failure || signal.aborted) {
    for (const result of results) if (result.status === "fulfilled") disposeClassroom(result.value);
    signal.throwIfAborted();
    throw failure?.status === "rejected" ? failure.reason : new Error("Hero model loading failed");
  }
  const room = (results[0] as PromiseFulfilledResult<THREE.Group>).value;
  const eraser = (results[1] as PromiseFulfilledResult<THREE.Group>).value;

  const roomBounds = new THREE.Box3().setFromObject(room);
  const center = roomBounds.getCenter(new THREE.Vector3());
  const roomScale = 16 / roomBounds.getSize(new THREE.Vector3()).x;
  room.scale.multiplyScalar(roomScale);
  room.position.set(-center.x * roomScale, -roomBounds.min.y * roomScale, -center.z * roomScale);

  const eraserBounds = new THREE.Box3().setFromObject(eraser);
  const size = eraserBounds.getSize(new THREE.Vector3());
  const scale = 1.5 / Math.max(size.x, size.y, size.z);
  const eraserCenter = eraserBounds.getCenter(new THREE.Vector3());
  eraser.scale.multiplyScalar(scale);
  eraser.position.copy(eraserCenter).multiplyScalar(-scale);
  const eraserGroup = new THREE.Group();
  eraserGroup.add(eraser);

  return { room, eraser: eraserGroup };
}
