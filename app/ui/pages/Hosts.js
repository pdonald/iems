import React from 'react'

export default class Hosts extends React.Component {
  render() {
    return (
      <article className="page">
        <h1>Hosts</h1>

        <p>Launch (select configuration) (num of instances) instances</p>
        <p>Table of instances... IP/uptime/specs(ram/cpus/disk)/usage graph/how much $$ so far</p>
        <p>Create launch configurations</p>
      </article>
    )
  }
}
