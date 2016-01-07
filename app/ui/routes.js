import React from 'react'
import { Router, Route, browserHistory } from 'react-router'

import App from './pages/App'
import Experiments from './pages/Experiments'
import Experiment from './pages/Experiment'
import Hosts from './pages/Hosts'
import About from './pages/About'

export default (
  <Router history={browserHistory}>
    <Route path="/" component={App}>
      <Route path="experiments" component={Experiments}/>
      <Route path="experiments/:id" component={Experiment}/>
      <Route path="hosts" component={Hosts}/>
      <Route path="about" component={About}/>
    </Route>
  </Router>
)
