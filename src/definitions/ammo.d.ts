
declare namespace Ammo {

	export class btDefaultCollisionConfiguration {}

	export class btCollisionDispatcher {
		constructor(c: btDefaultCollisionConfiguration);
	}

	export class btVector3 {
		x(): number;
		y(): number;
		z(): number;
		constructor(x: number, y: number, z: number);
		public op_add(v: btVector3): btVector3;
	}

	export class btAxisSweep3 {
		constructor(min: btVector3, max: btVector3);
	}

	export class btSequentialImpulseConstraintSolver {}

	export class btDynamicsWorld {
		public setGravity(v: btVector3): void;
		public addAction(v: btActionInterface): void;
		public stepSimulation(timeStep: number, maxSubSteps: number, fixedTimeStep?: number): number;
	}

	export class btDiscreteDynamicsWorld extends btDynamicsWorld {
		constructor(a: btCollisionDispatcher, b: btAxisSweep3, c: btSequentialImpulseConstraintSolver, d: btDefaultCollisionConfiguration);
		addRigidBody(b: btRigidBody): void;
		removeRigidBody(b: btRigidBody): void;
	}

	export class btCollisionShape {
		public calculateLocalInertia(mass: number, inertia: btVector3): void;
		public setMargin(m: number): void;
	}

	export class btConvexShape extends btCollisionShape {
	}

	export class btCompoundShape extends btCollisionShape {
		public addChildShape(t: btTransform, s: btCollisionShape): void;
	}

	export class btBoxShape extends btConvexShape {
		constructor(v: btVector3);
	}

	export class btSphereShape extends btConvexShape {
		constructor(radius: number);
	}

	export class btCollisionObject {
		public setActivationState(s: number): void;
	}

	export class btRigidBody extends btCollisionObject {
		constructor(info: btRigidBodyConstructionInfo);
		public getMotionState(): btMotionState;
		public setWorldTransform(t: btTransform): void;
		public setLinearVelocity(v: btVector3): void;
		public setAngularVelocity(v: btVector3): void;
		public setFriction(n: number): void;
		public getLinearVelocity(): btVector3;
		public getAngularVelocity(): btVector3;
		public getCenterOfMassTransform(): btTransform;
	}

	export class btMotionState {
		public setWorldTransform(t: btTransform): void;
	}

	export class btQuaternion {
		x(): number;
		y(): number;
		z(): number;
		w(): number;
		constructor(x: number, y: number, z: number, w: number);
	}

	export class btTransform {
		public setIdentity(): void;
		public setOrigin(v: btVector3): void;
		public getOrigin(): btVector3;
		public setRotation(q: btQuaternion): void;
		public getRotation(): btQuaternion;
	}

	export class btRigidBodyConstructionInfo {
		constructor(mass: number, motionState: btDefaultMotionState, shape: btConvexShape, inertia: btVector3);
	}

	export interface btActionInterface {}

	export class btDefaultMotionState {
		constructor(t: btTransform);
	}

	export class btVehicleTuning {}

	export class btDefaultVehicleRaycaster {
		constructor(world: btDiscreteDynamicsWorld);
	}

	export class btRaycastVehicle implements btActionInterface {
		constructor(tuning: btVehicleTuning, body: btRigidBody, raycaster: btDefaultVehicleRaycaster);
		getRigidBody(): btRigidBody;
		setCoordinateSystem(right: number, up: number, forward: number): void;
		addWheel(connectionPointCS0: btVector3, wheelDirectionCS0: btVector3, wheelAxleCS: btVector3, suspensionRestLength: number, wheelRadius: number, tuning: btVehicleTuning, isFrontWheel: boolean): btWheelInfo;
		applyEngineForce(force: number, wheel: number): void;
		setSteeringValue(steering: number, wheel: number): void;
		setBrake(force: number, wheel: number): void;
		getWheelTransformWS(wheel: number): btTransform;
		getCurrentSpeedKmHour(): number;
		getRigidBody(): btRigidBody;
	}

	export class btWheelInfo {
		set_m_suspensionStiffness(v: number): void;
		set_m_wheelsDampingRelaxation(v: number): void;
		set_m_wheelsDampingCompression(v: number): void;
		set_m_frictionSlip(v: number): void;
		set_m_rollInfluence(v: number): void;
	}
}