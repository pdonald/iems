import React from 'react'
import { Link } from 'react-router'

export default class Shell extends React.Component {
  render() {
    return (
      <div id="container">
        <header id="header">
          <h1><Link to="/">iEMS</Link></h1>

          <nav>
            <ul>
              <li><Link to="/experiments" activeClassName="active">Experiments</Link></li>
              <li><Link to="/hosts" activeClassName="active">Hosts</Link></li>
              <li><Link to="/about" activeClassName="active">About</Link></li>
            </ul>
          </nav>
        </header>

        <main>
          {this.props.children}
        </main>
      </div>
    )
  }
}
