// London
// var coords = [51.505, -0.09];
// Nitech
var coords = [35.156324, 136.923108];

var world = VIZI.world('world', {
  skybox: true,
  postProcessing: false
}).setView(coords);

// Set position of sun in sky
// world._environment._skybox.setInclination(0.3);
world._environment._skybox.setInclination(0.1);

// obtain camera
var camera = world.getCamera();
camera.position.set(-150, 75, 125);

// Add controls
VIZI.Controls.orbit().addTo(world);

// CartoDB basemap
VIZI.imageTileLayer('http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
}).addTo(world);

// Roads from Mapzen (linestrings)
// var topoJSONRoadLayer = VIZI.topoJSONTileLayer('https://vector.mapzen.com/osm/roads/{z}/{x}/{y}.topojson?api_key=vector-tiles-NT5Emiw', {
//   interactive: false,
//   style: function(feature) {
//     var width, color;
//
//     if (feature.properties.highway) {
//       if (feature.properties.highway == 'major' || feature.properties.highway == 'primary') {
//         width = 10;
//       } else if (feature.properties.highway == 'secondary') {
//         width = 7;
//       } else if (feature.properties.highway == 'residental' || feature.properties.highway == 'tertiary') {
//         width = 5;
//       } else if (feature.properties.highway == 'living_street') {
//         width = 3;
//       } else if (feature.properties.highway == 'track' || feature.properties.highway == 'trunk') {
//         width = 3;
//       } else if (feature.properties.highway == 'footway') {
//         width = 2;
//       } else {
//         // console.log(feature.properties.highway);
//         width = 1;
//       }
//     } else {
//       width = 1;
//     }
//
//     if (feature.properties.kind) {
//       if (feature.properties.kind == 'major_road') {
//         color = '#f7c616';
//       } else if (feature.properties.kind == 'minor_road') {
//         color = '#888785';
//       } else {
//         color = '#000000';
//       }
//     }
//
//     return {
//       height: 1,
//       lineColor: color,
//       lineWidth: width,
//       // lineTransparent: true,
//       lineOpacity: 0.2,
//       // lineBlending: THREE.AdditiveBlending,
//       lineBlending: THREE.NormalBlending,
//       lineRenderOrder: 2
//     };
//   },
//   filter: function(feature) {
//     // Don't show points
//     return feature.geometry.type !== 'Point';
//   },
//   attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://whosonfirst.mapzen.com#License">Who\'s On First</a>.'
// }).addTo(world);

// Buildings from Mapzen (polygons)
// var topoJSONBuildingLayer = VIZI.topoJSONTileLayer('https://vector.mapzen.com/osm/buildings/{z}/{x}/{y}.topojson?api_key=vector-tiles-NT5Emiw', {
//   interactive: false,
//   style: function(feature) {
//     var height;
//
//     if (feature.properties.height) {
//       height = feature.properties.height;
//     } else {
//       height = 10 + Math.random() * 10;
//     }
//
//     return {
//       height: height,
//       lineColor: '#f7c616',
//       lineWidth: 1,
//       lineTransparent: true,
//       lineOpacity: 0.2,
//       lineBlending: THREE.AdditiveBlending,
//       lineRenderOrder: 2
//     };
//   },
//   filter: function(feature) {
//     // Don't show points
//     return feature.geometry.type !== 'Point';
//   },
//   attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://whosonfirst.mapzen.com#License">Who\'s On First</a>.'
// }).addTo(world);

// car layer
var vehicleLayer = VIZI.vehicleLayer({
  'veyron': {
    file: {
      body: './obj/veyron/parts/veyron_body_bin.js',
      wheel: './obj/veyron/parts/veyron_wheel_bin.js'
    },
    textureFile: './obj/veyron/texture.png',
    scale: 0.025,
    translation: {x: 0, y: 0, z: 0},
    rotation: {x: 0, y: 90*Math.PI/180, z: 0}
  }
}, {
  simWidth: 32,
  style: {
    height: 0
  }
}).addTo(world);

// add cars
var veyrons = [];
for (var i = 0; i < 100; i++) {
  veyrons.push(
    // vehicleLayer.addVehicle((i%2==0) ? 'bus' : 'veyron', new VIZI.LatLon(35.157236 + (0.0003*~~(i/10)), 136.924981 + 0.0003*(i%10)), 0.0)
    vehicleLayer.addVehicle('veyron', new VIZI.LatLon(35.157236 + (0.0003*~~(i/10)), 136.924981 + 0.0003*(i%10)), 0.0)
  );
}

