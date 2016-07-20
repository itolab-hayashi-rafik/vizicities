// jscs:disable
/* eslint-disable */

/**
 * Created by masayuki on 20/07/2016.
 */
import LatLon from '../../geo/LatLon';

class SimObject {
  constructor() {

    // properties
    this.id                   = undefined;
    this.angle                = 0.0;
    this.velocity             = 0.0;
    this.updatePosition       = true;

    // 3D Object
    this.root                 = new THREE.Object3D();

    // --- construct
    this._createSimObject();

  }

  // --- API
  /**
   * Add THREE.Object3D object directly
   * @param {object} object
   */
  add(object) {
    this.root.add(object);
  }

  /**
   * Remove THREE.Object3D object directly
   * @param {object} object
   */
  remove(object) {
    this.root.remove(object);
  }

  /**
   * sets the object position
   * @param {Number} x x
   * @param {Number} y y
   * @param {Number} z z
   * @param {Boolean} updateLatLon true if latLon property needs to be updated
   */
  setPosition(x, y, z) {
    this.root.position.set(x, y, z);
  }

  /**
   * sets the object angle
   * @param {Number} angle angle in [rad]
   */
  setAngle(angle) {
    this.angle = angle;
    this.root.rotation.y = angle;
  }

  /**
   * sets the vehicle's velocity
   * @param {Number} velocity velocity in [m/s]
   */
  setVelocity(velocity) {
    this.velocity = velocity;
  }

  /**
   * update the object
   * @param {Number} delta
   */
  update(delta) {

    var forwardDelta = delta * this.velocity;

    // position
    if (this.updatePosition) {
      this.root.position.x += Math.sin( this.angle ) * forwardDelta;
      this.root.position.z += Math.cos( this.angle ) * forwardDelta;

      this.root.rotation.y = this.angle;
    }

  }

  // --- internal helper methods
  _createSimObject() {
    // construct this object
  }
  // ---

}

export default SimObject;
