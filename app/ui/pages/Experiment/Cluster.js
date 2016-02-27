import React from 'react'

import Output from '../Experiment/model/Output'
import Actions from '../Experiment/Actions'

import { get, post, clone } from '../../utils'
import { apiurl } from '../../settings'

export default class Cluster extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      instances: [],
      running: null
    }
  }

  componentDidMount() {
    this.load()
  }

  componentWillUnmount() {
    this.stopChecking()
  }

  render() {
    return (
      <div>
        <h2>Cluster</h2>
        {this.renderChildren()}
      </div>
    )
  }

  renderChildren() {
    if (this.state.running) {
      return (
        <div>
          <p>Running on {this.state.running.instance.id}</p>
          <button onClick={e => this.cancel(e)}>Cancel</button>
        </div>
      )
    }

    return (
      <div>
        <select ref="instance">
          <option>- Launch configurations -</option>
          {this.state.instances.map((instance, i) => instance.state == 'running' ? <option key={i} value={i}>{`${instance.config.name} - ${instance.id} [${instance.state}]`}</option> : null)}
        </select>
        <button onClick={e => this.run(e)}>Run</button>
      </div>
    )
  }

  load() {
    get(`${apiurl}/cluster/services`)
      .done(services => {
        let instances = []
        for (let sid in services) {
          for (let instance of services[sid].instances) {
            instances.push(instance)
          }
        }
        this.setState({ instances: instances })
      })
  }

  run(e) {
    e.preventDefault()

    let instance = this.state.instances[this.refs.instance.value]
    let makefile = Output.Makefile(this.props.doc.stack[0])

    let data = {
      vars: this.props.doc.vars,
      makefile: makefile
    }

    post(`${apiurl}/cluster/services/${instance.service}/instances/${instance.id}/exec`, data)
      .then(_ => {
        this.setState({ running: { instance: instance, vars: clone(data.vars) } })
        this.startChecking()
      })
  }

  cancel(e) {
    e.preventDefault()
    // todo: post cancel
    this.setState({ running: null })
    this.stopChecking()
  }

  startChecking() {
    this.refreshInterval = setInterval(() => this.checkStatus(), 1000)
  }

  stopChecking() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = null
    }
  }

  checkStatus() {
    let instance = this.state.running.instance
    get(`${apiurl}/cluster/services/${instance.service}/instances/${instance.id}/status?workdir=${this.state.running.vars.workdir}`)
      .then(status => Actions.updateStatus(status))
  }
}
