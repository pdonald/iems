import React from 'react'
import { Link } from 'react-router'

export default class Hosts extends React.Component {
  render() {
    return (
      <article className="page" id="hosts">
        <h1>Cluster</h1>

        <p><Link to="/cluster/configs">Launch configurations</Link></p>

        <div>
          <select>
            <optgroup label="AWS EC2">
              <option>Spot 2vCPU/15GB - $0.04/h</option>
              <option>Spot 4vCPU/30GB - $0.10/h</option>
              <option>Spot 8vCPU/60GB - $0.20/h</option>
              <option>Spot 12vCPU/122GB - $0.40/h</option>
              <option>Spot 12vCPU/240GB - $0.60/h</option>
            </optgroup>
          </select>{' '}
          <input type="text" style={{width:'20px','textAlign':'center'}} value="1"/>{' '}
          <input type="submit" value="Launch"/>
        </div>

        <p>Table of instances... IP/uptime/specs(ram/cpus/disk)/usage graph/how much $$ so far</p>
      </article>
    )
  }
}
