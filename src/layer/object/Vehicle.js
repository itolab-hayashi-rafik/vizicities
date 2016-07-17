// jscs:disable
/* eslint-disable */

/**
 * Created by masayuki on 17/07/2016.
 */

var Vehicle = function(vehicleModel) {

  var scope = this;

  // parameters
  this.model    = vehicleModel;
  this.callback = function(scope){};

  // properties
  this.angle                = 0.0;
  this.wheelAngle           = 0.0;
  this.velocity             = 0.0;
  this.wheelDiameter        = 1.0;
  this.updatePosition       = true;
  this.updateWheel          = true;

  // 3D Object
  this.root                 = new THREE.Object3D();
  this.frontLeftWheelRoot   = new THREE.Object3D();
  this.frontRightWheelRoot  = new THREE.Object3D();

  // Meshes
  this.bodyMesh             = null;
  this.frontLeftWheelMesh   = null;
  this.frontRightWheelMesh  = null;
  this.rearLeftWheelMesh    = null;
  this.rearRightWheelMesh   = null;

  // --- constants
  this.STEERING_RADIUS_RATIO = 0.0023;

  // --- construct
  createVehicle();

  // --- API
  /**
   * sets the vehicle position
   * @param x x
   * @param y y
   * @param z z
   */
  this.setPosition = function(x, y, z) {
    var t = scope.model.translation;
    this.root.position.set(t.x + x, t.y + y, t.z + z);
  };

  /**
   * sets the vehicle angle
   * @param angle angle in [rad]
   */
  this.setAngle = function(angle) {
    this.angle = angle;

    var r = scope.model.rotation;
    this.root.rotation.y = r.y + angle;
  };

  /**
   * sets the vehicle's wheel angle, relative to the vehicle
   * @param wheel angle in [rad]
   */
  this.setWheelAngle = function(wheel) {
    wheelAngle = wheel;

    this.frontLeftWheelRoot.rotation.y = wheel;
    this.frontRightWheelRoot.rotation.y = wheel;
  };

  /**
   * sets the vehicle's velocity
   * @param velocity velocity in [m/s]
   */
  this.setVelocity = function(velocity) {
    this.velocity = velocity;
  };

  /**
   * update the vehicle
   * @param delta
   */
  this.update = function(delta) {

    var forwardDelta = delta * this.velocity;

    // position
    if (this.updatePosition) {
      this.angle += ( forwardDelta * this.STEERING_RADIUS_RATIO ) * this.wheelAngle;

      this.root.position.x += Math.sin( this.angle ) * forwardDelta;
      this.root.position.z += Math.cos( this.angle ) * forwardDelta;

      this.root.rotation.y = this.angle;
    }

    // wheels rolling
    if (this.updateWheel) {
      var angularSpeedRatio = 1 / ( this.modelScale * ( this.wheelDiameter / 2 ) );
      var wheelDelta = forwardDelta * angularSpeedRatio;
      if ( this.loaded ) {
        this.frontLeftWheelMesh.rotation.x += wheelDelta;
        this.frontRightWheelMesh.rotation.x += wheelDelta;
        this.backLeftWheelMesh.rotation.x += wheelDelta;
        this.backRightWheelMesh.rotation.x += wheelDelta;
      }
    }
  };

  // --- internal helper methods
  function createVehicle() {
    if (scope.model.loaded) {
      // retrieve parameters from vehicleModel
      var modelScale           = scope.model.scale;
      var modelTranslation     = scope.model.translation;
      var modelRotation        = scope.model.rotation;
      var wheelOffset          = scope.model.wheelOffset;
      var wheelDiameter        = scope.model.wheelDiameter;
      var bodyGeometry         = scope.model.bodyGeometry;
      var bodyMaterials        = scope.model.bodyMaterials;
      var wheelGeometry        = scope.model.wheelGeometry;
      var wheelMaterials       = scope.model.wheelMaterials;

      // properties
      scope.wheelDiameter = wheelDiameter;

      // temporary variables
      var s = modelScale, t = modelTranslation, r = modelRotation;
      var delta = new THREE.Vector3();

      // setup combined materials
      var bodyFaceMaterial = new THREE.MultiMaterial(bodyMaterials);
      var wheelFaceMaterial = new THREE.MultiMaterial(wheelMaterials);

      // create body mesh
      scope.bodyMesh = new THREE.Mesh(bodyGeometry, bodyFaceMaterial);
      scope.bodyMesh.scale.set(s, s, s);
      scope.root.add(scope.bodyMesh);

      // create wheel meshes
      // front left
      delta.multiplyVectors(wheelOffset, new THREE.Vector3( s, s, s));
      scope.frontLeftWheelRoot.position.add(delta);
      scope.frontLeftWheelMesh = new THREE.Mesh(wheelGeometry, wheelFaceMaterial);
      scope.frontLeftWheelMesh.scale.set(s, s, s);
      scope.frontLeftWheelRoot.add(scope.frontLeftWheelMesh);
      scope.root.add(scope.frontLeftWheelRoot);
      // front right
      delta.multiplyVectors(wheelOffset, new THREE.Vector3(-s, s, s));
      scope.frontRightWheelRoot.position.add(delta);
      scope.frontRightWheelMesh = new THREE.Mesh(wheelGeometry, wheelFaceMaterial);
      scope.frontRightWheelMesh.scale.set(s, s, s);
      scope.frontRightWheelRoot.add(scope.frontRightWheelMesh);
      scope.root.add(scope.frontRightWheelRoot);
      // rear left
      delta.multiplyVectors(wheelOffset, new THREE.Vector3( s, s,-s));
      scope.rearLeftWheelMesh = new THREE.Mesh(wheelGeometry, wheelFaceMaterial);
      scope.rearLeftWheelMesh.scale.set(s, s, s);
      scope.rearLeftWheelMesh.position.add(delta);
      scope.root.add(scope.rearLeftWheelMesh);
      // rear right
      delta.multiplyVectors(wheelOffset, new THREE.Vector3(-s, s,-s));
      scope.rearRightWheelMesh = new THREE.Mesh(wheelGeometry, wheelFaceMaterial);
      scope.rearRightWheelMesh.scale.set(s, s, s);
      scope.rearRightWheelMesh.position.add(delta);
      scope.root.add(scope.rearRightWheelMesh);

      // translation and rotation
      scope.root.position.set(t.x, t.y, t.z);
      scope.root.rotation.set(r.x, r.y, r.z);

      // callback
      if (scope.callback) {
        scope.callback(scope);
      }

    }
  }
  // ---

};

export default Vehicle;
