// jscs:disable
/* eslint-disable */

/**
 * Created by masayuki on 20/07/2016.
 */
import SimObject from './SimObject';
import THREE from 'three';

const TOTAL_FRAMES = 60;

class Pedestrian extends SimObject {
  constructor(pedestrianModel, callback) {
    super();

    // parameters
    this.model    = pedestrianModel;
    this.callback = callback || function(self){};

    // properties
    this.lastKeyFrame         = 0;
    this.currentKeyFrame      = 0;
    this.updateMorph          = true;

    // Meshes
    this.bodyMesh             = null;

    // --- make a pedestrian
    this._createPedestrian();
  }

  update(delta) {
    super.update(delta);

    // morph animation
    if (this.updateMorph) {
      this.bodyMesh.update(delta);
    }
  }

  _createPedestrian() {
    var self = this;

    if (this.model.loaded) {
      var root = new THREE.Object3D();

      // retrieve parameters from vehicleModel
      var modelScale           = this.model.scale;
      var modelTranslation     = this.model.translation;
      var modelRotation        = this.model.rotation;
      var bodyGeometry         = this.model.bodyGeometry;
      var bodyMaterials        = this.model.bodyMaterials;

      // temporary variables
      var s = modelScale, t = modelTranslation, r = modelRotation;
      var delta = new THREE.Vector3();

      // materials
      var bodyFaceMaterial = new THREE.MeshFaceMaterial(bodyMaterials);

      // create body mesh
      this.bodyMesh = new THREE.MorphBlendMesh(bodyGeometry, bodyFaceMaterial);
      this.bodyMesh.scale.set(s, s, s);
      this.bodyMesh.animationsList.forEach((animation) => {
        animation.active = true; // activate all animations
      });
      root.add(this.bodyMesh);

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
}

export default Pedestrian;
