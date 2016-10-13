// TODO: A lot of these utils don't need to be in separate, tiny files

import wrapNum from './wrapNum';
import extrudePolygon from './extrudePolygon';
import GeoJSON from './GeoJSON';
import Buffer from './Buffer';
import ObjectUtils from './ObjectUtils';
import WorkerUtils from './WorkerUtils';

const Util = {};

Util.wrapNum = wrapNum;
Util.extrudePolygon = extrudePolygon;
Util.GeoJSON = GeoJSON;
Util.Buffer = Buffer;
Util.ObjectUtils = ObjectUtils;
Util.WorkerUtils = WorkerUtils;

export default Util;
