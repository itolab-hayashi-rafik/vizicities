/**
 * Created by masayuki on 20/07/2016.
 */
import SimObjectLayer from './SimObjectLayer';
import extend from 'lodash.assign';
import THREE from 'three';
import modelRepository from './ModelRepository';
import PedestrianModel from './PedestrianModel';
import Pedestrian from './Pedestrian';

const MODEL_PREFIX = 'pedestrian:';

class PedestrianLayer extends SimObjectLayer {
  constructor(models, options) {
    var defaults = {
      output: true,
    };

    var _options = extend({}, defaults, options);

    super(_options);

    var modelDefaults = {
      file: {
        body: null,
      },
      scale: 1,
      translation: {x: 0, y: 0, z: 0},
      rotation: {rx: 0, ry: 0, rz: 0}
    };
    for (key in models) {
      models[key] = extend({}, modelDefaults, models[key]);
    }

    this._modelsLoaded = false;
    this._models = extend({}, models);
    this._entries = [];
  }

  _onAdd(world) {
    super._onAdd(world);

    if (this.isOutput()) {
      // add callback
      this.on('loadCompleted', this._onLoadCompleted);

      // load models
      this._loadModels();
    }
  }

  _loadModels() {
    var self = this;

    // load models iteratively
    var models = this._models;
    Object.keys(models).forEach(function(modelName) {
      var model = models[modelName];

      var scale = 1.0;
      var translation = new THREE.Vector3();
      var rotation = new THREE.Vector3();

      if (model.scale) {
        scale = model.scale;
      }
      if (model.translation) {
        translation.set(model.translation.x, model.translation.y, model.translation.z);
      }
      if (model.rotation) {
        rotation.set(model.rotation.x, model.rotation.y, model.rotation.z);
      }

      // create a model
      var pedestrianModel = new PedestrianModel({
        bodyURL: model.file.body,
        scale: scale,
        translation: translation,
        rotation: rotation
      }, callback);

      // register to the repos
      modelRepository.add(MODEL_PREFIX + modelName, pedestrianModel);
    });

    // callback
    var counter = 0;
    var len = Object.keys(models).length;
    function callback(scope) {
      if (++counter >= len) {
        // loaded all models
        self.emit('loadCompleted');
      }
    }
  }

  _onLoadCompleted() {
    this._modelsLoaded = true;

    // iterate over all the pedestrians already added and add meshes to the world
    for (var i = 0; i < this._entries.length; i++) {
      var entry = this._entries[i];
      if (entry.pedestrian === null) {
        this._addPedestrianInternal(entry);
      }
    }
  }

  addPedestrian(modelName, latlon, angle, options) {
    if (!modelRepository.contains(MODEL_PREFIX + modelName)) {
      throw new Error('Pedestrian model ' + modelName + ' does not exist.');
    }

    var self = this;

    var entry = {
      id: undefined,
      modelName: modelName,
      latlon: latlon,
      angle: angle,
      options: options,
      pedestrian: null
    };
    var total = this._entries.push(entry);
    entry.id = (total - 1);

    // add pedestrian if the model is already loaded
    this._addPedestrianInternal(entry);

    return entry;
  }

  _addPedestrianInternal(entry) {
    if (this._modelsLoaded) {

      // instantiate the pedestrian
      var pedestrianModel = modelRepository.get(MODEL_PREFIX + entry.modelName);
      var pedestrian = new Pedestrian(pedestrianModel);

      // add the pedestrian to the layer
      this.add(pedestrian);
      entry.pedestrian = pedestrian;

      // set the pedestrian's location
      this.setLocation(entry.id, entry.latlon.lat, entry.latlon.lon, entry.angle);
    }
  }

  getPedestrian(id) {
    if (id in this._entries) {
      return this._entries[id];
    }
    return null;
  }

  destroy() {
    // Run common destruction logic from parent
    super.destroy();
  }
}

export default PedestrianLayer;

var noNew = function(models, options) {
  return new PedestrianLayer(models, options);
};

export {noNew as pedestrianLayer};
