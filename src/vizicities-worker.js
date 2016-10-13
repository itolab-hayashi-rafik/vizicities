import THREE from 'three';

import Point, {point} from './geo/Point';
import LatLon, {latLon} from './geo/LatLon';

import Util from './util/index';

const VIZI = {
  version: '0.3',

  // Public API
  Point: Point,
  point: point,
  LatLon: LatLon,
  latLon: latLon,
  Util: Util
};

export default VIZI;
