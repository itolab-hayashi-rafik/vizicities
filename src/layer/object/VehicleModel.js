/**
 * Created by masayuki on 17/07/2016.
 */

import THREE from 'three';
import BinaryLoader from '../../vendor/BinaryLoader';
import ObjectUtils from '../../util/ObjectUtils';

var VehicleModel = function(parameters, callback) {

  var scope = this;
  var p = parameters;

  // file type
  this.fileType = p.fileType  || 'binary';

  // file paths
  this.bodyURL  = p.bodyURL   || null;
  this.wheelURL = p.wheelURL  || null;

  // parameters
  this.scale           = p.scale           || 1.0;
  this.translation     = p.translation     || new THREE.Vector3();
  this.rotation        = p.rotation        || new THREE.Vector3();
  this.wheelOffset     = p.wheelOffset     || new THREE.Vector3();
  this.autoWheelOffset = p.autoWheelOffset || true;

  // properties
  this.wheelDiameter   = 1.0;

  // callback
  this.callback = callback;

  // status
  this.loaded   = false;

  // internal use
  this.bodyGeometry   = null;
  this.bodyMaterials  = null;

  this.wheelGeometry  = null;
  this.wheelMaterials = null;

  // construct
  if (scope.bodyURL && scope.wheelURL) {
    // load binaries
    var loader;
    switch (this.fileType) {
      case 'binary':
        loader = new THREE.BinaryLoader();
        break;
      case 'json':
        loader = new THREE.ObjectLoader();
        break;
      default:
        throw Error('FileType ' + this.fileType + ' is not supported.');
    }
    loader.load(scope.bodyURL, function(geometry, materials) {
      createBody(geometry, materials);
    });
    loader.load(scope.wheelURL, function(geometry, materials) {
      createWheel(geometry, materials);
    });
  }

  // internal helper methods
  function createBody(geometry, materials) {
    geometry.sortFacesByMaterialIndex();
    geometry.computeVertexNormals();

    scope.bodyGeometry = geometry;
    scope.bodyMaterials = materials;

    onCreated();
  }
  function createWheel(geometry, materials) {
    geometry.sortFacesByMaterialIndex();
    geometry.computeVertexNormals();

    scope.wheelGeometry = geometry;
    scope.wheelMaterials = materials;

    onCreated();
  }
  function onCreated() {
    if (scope.bodyGeometry && scope.wheelGeometry) {
      scope.loaded = true;

      // wheel
      scope.wheelGeometry.computeBoundingBox();
      var wbb = scope.wheelGeometry.boundingBox;

      // compute wheel diameter
      scope.wheelDiameter = wbb.max.y - wbb.min.y;

      // compute wheel offsets
      if (scope.autoWheelOffset) {
        scope.wheelOffset.addVectors(wbb.min, wbb.max);
        scope.wheelOffset.multiplyScalar(0.5);

        scope.wheelGeometry.center();
      }

      // callback
      if (scope.callback) {
        scope.callback(scope);
      }
    }
  }

};

export default VehicleModel;