// sets the vehicles to move
vehicleLayer.on('loadCompleted', function() {
  var vehicles = vehicleLayer._simObjects;
  var velocities = {};
  for (var i = 0; i < vehicles.length; i++) {
    velocities[i] = {vx: 30.0, vy: 0.0, vz: 0.0, wheel: 0.1};
  }
  vehicleLayer._setSimVelocities(velocities);
});

// move cars
// var t = 0;
// world.on('preUpdate', function(delta) {
//   t += delta;
//   for (var i = 0; i < veyrons.length; i++) {
//     veyrons[i].setLocation(veyrons[i].latlon.lat + 0.00002*Math.sin(t), veyrons[i].latlon.lon + 0.00002*Math.cos(t));
//     veyrons[i].setRotation(0, t, 0);
//   }
// });

// test
// L = 2.0;
// PI_05 = Math.PI / 2.0;
// position = {x: 0.0, y: 100.0, z: 0.0, angle: 0.0};
// velocity = {vx: 1.0, vy: 0.0, vz: 0.0, wheel: 30.*(Math.PI/180.)};
// world.on('preUpdate', function(delta) {
//
//   var veyron = veyrons[0];
//
//   var velocityScalar = Math.sqrt(velocity.vx * velocity.vx + velocity.vy * velocity.vy + velocity.vz * velocity.vz);
//   var velocityNorm = {x: velocity.vx / velocityScalar, y: velocity.vy / velocityScalar, z: velocity.vz / velocityScalar};
//   var a = velocity.wheel * velocityScalar * velocityScalar / L;
//   var centripetalAcceleration = {ax: - a * velocityNorm.z, ay: 0.0, az: a * velocityNorm.x };
//   console.log(centripetalAcceleration);
//
//   velocity.vx += delta * centripetalAcceleration.ax;
//   velocity.vy += delta * centripetalAcceleration.ay;
//   velocity.vz += delta * centripetalAcceleration.az;
//   console.log(velocity);
//
//   position.x += delta * velocity.vx;
//   position.y += delta * velocity.vy;
//   position.z += delta * velocity.vz;
//   console.log(position);
//
//   var angular_velocity = velocity.wheel * velocityScalar / L;
//   position.angle += delta * angular_velocity;
//   while (position.angle >  Math.PI) position.angle -= 2*Math.PI;
//   while (position.angle < -Math.PI) position.angle += 2*Math.PI;
//
//   veyron.setPosition(position.x*10., position.y*10., position.z*10., position.angle);
//   vehicleLayer._debug();
//
// });

// pedestrian layer
var pedestrianLayer = VIZI.pedestrianLayer({
  'monkey': {
    file: {
      body: './json/monkey/monkey.json',
    },
    scale: 1.0,
    translation: {x: 0, y: 0, z: 0},
    rotation: {x: 0, y: 0, z: 0}
  }
}, {
  simWidth: 32,
  style: {
    height: 0
  }
}).addTo(world);

// add pedestrians
var monkeys = [];
for (var i = 0; i < 2; i++) {
  monkeys.push(
    pedestrianLayer.addPedestrian('monkey', new VIZI.LatLon(35.157236 + (0.0003*~~(i/10)), 136.924981 + 0.0003*(i%10)), 0.0)
  );
}

// London Underground lines
// VIZI.geoJSONLayer('https://rawgit.com/robhawkes/4acb9d6a6a5f00a377e2/raw/30ae704a44e10f2e13fb7e956e80c3b22e8e7e81/tfl_lines.json', {
//   output: true,
//   interactive: true,
//   style: function(feature) {
//     var colour = feature.properties.lines[0].colour || '#ffffff';
//
//     return {
//       lineColor: colour,
//       lineHeight: 20,
//       lineWidth: 3,
//       lineTransparent: true,
//       lineOpacity: 0.5,
//       lineBlending: THREE.AdditiveBlending,
//       lineRenderOrder: 2
//     };
//   },
//   onEachFeature: function(feature, layer) {
//     layer.on('click', function(layer, point2d, point3d, intersects) {
//       console.log(layer, point2d, point3d, intersects);
//     });
//   },
//   attribution: '&copy; Transport for London.'
// }).addTo(world);
