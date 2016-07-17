// TODO: Move duplicated logic between geometry layrs into GeometryLayer

// TODO: Look at ways to drop unneeded references to array buffers, etc to
// reduce memory footprint

// TODO: Support dynamic updating / hiding / animation of geometry
//
// This could be pretty hard as it's all packed away within BufferGeometry and
// may even be merged by another layer (eg. GeoJSONLayer)
//
// How much control should this layer support? Perhaps a different or custom
// layer would be better suited for animation, for example.

// TODO: Allow _setBufferAttributes to use a custom function passed in to
// generate a custom mesh

import Layer from '../Layer';
import extend from 'lodash.assign';
import THREE from 'three';
import {latLon as LatLon} from '../../geo/LatLon';
import {point as Point} from '../../geo/Point';
import earcut from 'earcut';
import extrudePolygon from '../../util/extrudePolygon';
import Buffer from '../../util/Buffer';
import GPUComputationRenderer from '../../vendor/GPUComputationRenderer';
import VehicleModel from './VehicleModel';
import modelRepository from './ModelRepository';
import Vehicle from './Vehicle';
import BinaryLoader from '../../vendor/BinaryLoader';
import VehicleVelocityShader from './VehicleVelocityShader';
import VehiclePositionShader from './VehiclePositionShader';
import VehicleShader from './VehicleShader';
import ObjectUtils from '../../util/ObjectUtils';

class VehicleLayer extends Layer {
  constructor(models, options) {
    var modelDefaults = {
      file: null,
      scale: 1,
      translation: {x: 0, y: 0, z: 0},
      rotation: {rx: 0, ry: 0, rz: 0}
    };
    for (key in models) {
      models[key] = extend({}, modelDefaults, models[key]);
    }

    var defaults = {
      output: true,
      // simulation:
      simWidth: 2,
      // This default style is separate to Util.GeoJSON.defaultStyle
      style: {
        color: '#ffffff',
        transparent: false,
        opacity: 1,
        blending: THREE.NormalBlending,
        height: 0
      }
    };

    var _options = extend({}, defaults, options);

    super(_options);

    this._modelsLoaded = false;
    this._models = extend({}, models);
    this._geometries = {};
    this._textures = {};
    this._vehicles = [];
    this._gpuCompute = null;
  }

  _onAdd(world) {
    var self = this;

    if (this.isOutput()) {
      // initialize GPUComputeRenderer
      this._initComputeRenderer();

      // add callback
      this.on('loadCompleted', this._onLoadCompleted);

      // add car
      this._loadModels();

      // add listener
      world.on('preUpdate', function(delta) {
        self._onWorldUpdate(delta);
      });
    }
  }

  _loadModels() {
    var self = this;

    // load models iteratively
    var models = this._models;
    Object.keys(models).forEach(function(modelName) {
      var model = models[modelName];

      var scale = 1.0;
      var translation = new THREE.Vector3();
      var rotation = new THREE.Vector3();
      var wheelOffset = null;

      if (model.scale) {
        scale = model.scale;
      }
      if (model.translation) {
        translation.set(model.translation.x, model.translation.y, model.translation.z);
      }
      if (model.rotation) {
        rotation.set(model.rotation.x, model.rotation.y, model.rotation.z);
      }
      if (model.wheelOffset) {
        wheelOffset = new THREE.Vector3(model.wheelOffset.x, model.wheelOffset.y, model.wheelOffset.z);
      }

      // create a model
      var vehicleModel = new VehicleModel({
        bodyURL: model.file.body,
        wheelURL: model.file.wheel,
        scale: scale,
        translation: translation,
        rotation: rotation,
        wheelOffset: wheelOffset
      }, callback);

      // register to the repos
      modelRepository.add(modelName, vehicleModel);
    });

    // callback
    var counter = 0;
    var len = Object.keys(models).length;
    function callback(scope) {
      if (++counter >= len) {
        // loaded all models
        self.emit('loadCompleted');
      }
    }
  }

  _onLoadCompleted() {
    this._modelsLoaded = true;

    // iterate over all the vehicles already added and add meshes to the world
    for (var i = 0; i < this._vehicles.length; i++) {
      var vehicle = this._vehicles[i];
      if (vehicle.vehicle === null) {
        this._addVehicleInternal(vehicle);
      }
    }
  }

  _onWorldUpdate(delta) {
    if (this._gpuCompute) {
      this._performUpdate(delta);
    }
  }

