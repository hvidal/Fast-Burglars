declare module THREEx {
	export class RendererStats {
		domElement: HTMLElement;
		update(r: THREE.WebGLRenderer): void;
	}
}