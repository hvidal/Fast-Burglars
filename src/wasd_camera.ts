export class WASDCamera extends THREE.PerspectiveCamera {

	private pitchObject: THREE.Object3D;
	private yawObject: THREE.Object3D;

	private moveForward = false;
	private moveBackward = false;
	private moveLeft = false;
	private moveRight = false;

	enabled: boolean = false;
	private velocity = new THREE.Vector3(1,1,1);

	private static PI_2 = Math.PI / 2;

	public constructor(fov: number, aspect: number, near: number, far: number) {
		super(fov, aspect, near, far);
		this.rotation.set(0, 0, 0);
		this.pitchObject = new THREE.Object3D();
		this.pitchObject.add(this);

		this.yawObject = new THREE.Object3D();
		this.yawObject.position.y = 10;
		this.yawObject.add(this.pitchObject);

		this.initEventListeners();
	}

	public getObject() {
		return this.yawObject;
	}

	public setPitchRotationX(x: number): void {
		this.pitchObject.rotation.x = x;
	}

	private initEventListeners(): void {
		document.addEventListener('mousemove', (event) => this.onMouseMove(event), false);
		document.addEventListener('keydown', (event) => this.setMove(event.keyCode, true), false);
		document.addEventListener('keyup', (event) => this.setMove(event.keyCode, false), false);
	}

	private onMouseMove(event: any) {
		if (this.enabled === false) return;

		const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
		const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

		const factor = 0.002;
		this.yawObject.rotation.y -= movementX * factor;
		this.pitchObject.rotation.x -= movementY * factor;
		this.pitchObject.rotation.x = Math.max(-WASDCamera.PI_2, Math.min(WASDCamera.PI_2, this.pitchObject.rotation.x));
	};

	private setMove(keyCode:number, value: boolean): void {
		if (this.enabled === false) return;
		switch (keyCode) {
			case 87: // w
				this.moveForward = value;
				break;
			case 65: // a
				this.moveLeft = value;
				break;
			case 83: // s
				this.moveBackward = value;
				break;
			case 68: // d
				this.moveRight = value;
				break;
		}
	}

	public update(delta: number): void {
		if (this.enabled === false) return;

		const factor = 10.0 * delta;
		this.velocity.x -= this.velocity.x * factor;
		this.velocity.y -= this.velocity.y * factor;
		this.velocity.z -= this.velocity.z * factor;

		const step = 400.0 * delta;
		if (this.moveForward) this.velocity.z -= step;
		if (this.moveBackward) this.velocity.z += step;
		if (this.moveLeft) this.velocity.x -= step;
		if (this.moveRight) this.velocity.x += step;

		this.yawObject.translateX(this.velocity.x * delta);
		this.yawObject.translateZ(this.velocity.z * delta);
	}

	public lockPointer(callback?: (b: boolean) => void): void {
		var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;
		if (havePointerLock) {
			const _body: any = document.body;
			const _doc: any = document;
			_body.requestPointerLock = _body.requestPointerLock || _body.mozRequestPointerLock || _body.webkitRequestPointerLock;
			const pointerlockchange = (event: Event) => {
				this.enabled = _doc.pointerLockElement === _body || _doc.mozPointerLockElement === _body || _doc.webkitPointerLockElement === _body;
				callback && callback(this.enabled);
			};
			document.addEventListener('pointerlockchange', pointerlockchange, false);
			document.addEventListener('mozpointerlockchange', pointerlockchange, false);
			document.addEventListener('webkitpointerlockchange', pointerlockchange, false);

			if (/Firefox/i.test(navigator.userAgent)) {
				var fullscreenchange = (event: Event) => {
					if (_doc.fullscreenElement === _body || _doc.mozFullscreenElement === _body || _doc.mozFullScreenElement === _body) {
						_doc.removeEventListener('fullscreenchange', fullscreenchange);
						_doc.removeEventListener('mozfullscreenchange', fullscreenchange);
						_body.requestPointerLock();
						this.enabled = true;
					} else
						this.enabled = false;
				};
				_doc.addEventListener('fullscreenchange', fullscreenchange, false);
				_doc.addEventListener('mozfullscreenchange', fullscreenchange, false);
				_body.requestFullscreen = _body.requestFullscreen || _body.mozRequestFullscreen || _body.mozRequestFullScreen || _body.webkitRequestFullscreen;
				_body.requestFullscreen();
			} else {
				_body.requestPointerLock();
			}
		}
	}
}