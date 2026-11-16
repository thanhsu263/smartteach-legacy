# Hero models

`classroom.glb` comes from the user-supplied `classroom.zip` (15 November 2026), replacing the earlier classroom model. The ZIP contains `source/classroom.fbx` and PBR textures. The original ZIP is unchanged.

The conversion removes the `light_rays`, `dust`, and `glow` meshes. The React Bits SideRays fragment shader is rendered separately, between the classroom and floating objects. The original room geometry is retained: 72,158 triangles, with texture dimensions capped at 1024 px. The final GLB is 893,264 bytes.

The structural `walls` material uses a soft gray base instead of its original color atlas. The previous gray-white (`#E1E4E9`) is multiplied by 0.49 in linear color space after two successive 30% reductions (approximately `#A4A6A9` in sRGB). Its normal, ambient occlusion and roughness maps are retained to preserve relief and shading. The tables, doors, posters and other detail materials retain their original colors.

Upward-facing structural surfaces below 0.6 m (the floor and raised platform, 66 triangles) use a separate `floor` material at 0.64 times the wall color after two successive 20% reductions in linear color. Wall panels and moldings keep their previous color. No geometry is removed or simplified.

The hero adds a 10%-opacity white overlay above the rendered scenery and below the title, quiz deck and controls. The poster is captured without this overlay so fallback mode applies it only once.

To rebuild, extract the supplied ZIP to `hero/classroom-source/`, run `node artifacts/convert-classroom.mjs`, then:

```powershell
npm exec --yes --package=@gltf-transform/cli -- gltf-transform optimize 'hero/classroom-source/classroom-clean.glb' 'public/hero/models/classroom.glb' --texture-size 1024 --texture-compress webp --compress meshopt --simplify false --instance true --join true
```

The extracted source and intermediate GLB are temporary and are not required at runtime.

`eraser.glb` is an unchanged copy of `hero/Eraser by Poly by Google - dexMJlf51a8.glb`. Its hero display scale is 0.38, half the previous 0.76; it is positioned above the heading's `khởi.` span. The room and eraser are loaded dynamically through `hero-classroom-assets.ts`. Floating objects react to mouse hover, without dragging or pointer capture; the existing quiz deck retains its own controls.
