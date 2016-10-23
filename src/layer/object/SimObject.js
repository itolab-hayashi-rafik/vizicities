// jscs:disable
/* eslint-disable */

/**
 * Created by masayuki on 20/07/2016.
 */
import THREE from 'three';

class SimObject {
  constructor() {

    // properties
    this.id                   = undefined;
    this.angle                = 0.0;
    this.velocity             = 0.0;
    this.updatePosition       = false;

    // 3D Object
    this.root                 = undefined;

    // 2D Object
    this.label                = undefined;
    this.labelOffset          = new THREE.Vector3();

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
   */
  setPosition(x, y, z) {
    this.root.position.set(x, y, z);
    this.label.position.copy(this.root.position).add(this.labelOffset);
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
   * sets the label class
   * @param className
   */
  setLabelClass(className) {
    this.label.element.className = className;
  }

  /**
   * sets the label text
   * @param text
   */
  setLabelText(text) {
    this.label.element.textContent = text;
  }

  /**
   * sets the label offset
   *
   * @param {Number} x x
   * @param {Number} y y
   * @param {Number} z z
   */
  setLabelOffset(x, y, z) {
    this.labelOffset.set(x, y, z);
  }

  /**
   * update the object
   * @param {Number} delta
   */
  update(delta) {

    var forwardDelta = delta * this.velocity;

    // position
    if (this.updatePosition) {
      this.root.position.x += Math.cos( -this.angle ) * forwardDelta;
      this.root.position.z += Math.sin( -this.angle ) * forwardDelta;
      this.label.position.copy(this.root.position).add(this.labelOffset);

      this.root.rotation.y = this.angle;
    }

  }

  // --- internal helper methods
  _createSimObject() {
    // construct this object

    // root
    this.root = new THREE.Object3D();

    // [DEBUG] arrow
    var from = new THREE.Vector3(0,0,0);
    var to = new THREE.Vector3(50,0,0);
    var direction = to.clone().sub(from);
    var length = direction.length();
    var arrowHelper = new THREE.ArrowHelper(direction.normalize(), from, length, 0xff0000);
    this.root.add(arrowHelper);

    // label
    var text = document.createElement('div');
    this.label = new THREE.CSS2DObject(text);
  }

  _adjustLabelOffset() {
    var bbox = new THREE.Box3().setFromObject(this.root);
    this.setLabelOffset(0, bbox.max.y + 1, 0);
  }
  // ---

}

export default SimObject;
