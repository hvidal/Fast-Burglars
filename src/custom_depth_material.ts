const depthVertexShader = `
	varying vec2 vUV;
	void main() {
		vUV = 0.75 * uv;
		vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
		gl_Position = projectionMatrix * mvPosition;
	}
`;

const depthFragmentShader = `
	#include <packing>
	uniform sampler2D texture;
	varying vec2 vUV;
	void main() {
		vec4 pixel = texture2D(texture, vUV);
		if (pixel.a < 0.5) discard;
		gl_FragData[0] = packDepthToRGBA(gl_FragCoord.z);
	}
`;

export class CustomDepthMaterial {

	public static create(map: THREE.Texture): THREE.ShaderMaterial {
		return new THREE.ShaderMaterial({
			uniforms: {texture:{value: map}},
			vertexShader: depthVertexShader,
			fragmentShader: depthFragmentShader,
			side: THREE.DoubleSide
		});
	}
}