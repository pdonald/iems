import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Router, Route, IndexRoute, browserHistory } from 'react-router'

import App from './pages/app'
import Dashboard from './pages/dashboard/'
import Experiments from './pages/experiments'
import Experiment from './pages/experiment'
import Cluster from './pages/cluster'
import ClusterConfigs from './pages/cluster-launch-configs'
import ClusterConfigsEdit from './pages/cluster-launch-configs/edit'

let routes = (
  <Router history={browserHistory}>
    <Route path="/" component={App}>
      <IndexRoute component={Dashboard}/>
      <Route path="experiments" component={props => props.children}>
        <IndexRoute component={Experiments}/>
        <Route path=":id" component={Experiment}/>
      </Route>
      <Route path="cluster" component={props => props.children}>
        <IndexRoute component={Cluster}/>
        <Route path="configs" component={ClusterConfigs}/>
        <Route path="configs/add" component={ClusterConfigsEdit}/>
        <Route path="configs/:id" component={ClusterConfigsEdit}/>
      </Route>
    </Route>
  </Router>
)

ReactDOM.render(routes, document.getElementById('app'))