  addVehicle(modelName, latlon, angle, options) {
    if (!modelRepository.contains(modelName)) {
      throw new Error('Vehicle model ' + modelName + ' does not exist.');
    }

    var self = this;

    var vehicle = {
      vid: undefined,
      modelName: modelName,
      model: null,
      latlon: latlon,
      angle: angle,
      options: options,
      vehicle: null,
      setLocation: function(lat, lon, angle) {
        self.setLocation(this.vid, lat, lon, angle);
      },
      setPosition: function(x, y, z, angle) {
        self.setPosition(this.vid, x, y, z, angle);
      }
    };
    var total = this._vehicles.push(vehicle);
    vehicle.vid = (total - 1);

    // add vehicle if the model is already loaded
    this._addVehicleInternal(vehicle);

    return vehicle;
  }

  _addVehicleInternal(vehicle) {
    if (this._modelsLoaded) {

      var vehicleModel = modelRepository.get(vehicle.modelName);
      var v = new Vehicle(vehicleModel);
      this.add(v.root);

      vehicle.vehicle = v;

      // var vid = vehicle.vid;
      //
      // var model = this._models[vehicle.modelName];
      // var geometry = this._geometries[vehicle.modelName];
      //
      // var material = new THREE.MeshLambertMaterial({ color: 0x995500, opacity: 1.0, transparent: false });
      // // var material = new THREE.ShaderMaterial({
      // //   uniforms: {
      // //     'reference':        { type: 'v2', value: null },
      // //     'texturePosition':  { type: 't',  value: null },
      // //     'texture':          { type: 't',  value: null },
      // //     'color':            { type: 'c',  value: new THREE.Color(0x995500) }
      // //   },
      // //   vertexShader: VehicleShader.vertexShader,
      // //   fragmentShader: VehicleShader.fragmentShader
      // // });
      // // material.uniforms.reference.value = new THREE.Vector2(x, y);
      //
      // var mesh = new THREE.Mesh(geometry, material);
      // mesh.scale.x = mesh.scale.y = mesh.scale.z = model.scale;
      // mesh.rotation.set(model.rotation.rx, model.rotation.ry, model.rotation.rz);
      // mesh.position.set(model.translation.x, model.translation.y, model.translation.z);
      //
      // this.add(mesh);
      // vehicle.model = model;
      // vehicle.mesh = mesh;
      // vehicle.setLocation(vehicle.latlon.lat, vehicle.latlon.lon, vehicle.angle);
    }
  }

  // initialize GPUComputationRenderer
  _initComputeRenderer() {
    var gpuCompute = new GPUComputationRenderer(this._options.simWidth, this._options.simWidth, this._world._engine._renderer);

    // create textures
    var textureAcceleration = gpuCompute.createTexture();
    var textureVelocity = gpuCompute.createTexture();
    var texturePosition = gpuCompute.createTexture();

    var velocityVariable = gpuCompute.addVariable('textureVelocity', VehicleVelocityShader, textureVelocity);
    var positionVariable = gpuCompute.addVariable('texturePosition', VehiclePositionShader, texturePosition);

    gpuCompute.setVariableDependencies(velocityVariable, [positionVariable, velocityVariable]);
    gpuCompute.setVariableDependencies(positionVariable, [positionVariable, velocityVariable]);

    var positionUniforms = positionVariable.material.uniforms;
    var velocityUniforms = velocityVariable.material.uniforms;

    velocityVariable.wrapS = THREE.RepeatWrapping;
    velocityVariable.wrapT = THREE.RepeatWrapping;
    positionVariable.wrapS = THREE.RepeatWrapping;
    positionVariable.wrapT = THREE.RepeatWrapping;

    velocityUniforms.textureAcceleration.value = textureAcceleration;

    var error = gpuCompute.init();
    if (error !== null) {
      console.error(error);
    }

    this._gpuCompute = gpuCompute;
    this._textureAcceleration = textureAcceleration;
    this._textureVelocity = textureVelocity;
    this._texturePosition = texturePosition;
    this._positionVariable = positionVariable;
    this._velocityVariable = velocityVariable;
    this._positionUniforms = positionUniforms;
    this._velocityUniforms = velocityUniforms;
  }

