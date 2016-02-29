import * as React from 'react'

export default class Dashboard extends React.Component<any, any> {
  render() {
    return (
      <article className="page">
        <h1>Dashboard</h1>
        <p>Overview of experiments</p>
        <p>Overview of available hosts</p>
      </article>
    )
  }
}
