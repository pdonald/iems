import * as React from 'react'
import { Router, Route, IndexRoute, browserHistory } from 'react-router'

import App from './pages/App'
import Dashboard from './pages/Dashboard/'

import Experiments from './pages/Experiments'
import Experiment from './pages/Experiments/Experiment'

import ClusterIndex from './pages/Cluster/Index'
import * as ClusterConfigs from './pages/Cluster/Configs'

export default (
  <Router history={browserHistory}>
    <Route path="/" component={App}>
      <IndexRoute component={Dashboard}/>
      <Route path="experiments" component={props => props.children}>
        <IndexRoute component={Experiments}/>
        <Route path=":id" component={Experiment}/>
      </Route>
      <Route path="cluster" component={props => props.children}>
        <IndexRoute component={ClusterIndex}/>
        <Route path="configs" component={ClusterConfigs.Index}/>
        <Route path="configs/add" component={ClusterConfigs.Edit}/>
        <Route path="configs/:id" component={ClusterConfigs.Edit}/>
      </Route>
    </Route>
  </Router>
)
