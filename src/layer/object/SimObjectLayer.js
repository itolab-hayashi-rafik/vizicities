import Layer from '../Layer';
import extend from 'lodash.assign';
import THREE from 'three';
import {latLon as LatLon} from '../../geo/LatLon';
import {point as Point} from '../../geo/Point';
import earcut from 'earcut';
import extrudePolygon from '../../util/extrudePolygon';
import Buffer from '../../util/Buffer';
import GPUComputationRenderer from '../../vendor/GPUComputationRenderer';
import SimObject from './SimObject';
import VehicleVelocityShader from './VehicleVelocityShader';
import VehiclePositionShader from './VehiclePositionShader';
import VehicleShader from './VehicleShader';
import ObjectUtils from '../../util/ObjectUtils';

/**
 * Object Layer that supports GPGPU object extrapolations
 */
class SimObjectLayer extends Layer {
  constructor(options) {
    var defaults = {
      output: true,
      // simulation:
      simWidth: 2
    };

    var _options = extend({}, defaults, options);

    super(_options);

    this._simObjects = [];
    this._gpuCompute = null;
  }

  _initComputeRenderer(world) {
    var gpuCompute = new GPUComputationRenderer(this._options.simWidth, this._options.simWidth, world._engine._renderer);

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

  // add SimObject
  add(simObject) {
    var total = this._simObjects.push(simObject);
    simObject.id = (total - 1);
    super.add(simObject.root);
  }

  // remove SimObject
  remove(simObject) {
    this._simObjects.splice(this._simObjects.indexOf(simObject), 1);
    super.remove(simObject.root);
  }

  _onAdd(world) {
    super._onAdd(world);

    var self = this;

    if (this.isOutput()) {
      // initialize GPUComputationRenderer
      this._initComputeRenderer(world);

      // add listener
      world.on('preUpdate', (delta) => {
        self._onWorldUpdate(delta);
      });
    }
  }

  _onWorldUpdate(delta) {
    this._performUpdate(delta);
    this._performSimUpdate(delta);
  }

  _performUpdate(delta) {
    for (var i = 0; i < this._simObjects.length; i++) {
      this._simObjects[i].update(delta);
    }
  }

  _performSimUpdate(delta) {
    if (this._gpuCompute) {
      var now = performance.now();

      this._positionUniforms.time.value = now;
      this._positionUniforms.delta.value = delta;
      this._velocityUniforms.time.value = now;
      this._velocityUniforms.delta.value = delta;

      this._gpuCompute.compute();

      // transfer objects' velocity parameters from gpu to cpu
      var texturePosition = this._gpuCompute.readVariable(this._positionVariable, this._texturePosition);
      var textureVelocity = this._gpuCompute.readVariable(this._velocityVariable, this._textureVelocity);
      for (var i = 0; i < this._simObjects.length; i++) {
        var object = this._simObjects[i];

        var x = texturePosition.image.data[i * 4 + 0];
        var y = texturePosition.image.data[i * 4 + 1];
        var z = texturePosition.image.data[i * 4 + 2];
        var angle = texturePosition.image.data[i * 4 + 3];
        var velocity = textureVelocity.image.data[i * 4 + 0];

        object.setPosition(x, y, z);
        object.setAngle(-angle);
        object.setVelocity(velocity);
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
  }

  /**
   * Set the location of a specific object
   *
   * @param {number} id SimObject id
   * @param {number} lat latitude
   * @param {number} lon longitude
   * @param {number} angle angle
   */
  setLocation(id, lat, lon, angle) {
    // calculate the position
    var point = this._world.latLonToPoint(latLon(lat, lon));
    this.setPosition(id, point.x, 0, point.y, angle);
  }

  /**
   * Set the position of a specific object
   *
   * @param {number} id SimObject id
   * @param {number} x x
   * @param {number} y y
   * @param {number} z z
   * @param {number} angle angle
   */
  setPosition(id, x, y, z, angle) {
    this._setPosition(id, x, y, z, angle);
    this._setSimPosition(id, x, y, z, angle);
  }

  _setPosition(id, x, y, z, angle) {
    // if the vehicle exists
    if (id in this._simObjects) {
      var simObject = this._simObjects[id];

      // update the vehicle
      simObject.setPosition(x, y, z);
      simObject.setAngle(angle);
    }
  }

  _setSimPosition(id, x, y, z, angle) {
    console.log('_setSimPosition: ' + id + ', ' + x + ', ' + y + ', ' + z + ', ' + angle + ')');

    if (this._gpuCompute) {
      // transmit from gpu to cpu
      var texturePosition = this._gpuCompute.readVariable(this._positionVariable, this._texturePosition);

      // (for extrapolation) update data
      texturePosition.image.data[id * 4 + 0] = x;
      texturePosition.image.data[id * 4 + 1] = y;
      texturePosition.image.data[id * 4 + 2] = z;
      texturePosition.image.data[id * 4 + 3] = angle;
      texturePosition.needsUpdate = true;

      // transmit from cpu to gpu
      this._gpuCompute.updateVariable(this._positionVariable, texturePosition);
    }
  }

  /**
   * Set the velocity of a specific object
   *
   * @param {number} id SimObject id
   * @param {number} vx x
   * @param {number} vy y
   * @param {number} vz z
   * @param {number} wheel wheel
   */
  setVelocity(id, vx, vy, vz, wheel) {
    this._setVelocity(id, vx, vy, vz, wheel);
    this._setSimVelocity(id, vx, vy, vz, wheel);
  }

  _setVelocity(id, vx, vy, vz, wheel) {
    // if the vehicle exists
    if (id in this._simObjects) {
      var simObject = this._simObjects[id];

      // update the vehicle
      simObject.setVelocity(vx); // FIXME: use vy, vz, wheel?
    }
  }

  _setSimVelocity(id, vx, vy, vz, wheel) {
    console.log('_setSimVelocity: ' + id + ', ' + vx + ', ' + vy + ', ' + vz + ', ' + wheel + ')');

    if (this._gpuCompute) {
      // transmit from gpu to cpu
      var textureVelocity = this._gpuCompute.readVariable(this._velocityVariable, this._textureVelocity);

      // update data
      textureVelocity.image.data[id * 4 + 0] = vx;
      textureVelocity.image.data[id * 4 + 1] = vy;
      textureVelocity.image.data[id * 4 + 2] = vz;
      textureVelocity.image.data[id * 4 + 3] = wheel;
      textureVelocity.needsUpdate = true;

      // transmit from cpu to gpu
      this._gpuCompute.updateVariable(this._velocityVariable, textureVelocity);
    }
  }

  _setSimAcceleration(id, ax, ay, az, aw) {
    if (this._gpuCompute) {
      // update data in cpu-memory
      this._velocityUniforms.textureAcceleration.value.image.data[id * 4 + 0] = ax;
      this._velocityUniforms.textureAcceleration.value.image.data[id * 4 + 1] = ay;
      this._velocityUniforms.textureAcceleration.value.image.data[id * 4 + 2] = az;
      this._velocityUniforms.textureAcceleration.value.image.data[id * 4 + 3] = aw;
      this._velocityUniforms.textureAcceleration.value.needsUpdate = true;
    }
  }

  //
  // locations = {
  //   0: {lat: 0.0, lon: 0.0, angle: 0.0},
  //   1: {lat: 1.0, lon: 1.0, angle: 0.0},
  //   ...
  //   id: {lat: lat, lon: lon, angle: angle}
  // }
  //
  _setSimLocations(locations) {
    var self = this;

    var positions = {};
    Object.keys(locations).forEach(function(id) {
      var point = self._world.latLonToPoint(latLon(locations[id].lat, locations[id].lon));
      positions[id] = {x: point.x, y: 0.0, z: point.y, angle: locations[id].angle};
    });

    this._setSimPositions(positions);
  }

  //
  // positions = {
  //   0: {x: 0.0, y: 0.0, z: 0.0, angle: 0.0},
  //   1: {x: 1.0, y: 1.0, z: 1.0, angle: 0.0},
  //   ...
  //   id: {x: x, y: y, z: z, angle: angle}
  // }
  //
  _setSimPositions(positions) {
    if (this._gpuCompute) {
      // transmit from gpu to cpu
      var texturePosition = this._gpuCompute.readVariable(this._positionVariable, this._texturePosition);

      // update data
      Object.keys(positions).forEach(function(id) {
        // (for extrapolation)
        texturePosition.image.data[id * 4 + 0] = positions[id].x;
        texturePosition.image.data[id * 4 + 1] = positions[id].y;
        texturePosition.image.data[id * 4 + 2] = positions[id].z;
        texturePosition.image.data[id * 4 + 3] = positions[id].angle;
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
  //   id: {vx: vx, vy: vy, vz: vz, wheel: wheel}
  // }
  //
  _setSimVelocities(velocities) {
    if (this._gpuCompute) {
      // transmit from gpu to cpu
      var textureVelocity = this._gpuCompute.readVariable(this._velocityVariable, this._textureVelocity);

      // update data
      Object.keys(velocities).forEach(function(id) {
        textureVelocity.image.data[id * 4 + 0] = velocities[id].vx;
        textureVelocity.image.data[id * 4 + 1] = velocities[id].vy;
        textureVelocity.image.data[id * 4 + 2] = velocities[id].vz;
        textureVelocity.image.data[id * 4 + 3] = velocities[id].wheel;
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

  destroy() {
    // Run common destruction logic from parent
    super.destroy();
  }

}

export default SimObjectLayer;
