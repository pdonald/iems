import React from 'react'
import { Link } from 'react-router'

import { Page, Loading, ErrorMessage } from './Page'
import { map, get, post } from '../utils'

let url = "http://localhost:8081/api"

export default class Cluster extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      loading: true,
      error: null,
      configs: null
    }
  }

  componentDidMount() {
    this.load()
  }

  render() {
    return (
      <Page heading="Cluster">
        {this.renderContent()}
      </Page>
    )
  }

  renderContent() {
    if (this.state.loading) {
      return <Loading/>
    }

    if (this.state.error) {
        return <ErrorMessage error={this.state.error} retry={() => this.load()}/>
    }

    return (
      <div>
        <div>
          <select ref="config">
            {this.state.configs.map((config, index) => (
              <option key={config.service+'/'+config.id} value={index}>{config.name}</option>
            ))}
          </select>{' '}
          <input type="text" ref="count" style={{width:'20px','textAlign':'center'}} defaultValue="1"/>{' '}
          <button onClick={() => this.launch()}>Launch</button>{' '}
          <Link to="/cluster/configs">Launch configurations</Link>
        </div>

        <p>Table of instances... IP/uptime/specs(ram/cpus/disk)/usage graph/how much $$ so far</p>
      </div>
    )
  }

  load() {
    this.setState({ loading: true, error: null })

    get(`${url}/cluster/configs`)
      .done(configs => this.setState({ loading: false, configs: configs }))
      .fail(err => this.setState({ loading: false, error: 'Could not load data' }))
  }

  launch() {
    let config = this.state.configs[this.refs.config.value]
    let count = parseInt(this.refs.count.value)
    console.log('launching', config, count, 'times')

    post(`${url}/cluster/services/${config.service}/configs/${config.id}/launch`)
      .fail(err => this.setState({ error: 'Could not launch' }))
  }
}
