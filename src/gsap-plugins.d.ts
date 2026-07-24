// GSAP 3.15 ships every plugin's runtime at `gsap/<Name>.js` (PascalCase), but the
// bundled type files are kebab-case (`split-text.d.ts`, `scroll-trigger.d.ts`, …),
// so the documented `import { X } from 'gsap/X'` subpath does not resolve to types.
// These ambient shims let that import form compile. The plugin classes are still
// available as globals via gsap's own `types/index.d.ts` triple-slash references.
declare module 'gsap/ScrollTrigger'
declare module 'gsap/SplitText'
declare module 'gsap/Draggable'
declare module 'gsap/InertiaPlugin'
