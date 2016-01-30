import React from 'react'
import { Router, Route, IndexRoute, browserHistory } from 'react-router'

import App from './pages/App'
import Dashboard from './pages/Dashboard'

import Experiments from './pages/Experiments'
import Experiment from './pages/Experiment'

import Cluster from './pages/Cluster'
import ClusterIndex from './pages/Cluster/Index'
import * as ClusterConfigs from './pages/Cluster/Configs'

export default (
  <Router history={browserHistory}>
    <Route path="/" component={App}>
      <IndexRoute component={Dashboard}/>
      <Route path="experiments" component={Experiments}/>
      <Route path="experiments/:id" component={Experiment}/>
      <Route path="cluster" component={Cluster}>
        <IndexRoute component={ClusterIndex}/>
        <Route path="configs" component={ClusterConfigs.Index}/>
        <Route path="configs/:service/add" component={ClusterConfigs.Edit}/>
        <Route path="configs/:service/:id" component={ClusterConfigs.Edit}/>
      </Route>
    </Route>
  </Router>
)
