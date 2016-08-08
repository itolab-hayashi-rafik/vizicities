// jscs:disable
/* eslint-disable */

/* To be used by GPUComputationRenderer */
var VehicleVelocityShader = {

  uniforms: {

    "time":                 {type: "f", value: 0.0},
    "delta":                {type: "f", value: 0.0},
    "textureAcceleration":  {type: "t", value: null}

  },

  vertexShader: [

  ].join('\n'),

  fragmentShader: [

    "uniform float time;",
    "uniform float delta; // about 0.016",
    "uniform sampler2D textureAcceleration;",

    "const float PI = 3.141592653589793;",
    "const float PI_05 = PI / 2.0;",
    "const float PI_2 = PI * 2.0;",

    "const float L = 2.0;",

    "const float SPEED_LIMIT = 10.0;",

    "void main() {",

    " vec2 uv = gl_FragCoord.xy / resolution.xy;",

    " vec4 selfVelocity = texture2D( textureVelocity, uv );",
    " vec4 selfAcceleration = texture2D( textureAcceleration, uv );",
    " float velocity = selfVelocity.x;",
    " float wheel = selfVelocity.w;",
    " float acceleration = selfAcceleration.x;",

    " // update velocity",
    " velocity += acceleration;",

    " gl_FragColor = vec4(velocity, 0.0, 0.0, wheel);",

    // " vec4 selfVelocity = texture2D( textureVelocity, uv );",
    // " vec3 velocity = selfVelocity.xyz;",
    // " float velocityScalar = length( velocity );",
    // " float wheel = selfVelocity.w;",
    //
    // " vec3 selfAcceleration = texture2D( textureAcceleration, uv ).xyz;",
    //
    // " // update the velocity in accordance with the centripetal force",
    // " float a = wheel / L * velocityScalar * velocityScalar;",
    // " vec3 centripetalAcceleration = vec3( - a / velocityScalar * velocity.z, 0.0, a / velocityScalar * velocity.x );",
    // " velocity += delta * centripetalAcceleration;",
    // " velocity *= velocityScalar / length( velocity );",
    //
    // " // update velocity",
    // " velocity += delta * selfAcceleration;",
    //
    // "	float limit = SPEED_LIMIT;",
    //
    // "	// Speed Limits",
    // "	//if ( length( velocity ) > limit ) {",
    // "	//	velocity = normalize( velocity ) * limit;",
    // "	//}",
    //
    // "	gl_FragColor = vec4( velocity, wheel );",

    "}"

  ].join('\n')

};

export default VehicleVelocityShader;
