import * as THREE from "three";
import { sideRaysFragment } from "./hero-side-rays-shader";

// React Bits SideRays, sharing the classroom's WebGL context and animation loop.
// Draw between the room and the foreground so rays never wash over floating objects.
export function createHeroSideRays() {
  const uniforms = {
    uResolution: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uColorA: { value: new THREE.Vector3(1, 0.89, 0.67) },
    uColorB: { value: new THREE.Vector3(0.83, 0.91, 1) },
    uBlend: { value: 0.32 },
    uIntensity: { value: 2.2 },
    uSpread: { value: 0.52 },
    uDensity: { value: 9 },
    uSharpness: { value: 0.65 },
    uFalloff: { value: 1.1 },
    uGlow: { value: 0.32 },
    uSaturation: { value: 0.65 },
    uDust: { value: 0 },
    uOpacity: { value: 0.65 },
    uReveal: { value: 1 },
    uLight: { value: 0 },
    uFrame: { value: new THREE.Vector3(1, 0, 0) },
    uAim: { value: 0 },
    uFocus: { value: new THREE.Vector3(0, 0.13, 0) },
    uSway: { value: 1 },
  };
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: `
      const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
      void main() { gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0); }
    `,
    fragmentShader: sideRaysFragment,
    uniforms,
    transparent: true,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const triangle = new THREE.Mesh(geometry, material);
  triangle.frustumCulled = false;
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  scene.add(triangle);
  let pointer: { x: number; y: number } | undefined;
  let aimVelocity = 0;

  return {
    point(x?: number, y?: number) {
      pointer = x === undefined || y === undefined ? undefined : { x, y };
    },
    render(renderer: THREE.WebGLRenderer, delta: number, reduced: boolean) {
      renderer.getDrawingBufferSize(uniforms.uResolution.value);
      const aspect = uniforms.uResolution.value.x / uniforms.uResolution.value.y;
      let angle = 0;
      if (pointer && !reduced) {
        const x = -(pointer.x - 0.5) * aspect;
        const y = 0.5 - pointer.y;
        angle = Math.atan2(y - 0.62, x - (aspect * 0.5 + 0.1)) + 2.48;
        angle = Math.atan2(Math.sin(angle), Math.cos(angle));
      }
      const target = pointer && !reduced ? THREE.MathUtils.clamp(angle, -0.52, 0.52) * 0.12 : 0;
      const dt = Math.min(delta, 0.05);
      if (reduced) {
        aimVelocity = 0;
        uniforms.uTime.value = 0;
        uniforms.uAim.value = 0;
        uniforms.uFocus.value.set(0, 0.13, 0);
      } else {
        uniforms.uTime.value += dt * 0.32;
        aimVelocity += ((target - uniforms.uAim.value) * 18 - aimVelocity * 2 * Math.sqrt(18)) * dt;
        uniforms.uAim.value += aimVelocity * dt;
        const focus = uniforms.uFocus.value;
        focus.x = THREE.MathUtils.damp(focus.x, angle - uniforms.uAim.value, 6, dt);
        focus.z = THREE.MathUtils.damp(focus.z, pointer ? 0.17 : 0, 6, dt);
      }
      uniforms.uSway.value = reduced ? 0 : 1;
      renderer.render(scene, camera);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
