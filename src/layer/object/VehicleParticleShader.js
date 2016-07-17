// jscs:disable
/* eslint-disable */
import THREE from 'three';

var VehicleParticleShader = {

  uniforms: {

    "texturePosition":  { type: "t",  value: null },
    "textureVelocity":  { type: "t",  value: null },
    "color":            { type: "c",  value: new THREE.Color(0x0000ff) }

  },

  vertexShader: [

    "attribute vec2 reference;",

    "uniform sampler2D texturePosition;",
    "uniform sampler2D textureVelocity;",

    "void main() {",

    " // retrieve the simulated position of this vehicle",
    " vec4 selfPosition = texture2D( texturePosition, reference );",
    "	vec3 simPos = selfPosition.xyz;",
    " float angle = selfPosition.w;",

    " // tmp",
    " vec4 newPosition = vec4( position, 1.0 );",

    " // calcuate the actual position by adding the simulated position",
    "	newPosition = modelMatrix * newPosition;",
    " newPosition.xyz += simPos;",

    "	gl_Position = projectionMatrix * viewMatrix * newPosition;",
    " gl_PointSize = 10.0;",

    "}"


  ].join('\n'),

  fragmentShader: [

    "uniform vec3 color;",

    "void main() {",

    " gl_FragColor = vec4( color, 1. );",

    "}"

  ].join('\n')

};

export default VehicleParticleShader;
