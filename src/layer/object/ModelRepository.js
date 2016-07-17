/**
 * Created by masayuki on 17/07/2016.
 */

class ModelRepository {
  constructor() {
    this._map = {};
  }

  add(modelName, vehicleModel) {
    this._map[modelName] = vehicleModel;
  }

  get(modelName) {
    return this._map[modelName];
  }

  contains(modelName) {
    return (modelName in this._map);
  }
}

var modelRepository = new ModelRepository();

export default modelRepository;
