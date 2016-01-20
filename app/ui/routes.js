import React from 'react'
import { Router, Route, IndexRoute, browserHistory } from 'react-router'

import App from './pages/App'
import Dashboard from './pages/Dashboard'
import Experiments from './pages/Experiments'
import Experiment from './pages/Experiment'
import Cluster from './pages/Cluster'
import * as ClusterConfigs from './pages/ClusterConfigs'
import About from './pages/About'

export default (
  <Router history={browserHistory}>
    <Route path="/" component={App}>
      <IndexRoute component={Dashboard}/>
      <Route path="experiments" component={Experiments}/>
      <Route path="experiments/:id" component={Experiment}/>
      <Route path="cluster" component={Cluster}/>
      <Route path="cluster/configs" component={ClusterConfigs.Index}/>
      <Route path="cluster/configs/add" component={ClusterConfigs.Edit}/>
      <Route path="cluster/configs/:id" component={ClusterConfigs.Edit}/>
      <Route path="about" component={About}/>
    </Route>
  </Router>
)
