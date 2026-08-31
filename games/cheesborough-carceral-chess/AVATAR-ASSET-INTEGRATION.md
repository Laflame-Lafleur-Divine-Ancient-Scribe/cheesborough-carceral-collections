# Avatar Scene Integration

The AI-selection interface uses local illustrated identity markers and places the selected AI identities as seated 3D characters at opposite sides of the live Three.js chess table.

## Planned asset path

The current local source assets use animated FBX models from the user-supplied *Animated Men Characters* package for men. The existing static OBJ models from Quaternius's *Posed Background Characters* pack remain as the womenâ€™s fallback until a matching womenâ€™s package is supplied:

- `Male/Male Poses/OBJ/Male_Sitting.obj`
- `Female/Female Poses/OBJ/Female_Sitting.obj`
- `../../FBX/Smooth_Male_Casual.fbx`
- `../../FBX/Smooth_Male_LongSleeve.fbx`
- `../../FBX/Smooth_Male_Shirt.fbx`
- `../../FBX/Smooth_Male_Suit.fbx`

`main.js` selects the appropriate installed source model from an AI identity's roster grouping and places it on the white or black side of the actual table. The animated menâ€™s model uses its embedded Sitting clip as a fixed seated pose, preserving face, eyes, hair, and actual clothing geometry. Player 1 vs AI loads one seated opponent; AI vs AI loads both seated identities; Player 1 vs Player 2 keeps the original no-avatar human-v-human scene.

The models are intentionally not added to the raycast target list, so chess-piece selection and board input remain unchanged.

## Scene assets requested for later integration

- Poly Haven, *Abandoned Hall 01* HDRI: CC0. Confirm the downloaded asset and retain its source record before adding it as the environment map.
- Yiğit Uslu, *Prison Cell*, Sketchfab: CC BY. Confirm the selected download's license and include the creator, model title, source URL, and license in `THIRD-PARTY-NOTICES.md` before bundling it.

Do not add remote runtime asset dependencies. Optimize models and textures for web delivery before committing them.
