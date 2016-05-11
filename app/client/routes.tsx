import * as React from 'react'
import { Router, Route, IndexRoute, browserHistory } from 'react-router'

import App from './pages/app'
import Dashboard from './pages/dashboard/'

import Experiments from './pages/experiments'
import Experiment from './pages/experiment'

import Cluster from './pages/cluster'
//import * as ClusterConfigs from './pages/cluster-launch-configs'

export default (
  <Router history={browserHistory}>
    <Route path="/" component={App}>
      <IndexRoute component={Dashboard}/>
      <Route path="experiments" component={props => props.children}>
        <IndexRoute component={Experiments}/>
        <Route path=":id" component={Experiment}/>
      </Route>
      <Route path="cluster" component={props => props.children}>
        <IndexRoute component={Cluster}/>
        {/*<Route path="configs" component={ClusterConfigs.Index}/>
        <Route path="configs/add" component={ClusterConfigs.Edit}/>
        <Route path="configs/:id" component={ClusterConfigs.Edit}/>*/}
      </Route>
    </Route>
  </Router>
)
