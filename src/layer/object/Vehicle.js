// jscs:disable
/* eslint-disable */

/**
 * Created by masayuki on 17/07/2016.
 */
import SimObject from './SimObject';

class Vehicle extends SimObject {
  constructor(vehicleModel, callback){
    super();

    // parameters
    this.model    = vehicleModel;
    this.callback = callback || function(self){};

    // properties
    this.wheelAngle           = 0.0;
    this.wheelDiameter        = 1.0;
    this.updateWheel          = true;

    // 3D Object
    this.frontLeftWheelRoot   = new THREE.Object3D();
    this.frontRightWheelRoot  = new THREE.Object3D();

    // Meshes
    this.bodyMesh             = null;
    this.frontLeftWheelMesh   = null;
    this.frontRightWheelMesh  = null;
    this.rearLeftWheelMesh    = null;
    this.rearRightWheelMesh   = null;

    // --- constants
    this.STEERING_RADIUS_RATIO = 0.0023 / vehicleModel.scale;

    // --- make a vehicle
    this._createVehicle();
  }

  // --- API
  /**
   * sets the vehicle's wheel angle, relative to the vehicle
   * @param wheelAngle angle in [rad]
   */
  setWheelAngle(wheelAngle) {
    this.wheelAngle = wheelAngle;

    this.frontLeftWheelRoot.rotation.y = wheelAngle;
    this.frontRightWheelRoot.rotation.y = wheelAngle;
  };

  /**
   * sets the vehicle's velocity
   * @param velocity velocity in [m/s]
   */
  setVelocity(velocity) {
    super.setVelocity(velocity);
  }

  /**
   * update the vehicle
   * @param delta
   */
  update(delta) {

    var forwardDelta = delta * this.velocity;

    // position
    if (this.updatePosition) {
      this.angle += ( forwardDelta * this.STEERING_RADIUS_RATIO ) * this.wheelAngle;
    }

    super.update(delta);

    // wheels rolling
    if (this.updateWheel) {
      var angularSpeedRatio = 1 / ( this.model.scale * ( this.wheelDiameter / 2. ) );
      var wheelDelta = forwardDelta * angularSpeedRatio;

      this.frontLeftWheelMesh.rotation.x += wheelDelta;
      this.frontRightWheelMesh.rotation.x += wheelDelta;
      this.rearLeftWheelMesh.rotation.x += wheelDelta;
      this.rearRightWheelMesh.rotation.x += wheelDelta;
    }

  }

  // --- internal helper methods
  _createVehicle() {
    var self = this;

    if (this.model.loaded) {
      var root = new THREE.Object3D();

      // retrieve parameters from vehicleModel
      var modelScale           = this.model.scale;
      var modelTranslation     = this.model.translation;
      var modelRotation        = this.model.rotation;
      var wheelOffset          = this.model.wheelOffset;
      var wheelDiameter        = this.model.wheelDiameter;
      var bodyGeometry         = this.model.bodyGeometry;
      var bodyMaterials        = this.model.bodyMaterials;
      var wheelGeometry        = this.model.wheelGeometry;
      var wheelMaterials       = this.model.wheelMaterials;

      // properties
      this.wheelDiameter = wheelDiameter;

      // temporary variables
      var s = modelScale, t = modelTranslation, r = modelRotation;
      var delta = new THREE.Vector3();

      // setup combined materials
      var bodyFaceMaterial = new THREE.MultiMaterial(bodyMaterials);
      var wheelFaceMaterial = new THREE.MultiMaterial(wheelMaterials);
      // var bodyFaceMaterial = new THREE.MeshFaceMaterial(bodyMaterials);
      // var wheelFaceMaterial = new THREE.MeshFaceMaterial(wheelMaterials);
      // var bodyFaceMaterial = new THREE.MeshPhongMaterial({ color: 0x00000bb });
      // var wheelFaceMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });

      // create body mesh
      this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyFaceMaterial);
      this.bodyMesh.scale.set(s, s, s);
      root.add(this.bodyMesh);

      // create wheel meshes
      // front left
      delta.multiplyVectors(wheelOffset, new THREE.Vector3( s, s, s));
      this.frontLeftWheelRoot.position.add(delta);
      this.frontLeftWheelMesh = new THREE.Mesh(wheelGeometry, wheelFaceMaterial);
      this.frontLeftWheelMesh.scale.set(s, s, s);
      this.frontLeftWheelMesh.rotateY(0.0);
      this.frontLeftWheelRoot.add(this.frontLeftWheelMesh);
      root.add(this.frontLeftWheelRoot);
      // front right
      delta.multiplyVectors(wheelOffset, new THREE.Vector3(-s, s, s));
      this.frontRightWheelRoot.position.add(delta);
      this.frontRightWheelMesh = new THREE.Mesh(wheelGeometry, wheelFaceMaterial);
      this.frontRightWheelMesh.scale.set(s, s, s);
      this.frontRightWheelMesh.rotateY(Math.PI);
      this.frontRightWheelRoot.add(this.frontRightWheelMesh);
      root.add(this.frontRightWheelRoot);
      // rear left
      delta.multiplyVectors(wheelOffset, new THREE.Vector3( s, s,-s));
      this.rearLeftWheelMesh = new THREE.Mesh(wheelGeometry, wheelFaceMaterial);
      this.rearLeftWheelMesh.scale.set(s, s, s);
      this.rearLeftWheelMesh.rotateY(0.0);
      this.rearLeftWheelMesh.position.add(delta);
      root.add(this.rearLeftWheelMesh);
      // rear right
      delta.multiplyVectors(wheelOffset, new THREE.Vector3(-s, s,-s));
      this.rearRightWheelMesh = new THREE.Mesh(wheelGeometry, wheelFaceMaterial);
      this.rearRightWheelMesh.scale.set(s, s, s);
      this.rearRightWheelMesh.rotateY(Math.PI);
      this.rearRightWheelMesh.position.add(delta);
      root.add(this.rearRightWheelMesh);

      // translation and rotation
      root.position.set(t.x, t.y, t.z);
      root.rotation.set(r.x, r.y, r.z);

      // finish
      this.add(root);

      // callback
      if (this.callback) {
        this.callback(self);
      }
    }
  }
  // ---

}

export default Vehicle;
