import React from 'react'
import { Link } from 'react-router'

export default class Shell extends React.Component {
  render() {
    return (
      <div className="container">
        <header id="header">
          <h1><Link to="/">iEMS</Link></h1>

          <nav>
            <ul>
              <li><Link to="/experiments">Experiments</Link></li>
              <li><Link to="/hosts">Hosts</Link></li>
              <li><Link to="/about">About</Link></li>
            </ul>
          </nav>
        </header>

        <div id="main">
          {this.props.children}
        </div>
      </div>
    )
  }
}
