// jscs:disable
/* eslint-disable */
import THREE from 'three';

var VehicleShader = {

  uniforms: {

    "reference":        { type: "v2", value: null },
    "texturePosition":  { type: "t",  value: null },
    "texture":          { type: "t",  value: null },
    "color":            { type: "c",  value: new THREE.Color(0xff2200) }

  },

  vertexShader: [

    "uniform vec2 reference;",

    "uniform sampler2D texturePosition;",

    "varying vec2 vUv;",

    "mat4 rotationMatrix(vec3 axis, float angle)",
    "{",
    "    axis = normalize(axis);",
    "    float s = sin(angle);",
    "    float c = cos(angle);",
    "    float oc = 1.0 - c;",
    "    ",
    "    return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,",
    "                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,",
    "                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,",
    "                0.0,                                0.0,                                0.0,                                1.0);",
    "}",

    "void main() {",

    " vUv = uv;",

    " // retrieve the simulated position of this vehicle",
    " vec4 selfPosition = texture2D( texturePosition, reference );",
    "	vec3 simPos = selfPosition.xyz;",
    " float angle = selfPosition.w;",

    " // tmp",
    " vec4 newPosition = vec4( position, 1.0 );",

    " // rotate",
    " mat4 rotYMatrix = rotationMatrix( vec3( 0., 1., 0. ), angle );",
    " newPosition = rotYMatrix * newPosition;",

    " // calcuate the actual position by adding the simulated position",
    "	newPosition = modelMatrix * newPosition;",
    " newPosition.xyz += simPos;",

    "	gl_Position = projectionMatrix * viewMatrix * newPosition;",

    "}"


  ].join('\n'),

  fragmentShader: [

    "uniform sampler2D texture;",
    "uniform vec3 color;",

    "varying vec2 vUv;",

    "void main() {",

    " gl_FragColor = texture2D( texture, vUv );",
    "// gl_FragColor = vec4( color, 1. );",

    "}"

  ].join('\n')

};

export default VehicleShader;
