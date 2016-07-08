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
import PickingMaterial from '../../engine/PickingMaterial';
import Buffer from '../../util/Buffer';
import BinaryLoader from './BinaryLoader';

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
      interactive: false,
      // Custom material override
      //
      // TODO: Should this be in the style object?
      material: null,
      onMesh: null,
      onBufferAttributes: null,
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
    this._vehicles = [];
  }

  _onAdd(world) {
    if (this._options.interactive) {
      // Only add to picking mesh if this layer is controlling output
      //
      // Otherwise, assume another component will eventually add a mesh to
      // the picking scene
      if (this.isOutput()) {
        this._pickingMesh = new THREE.Object3D();
        this.addToPicking(this._pickingMesh);
      }
    }

    if (this.isOutput()) {
      // add callback
      this.on('loadCompleted', this._onLoadCompleted);

      // add car
      this._loadModels();
    }
  }

  _loadModels() {
    var self = this;

    var bloader = new BinaryLoader();
    var counter = 0;
    var len = Object.keys(this._models).length;
    for (modelName in this._models) {
      this._geometries[modelName] = null;

      bloader.load(this._models[modelName].file, function(geometry) {
        self._geometries[modelName] = geometry;

        counter++;
        if (counter >= len) {
          self.emit('loadCompleted');
        }
      });
    }
  }

  _onLoadCompleted() {
    this._modelsLoaded = true;

    // iterate over all the vehicles already added and add meshes to the world
    for (var i = 0; i < this._vehicles.length; i++) {
      var vehicle = this._vehicles[i];
      if (vehicle.mesh == null) {
        this._addVehicleInternal(vehicle);
      }
    }
  }

  addVehicle(modelName, latlon, options) {
    if (!(modelName in this._geometries)) {
      throw new Error('Vehicle model ' + modelName + ' does not exist.');
    }

    var self = this;

    var vehicle = {
      vid: undefined,
      modelName: modelName,
      model: null,
      latlon: latlon,
      options: options,
      mesh: null,
      setLocation: function(lat, lon) {
        self.setLocation(this.vid, lat, lon);
      },
      setPosition: function(x, y) {
        self.setPosition(this.vid, x, y);
      },
      setRotation: function(rx, ry, rz) {
        self.setRotation(this.vid, rx, ry, rz);
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
      var model = this._models[vehicle.modelName];
      var geometry = this._geometries[vehicle.modelName];
      var orange = new THREE.MeshLambertMaterial({ color: 0x995500, opacity: 1.0, transparent: false });
      var mesh = new THREE.Mesh(geometry, orange);
      mesh.scale.x = mesh.scale.y = mesh.scale.z = model.scale;
      mesh.rotateX(model.rotation.x);
      mesh.rotateY(model.rotation.y);
      mesh.rotateZ(model.rotation.z);
      mesh.translateX(model.translation.x);
      mesh.translateY(model.translation.y);
      mesh.translateZ(model.translation.z);
      this.add(mesh);
      vehicle.model = model;
      vehicle.mesh = mesh;
      vehicle.setLocation(vehicle.latlon.lat, vehicle.latlon.lon);
    }
  }

  /**
   * Set the location of a specific vehicle
   *
   * @param {number} vid vehicle id
   * @param {number} lat latitude
   * @param {number} lon longitude
   */
  setLocation(vid, lat, lon) {
    // if the vehicle exists
    if (vid in this._vehicles) {
      var vehicle = this._vehicles[vid];

      // update latlon
      vehicle.latlon.lat = lat;
      vehicle.latlon.lon = lon;

      // if the vehicle mesh is created
      if (vehicle.mesh != null) {
        // calculate the position
        var position = this._world.latLonToPoint(vehicle.latlon);

        // update the location
        vehicle.mesh.position.set(
          vehicle.model.translation.x + position.x,
          vehicle.model.translation.y,  // TODO: need to set the height of the ground
          vehicle.model.translation.z + position.y
        );
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
  setPosition(vid, x, y) {
    if (vid in this._vehicles) {
      var vehicle = this._vehicles[vid];

      var point = new Point(x, y);

      // if the vehicle mesh is created
      if (vehicle.mesh != null) {
        // update the position
        vehicle.mesh.position.set(
          vehicle.model.translation.x + point.x,
          vehicle.model.translation.y + 50,
          vehicle.model.translation.z + point.y
        );
      }

      // calculate and update the location
      vehicle.latlon = this._world.pointToLatLon(point);
    }
  }

  /**
   * Set the rotation of a specific vehicle
   *
   * @param {number} vid vehicle id
   * @param {number} rx rotation x
   * @param {number} ry rotation y
   * @param {number} rz rotation z
   */
  setRotation(vid, rx, ry, rz) {
    if (vid in this._vehicles) {
      var vehicle = this._vehicles[vid];

      // if the vehicle mesh is created
      if (vehicle.mesh != null) {
        // update the rotation
        vehicle.mesh.rotation.set(
          vehicle.model.rotation.rx + rx,
          vehicle.model.rotation.ry + ry,
          vehicle.model.rotation.rz + rz
        );
      }
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

  // TODO: Make sure this is cleaning everything
  destroy() {
    if (this._pickingMesh) {
      // TODO: Properly dispose of picking mesh
      this._pickingMesh = null;
    }

    // Run common destruction logic from parent
    super.destroy();
  }
}

export default VehicleLayer;

var noNew = function(coordinates, options) {
  return new VehicleLayer(coordinates, options);
};

export {noNew as vehicleLayer};