  // perform update
  _performUpdate(delta) {
    var now = performance.now();

    this._positionUniforms.time.value = now;
    this._positionUniforms.delta.value = delta;
    this._velocityUniforms.time.value = now;
    this._velocityUniforms.delta.value = delta;

    this._gpuCompute.compute();

    // transfer vehicles' parameters from gpu to cpu
    var texturePosition = this._gpuCompute.readVariable(this._positionVariable, this._texturePosition);
    for (var i = 0; i < this._vehicles.length; i++) {
      var vehicle = this._vehicles[i];
      if (vehicle.vehicle) {
        var x = texturePosition.image.data[i * 4 + 0];
        var y = texturePosition.image.data[i * 4 + 1];
        var z = texturePosition.image.data[i * 4 + 2];
        var angle = texturePosition.image.data[i * 4 + 3];
        vehicle.setPosition(x, y, z, angle);

        // TODO: transfer textureVelocity and update the rendering object
      }
    }

    // (for gpgpu rendering (no transfer to cpu))
    // for (var i = 0; i < this._vehicles.length; i++) {
    //   var vehicle = this._vehicles[i];
    //   if (vehicle.mesh) {
    //     vehicle.mesh.material.uniforms.texturePosition.value = this._gpuCompute.getCurrentRenderTarget(this._positionVariable).texture;
    //     if (vehicle.mesh.material.uniforms.texture) {
    //       vehicle.mesh.material.uniforms.texture.value = this._textures[vehicle.modelName];
    //     }
    //   }
    // }
  }

  /**
   * Set the location of a specific vehicle
   *
   * @param {number} vid vehicle id
   * @param {number} lat latitude
   * @param {number} lon longitude
   * @param {number} angle angle
   */
  setLocation(vid, lat, lon, angle) {
    this._setLocation(vid, lat, lon, angle);

    if (this._gpuCompute) {
      // console.log('this._setSimPosition(' + vid + ', ' + point.x + ', ' + 0 + ', ' + point.y + ', ' + angle + ')');
      this._setSimPosition(vid, point.x, 0, point.y, angle);
    }
  }

  // internal helper for setLocation()
  _setLocation(vid, lat, lon, angle) {
    // if the vehicle exists
    if (vid in this._vehicles) {
      var vehicle = this._vehicles[vid];

      // update latlon
      vehicle.latlon.lat = lat;
      vehicle.latlon.lon = lon;

      if (vehicle.vehicle) {
        // calculate the position
        var point = this._world.latLonToPoint(vehicle.latlon);

        // update the vehicle
        vehicle.vehicle.setPosition(point.x, 0.0, point.y);
        vehicle.vehicle.setAngle(angle);
      }
    }
  }

  /**
   * Set the position of a specific vehicle
   *
   * @param {number} vid vehicle id
   * @param {number} x x coordinate
   * @param {number} y y coordinate
   */
  setPosition(vid, x, y, z, angle) {
    this._setPosition(vid, x, y, z, angle);

    if (this._gpuCompute) {
      this._setPosition(vid, x, y, z, angle);
    }
  }

  // internal helper for setPosition()
  _setPosition(vid, x, y, z, angle) {
    // if the vehicle exists
    if (vid in this._vehicles) {
      var vehicle = this._vehicles[vid];

      if (vehicle.vehicle) {
        // update the vehicle
        vehicle.vehicle.setPosition(x, y, z);
        vehicle.vehicle.setAngle(-angle);
      }

      // calculate and update the location
      vehicle.latlon = this._world.pointToLatLon(new Point(x, z));
    }
  }

  // Returns true if the polygon is flat (has no height)
  isFlat() {
    return this._flat;
  }

  // Returns true if coordinates refer to a single geometry
  //
  // For example, not coordinates for a MultiPolygon GeoJSON feature
  static isSingle(coordinates) {
    return !Array.isArray(coordinates[0][0][0]);
  }

  destroy() {
    // Run common destruction logic from parent
    super.destroy();
  }

  _setSimLocation(vid, lat, lon, angle) {
    var point = self._world.latLonToPoint(new LatLon(lat, lon));
    var position = {x: position.x, y: 0.0, z: position.y, angle: angle};

    this._setPosition(position);
  }

  _setSimPosition(vid, x, y, z, angle) {
    // console.log('_setSimPosition: ' + vid + ', ' + x + ', ' + y + ', ' + z + ', ' + angle + ')');

    // transmit from gpu to cpu
    var texturePosition = this._gpuCompute.readVariable(this._positionVariable, this._texturePosition);

    // (for extrapolation) update data
    texturePosition.image.data[vid * 4 + 0] = x;
    texturePosition.image.data[vid * 4 + 1] = y;
    texturePosition.image.data[vid * 4 + 2] = z;
    texturePosition.image.data[vid * 4 + 3] = angle;
    texturePosition.needsUpdate = true;

    // transmit from cpu to gpu
    this._gpuCompute.updateVariable(this._positionVariable, texturePosition);
  }

