// jscs:disable
/* eslint-disable */

/**
 * Created by masayuki on 20/07/2016.
 */

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
    this.label.position.copy(this.root.position);
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

    // root
    this.root = new THREE.Object3D();

    // label
    var text = document.createElement('div');
    this.label = new THREE.CSS2DObject(text);
  }
  // ---

}

export default SimObject;
