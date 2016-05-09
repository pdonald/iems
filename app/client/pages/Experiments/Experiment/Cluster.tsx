import * as React from 'react'

import Output from 'universal/experiment/Output'
import Actions from '../Experiment/Actions'

import { get, post, clone, map } from '../../../utils'
import { apiurl } from '../../../settings'

export default class Cluster extends React.Component<any, any> {
  private refreshInterval: number;
  
  constructor(props) {
    super(props)

    this.state = {
      queues: {},
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
          <p>Running in queue {this.state.running.queue.id}</p>
          <button onClick={e => this.cancel(e)}>Cancel</button>
        </div>
      )
    }

    return (
      <div>
        <select ref="queue">
          <option>- Queues -</option>
          {map(this.state.queues, (id, q) => <option key={id} value={id}>{`${q.name}`}</option>)}
        </select>
        <button onClick={e => this.run(e)}>Run</button>
      </div>
    )
  }

  load() {
    get(`${apiurl}/cluster/queues`)
      .done(queues => this.setState({ queues: queues }))
  }

  run(e) {
    return

    /* e.preventDefault()

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
      }) */
  }

  cancel(e) {
    e.preventDefault()
    // todo: post cancel
    //this.setState({ running: null })
    //this.stopChecking()
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
    //let instance = this.state.running.instance
    //get(`${apiurl}/cluster/services/${instance.service}/instances/${instance.id}/status?workdir=${this.state.running.vars.workdir}`)
      //.then(status => Actions.updateStatus(status))
  }
}