  _setSimVelocity(vid, vx, vy, vz, wheel) {
    // transmit from gpu to cpu
    var textureVelocity = this._gpuCompute.readVariable(this._velocityVariable, this._textureVelocity);

    // update data
    textureVelocity.image.data[vid * 4 + 0] = vx;
    textureVelocity.image.data[vid * 4 + 1] = vy;
    textureVelocity.image.data[vid * 4 + 2] = vz;
    textureVelocity.image.data[vid * 4 + 3] = wheel;
    textureVelocity.needsUpdate = true;

    console.log(textureVelocity.image.data);

    // transmit from cpu to gpu
    this._gpuCompute.updateVariable(this._velocityVariable, textureVelocity);
  }

  _setSimAcceleration(vid, ax, ay, az, aw) {
    // update data in cpu-memory
    this._velocityUniforms.textureAcceleration.value.image.data[vid * 4 + 0] = ax;
    this._velocityUniforms.textureAcceleration.value.image.data[vid * 4 + 1] = ay;
    this._velocityUniforms.textureAcceleration.value.image.data[vid * 4 + 2] = az;
    this._velocityUniforms.textureAcceleration.value.image.data[vid * 4 + 3] = aw;
    this._velocityUniforms.textureAcceleration.value.needsUpdate = true;
  }

  //
  // locations = {
  //   0: {lat: 0.0, lon: 0.0, angle: 0.0},
  //   1: {lat: 1.0, lon: 1.0, angle: 0.0},
  //   ...
  //   vid: {lat: lat, lon: lon, angle: angle}
  // }
  //
  _setSimLocations(locations) {
    var self = this;

    var positions = {};
    Object.keys(locations).forEach(function(vid) {
      var point = self._world.latLonToPoint(new LatLon(locations[vid].lat, locations[vid].lon));
      positions[vid] = {x: point.x, y: 0.0, z: point.y, angle: locations[vid].angle};
    });

    this._setSimPositions(positions);
  }

  //
  // positions = {
  //   0: {x: 0.0, y: 0.0, z: 0.0, angle: 0.0},
  //   1: {x: 1.0, y: 1.0, z: 1.0, angle: 0.0},
  //   ...
  //   vid: {x: x, y: y, z: z, angle: angle}
  // }
  //
  _setSimPositions(positions) {
    if (this._gpuCompute) {
      // transmit from gpu to cpu
      var texturePosition = this._gpuCompute.readVariable(this._positionVariable, this._texturePosition);

      // update data
      Object.keys(positions).forEach(function(vid) {
        // (for extrapolation)
        texturePosition.image.data[vid * 4 + 0] = positions[vid].x;
        texturePosition.image.data[vid * 4 + 1] = positions[vid].y;
        texturePosition.image.data[vid * 4 + 2] = positions[vid].z;
        texturePosition.image.data[vid * 4 + 3] = positions[vid].angle;
      });
      texturePosition.needsUpdate = true;

      // transmit from cpu to gpu
      this._gpuCompute.updateVariable(this._positionVariable, texturePosition);
    }
  }

  //
  // velocities = {
  //   0: {vx: 0.0, vy: 0.0, vz: 0.0, wheel: 0.0},
  //   1: {vx: 1.0, vy: 1.0, vz: 1.0, wheel: 0.0},
  //   ...
  //   vid: {vx: vx, vy: vy, vz: vz, wheel: wheel}
  // }
  //
  _setSimVelocities(velocities) {
    if (this._gpuCompute) {
      // transmit from gpu to cpu
      var textureVelocity = this._gpuCompute.readVariable(this._velocityVariable, this._textureVelocity);

      // update data
      Object.keys(velocities).forEach(function(vid) {
        textureVelocity.image.data[vid * 4 + 0] = velocities[vid].vx;
        textureVelocity.image.data[vid * 4 + 1] = velocities[vid].vy;
        textureVelocity.image.data[vid * 4 + 2] = velocities[vid].vz;
        textureVelocity.image.data[vid * 4 + 3] = velocities[vid].wheel;
      });
      textureVelocity.needsUpdate = true;

      // transmit from cpu to gpu
      this._gpuCompute.updateVariable(this._velocityVariable, textureVelocity);
    }
  }

  _setSimAccelerations(accelerations) {
    // TODO: implement a function to update all of the vehicles' accelerations
  }

  _debug() {
    var texturePosition = this._gpuCompute.readVariable(this._positionVariable);
    var textureVelocity = this._gpuCompute.readVariable(this._velocityVariable);

    console.log('texturePosition:');
    console.log(texturePosition.image.data);
    console.log('textureVelocity:');
    console.log(textureVelocity.image.data);
  }
}

export default VehicleLayer;

var noNew = function(coordinates, options) {
  return new VehicleLayer(coordinates, options);
};

export {noNew as vehicleLayer};
