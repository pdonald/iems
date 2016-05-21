import * as Reflux from 'reflux'

export default {
  add: Reflux.createAction(),
  delete: Reflux.createAction(),
  move: Reflux.createAction(),
  connect: Reflux.createAction(),
  selectManual: Reflux.createAction(),
  selectArea: Reflux.createAction(),
  deselectManual: Reflux.createAction(),
  deselectAll: Reflux.createAction(),
  goIntoGroup: Reflux.createAction(),
  portSelected: Reflux.createAction(),
  portDeselected: Reflux.createAction(),
  processParamChanged: Reflux.createAction(),
  experimentPropertyChanged: Reflux.createAction(),
  experimentTagChanged: Reflux.createAction(),
  experimentTagRemoved: Reflux.createAction(),
  viewFile: Reflux.createAction(),
  variableChanged: Reflux.createAction(),
  variableRemoved: Reflux.createAction(),
  runExperiment: Reflux.createAction(),
  updateStatus: Reflux.createAction()
};
