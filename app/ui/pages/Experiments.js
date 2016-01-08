import React from 'react'
import { Link } from 'react-router'

import data from '../data'

export default class Experiments extends React.Component {
  constructor() {
    super()
    this.state = Object.keys(data.experiments).map(key => data.experiments[key])
  }

  render() {
    return (
      <div className="page">
        <h1>Experiments</h1>

        <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {this.state.map(e => (
            <tr key={e.id}>
              <td><Link to={`/experiments/${e.id}`}>{e.title}</Link></td>
              <td>Running</td>
              <td>Run Delete</td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    )
  }
}
