// jscs:disable
/* eslint-disable */

var VehiclePositionShader = {

  uniforms: {

    "time":             {type: "f", value: 0.0},
    "delta":            {type: "f", value: 0.0},
    // "textureTargetPosition":  {type: "t", value: null}, // (for interpolation)
    // "t":                {type: "f", value: 0.0}, // (for interpolation)

  },

  vertexShader: [

  ].join('\n'),

  fragmentShader: [

    "uniform float time;",
    "uniform float delta;",
    "uniform sampler2D textureTargetPosition;",
    "uniform float t;",

    "const float PI = 3.141592653589793;",
    "const float L = 2.0;",
    "const float T = 1.0;",

    "void main() {",

    " vec2 uv = gl_FragCoord.xy / resolution.xy;",

    // (for extrapolation)
    " vec4 selfPosition = texture2D( texturePosition, uv );",
    " vec4 selfVelocity = texture2D( textureVelocity, uv );",

    " vec3 position = selfPosition.xyz;",
    " float velocity = selfVelocity.x;",
    " float angle = selfPosition.w;",
    " float wheel = selfVelocity.w;",

    " float angular_velocity = wheel / L * velocity;",
    " angle += delta * angular_velocity;",
    " if( angle >  PI ) { angle -= 2.0 * PI; }",
    " if( angle < -PI ) { angle += 2.0 * PI; }",

    " position.x += delta * velocity * cos( angle );",
    " position.z += delta * velocity * sin( angle );",

    " gl_FragColor = vec4( position, angle );",

    // (for interpolation)
    // " vec4 selfPosition = texture2D( texturePosition, uv );",
    // " vec4 selfTargetPosition = texture2D( textureTargetPosition, uv );",
    //
    // " selfPosition.x = mix( selfPosition.x, selfTargetPosition.x, t / T );",
    // " selfPosition.y = mix( selfPosition.y, selfTargetPosition.y, t / T );",
    // " selfPosition.z = mix( selfPosition.z, selfTargetPosition.z, t / T );",
    // " selfPosition.w = mix( selfPosition.w, selfTargetPosition.w, t / T );",
    //
    // " gl_FragColor = selfPosition;",

    // " vec4 selfPosition = texture2D( texturePosition, uv );",
    // " vec4 selfVelocity = texture2D( textureVelocity, uv );",
    //
    // " vec3 position = selfPosition.xyz;",
    // " vec3 velocity = selfVelocity.xyz;",
    // " float angle = selfPosition.w;",
    // " float wheel = selfVelocity.w;",
    //
    // " // calculate the angular velocity",
    // " float angular_velocity = wheel / L * length( velocity );",
    //
    // " // update the position",
    // " position += delta * velocity;",
    // " angle += delta * angular_velocity;",
    // " if ( angle >  PI ) { angle -= 2.*PI; }",
    // " if ( angle < -PI ) { angle += 2.*PI; }",
    //
    // " gl_FragColor = vec4( position, angle );",

    "}"

  ].join('\n')

};

export default VehiclePositionShader;
