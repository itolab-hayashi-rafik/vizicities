/*
 * Object helpers
 */

import THREE from 'three';
import operative from 'operative';
import SimplifyModifier from '../vendor/SimplifyModifier';
import WorkerUtils from './WorkerUtils';

var ObjectUtils = (function() {

  // Create UV from geometry's faces
  var createUV = function(geometry) {
    geometry.computeBoundingBox();

    var max = geometry.boundingBox.max;
    var min = geometry.boundingBox.min;
    var offset = new THREE.Vector2(0 - min.x, 0 - min.y);
    var range = new THREE.Vector2(max.x - min.x, max.y - min.y);
    var faces = geometry.faces;

    geometry.faceVertexUvs[0] = [];

    for (var i = 0; i < faces.length ; i++) {
      var v1 = geometry.vertices[faces[i].a];
      var v2 = geometry.vertices[faces[i].b];
      var v3 = geometry.vertices[faces[i].c];

      geometry.faceVertexUvs[0].push([
        new THREE.Vector2((v1.x + offset.x) / range.x ,(v1.y + offset.y) / range.y),
        new THREE.Vector2((v2.x + offset.x) / range.x ,(v2.y + offset.y) / range.y),
        new THREE.Vector2((v3.x + offset.x) / range.x ,(v3.y + offset.y) / range.y)
      ]);
    }

    geometry.uvsNeedUpdate = true;
  };

  var objectToGeometry = function(geometry) {
    var newGeo = new THREE.Geometry();

    for (i = 0; i < geometry.vertices.length; i++) {
      var v = geometry.vertices[i];
      newGeo.vertices.push(new THREE.Vector3(v.x, v.y, v.z));
    }
    for (i = 0; i < geometry.faces.length; i++) {
      var f = geometry.faces[i];
      newGeo.faces.push(new THREE.Face3(f.a, f.b, f.c, f.normal, f.color, f.materialIndex));
    }

    return newGeo;
  };

  // Reduce vertices and simplify a geometry
  var simplifyGeometry = function(geometry, reduceCount, callback) {

    reduceCount = reduceCount | geometry.vertices.length * 0.5;
    var func = operative(function(geometry, reduceCount, cb) {
      // NOTE these codes run on a webworker thread, so all of the variables outside this scope are unavailable.

      // hack
      console.assert = function(b) {
        if (!b) { throw new Error('assertion failed'); }
      };

      // deferred
      var d = this.deferred();

      // convert "[Object object]" to "[THREE.Geometry]"
      geometry = VIZI.Util.ObjectUtils.objectToGeometry(geometry);

      // modify the geometry
      var modifier = new VIZI.Util.ObjectUtils.SimplifyModifier();
      var geometry = modifier.modify(geometry, reduceCount | 0);

      // return to the main thread
      cb(geometry);
    }, WorkerUtils.getDependencies());

    // call the webworker procedure from the main thread
    func(geometry, reduceCount, function(geometry) {
      // callback called on the main thread

      // convert "[Object object]" to "[THREE.Geometry]"
      geometry = objectToGeometry(geometry);

      // callback to the function caller
      if (callback) {
        callback(geometry);
      }
    });
  };

  return {
    createUV: createUV,
    objectToGeometry: objectToGeometry,
    simplifyGeometry: simplifyGeometry,
    SimplifyModifier: SimplifyModifier
  };
})();

export default ObjectUtils;
