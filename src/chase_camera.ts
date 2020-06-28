export class ChaseCamera extends THREE.PerspectiveCamera {

	private object: THREE.Object3D;
	private cameraHeight: number = 10;
	private minCameraDistance: number = 10;
	private maxCameraDistance: number = 15;
	enabled: boolean = false;

	public constructor(fov: number, aspect: number, near: number, far: number, initialPosition: THREE.Vector3) {
		super(fov, aspect, near, far);
		this.position.copy(initialPosition);
	}

	public setChaseObject(o: THREE.Object3D, cameraHeight: number, minDistance: number, maxDistance: number) {
		this.object = o;
		this.cameraHeight = cameraHeight;
		this.minCameraDistance = minDistance;
		this.maxCameraDistance = maxDistance;
	}

	public update(delta: number): void {
		if (this.object && this.enabled) {
			const cameraPosition = this.position;
			const targetPosition = this.object.position;
			this.lookAt(targetPosition);

			// interpolate the camera height
			const y = (15.0 * cameraPosition.y + targetPosition.y + this.cameraHeight) / 16.0;
			cameraPosition.setY(y);

			const vCameraToObject = targetPosition.clone().sub(cameraPosition);
			const cameraDistance = vCameraToObject.length();

			//keep distance between min and max distance
			const limitDistance =
				cameraDistance < this.minCameraDistance? this.minCameraDistance :
				cameraDistance > this.maxCameraDistance? this.maxCameraDistance :
				cameraDistance;

			const correctionFactor = 0.15 * (limitDistance - cameraDistance) / cameraDistance;
			vCameraToObject.multiplyScalar(correctionFactor);

			cameraPosition.sub(vCameraToObject);
			this.position.copy(cameraPosition);
		}
	}

}