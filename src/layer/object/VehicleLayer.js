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

import SimObjectLayer from './SimObjectLayer';
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

const MODEL_PREFIX = 'vehicle:';

class VehicleLayer extends SimObjectLayer {
  constructor(models, options) {
    var defaults = {
      output: true,
    };

    var _options = extend({}, defaults, options);

    super(_options);

    var modelDefaults = {
      file: {
        body: null,
        wheel: null
      },
      scale: 1,
      translation: {x: 0, y: 0, z: 0},
      rotation: {rx: 0, ry: 0, rz: 0}
    };
    for (key in models) {
      models[key] = extend({}, modelDefaults, models[key]);
    }

    this._modelsLoaded = false;
    this._models = extend({}, models);
    this._entries = [];
  }

  _onAdd(world) {
    super._onAdd(world);

    if (this.isOutput()) {
      // add callback
      this.on('loadCompleted', this._onLoadCompleted);

      // load models
      this._loadModels();
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
      modelRepository.add(MODEL_PREFIX + modelName, vehicleModel);
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
    for (var i = 0; i < this._entries.length; i++) {
      var entry = this._entries[i];
      if (entry.vehicle === null) {
        this._addVehicleInternal(entry);
      }
    }
  }

  addVehicle(modelName, latlon, angle, options) {
    if (!modelRepository.contains(MODEL_PREFIX + modelName)) {
      throw new Error('Vehicle model ' + modelName + ' does not exist.');
    }

    var self = this;

    var entry = {
      id: undefined,
      modelName: modelName,
      latlon: latlon,
      angle: angle,
      options: options,
      vehicle: null
    };
    var total = this._entries.push(entry);
    entry.id = (total - 1);

    // add vehicle if the model is already loaded
    this._addVehicleInternal(entry);

    return entry;
  }

  _addVehicleInternal(entry) {
    if (this._modelsLoaded) {

      // instantiate the vehicle
      var vehicleModel = modelRepository.get(MODEL_PREFIX + entry.modelName);
      var vehicle = new Vehicle(vehicleModel);

      // add the vehicle to the layer
      this.add(vehicle);
      entry.vehicle = vehicle;

      // set the vehicle's location
      this.setLocation(entry.id, entry.latlon.lat, entry.latlon.lon, entry.angle);

      // var id = vehicle.id;
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

  getVehicle(id) {
    if (id in this._entries) {
      return this._entries[id];
    }
    return null;
  }

  _setVelocity(id, vx, vy, vz, wheel) {
    super._setVelocity(id, vx, vy, vz, wheel);

    // if the vehicle exists
    if (id in this._simObjects) {
      var simObject = this._simObjects[id];
      simObject.setWheelAngle(wheel);
    }
  }

  destroy() {
    // Run common destruction logic from parent
    super.destroy();
  }

}

export default VehicleLayer;

var noNew = function(models, options) {
  return new VehicleLayer(models, options);
};

export {noNew as vehicleLayer};
