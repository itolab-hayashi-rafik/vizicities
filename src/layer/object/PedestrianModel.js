/**
 * Created by masayuki on 20/07/2016.
 */
import THREE from 'three';
import BinaryLoader from '../../vendor/BinaryLoader';

var PedestrianModel = function(parameters, callback) {

  var scope = this;
  var p = parameters;

  // file paths
  this.bodyURL  = p.bodyURL   || null;

  // parameters
  this.scale           = p.scale           || 1.0;
  this.translation     = p.translation     || new THREE.Vector3();
  this.rotation        = p.rotation        || new THREE.Vector3();

  // callback
  this.callback = callback;

  // status
  this.loaded   = false;

  // internal use
  this.bodyGeometry   = null;
  this.bodyMaterials  = null;

  // construct
  if (scope.bodyURL) {
    // load binaries
    var jloader = new THREE.JSONLoader();
    jloader.load(scope.bodyURL, function(geometry, materials) {
      createBody(geometry, materials);
    });
  }

  // internal helper methods
  function createBody(geometry, materials) {
    scope.bodyGeometry = geometry;
    scope.bodyMaterials = materials;

    for (i = 0, max = materials.length; i < max; i = i + 1) {
      materials[i].morphTargets = true;
    }

    onCreated();
  }
  function onCreated() {
    if (scope.bodyGeometry) {
      scope.loaded = true;

      // callback
      if (scope.callback) {
        scope.callback(scope);
      }
    }
  }

};

export default PedestrianModel;
