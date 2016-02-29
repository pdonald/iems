import * as React from 'react'
import { Router, Route, IndexRoute, browserHistory } from 'react-router'

import App from './pages/App'
import Dashboard from './pages/Dashboard'

import Experiments from './pages/Experiments'
//import Experiment from './pages/Experiment'

//import ClusterIndex from './pages/Cluster/Index'
//import * as ClusterConfigs from './pages/Cluster/Configs'

export default (
  <Router history={browserHistory}>
    <Route path="/" component={App}>
      <IndexRoute component={Dashboard}/>
      <Route path="experiments" component={Container}>
        <IndexRoute component={Experiments}/>
      </Route>
    </Route>
  </Router>
)

class Container extends React.Component<any, any> {
  render() {
    return this.props.children
  }
}
