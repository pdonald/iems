import * as React from 'react'
import * as PureRenderMixin from 'react-addons-pure-render-mixin'

import Output from '../../../../universal/experiment/Output'
import { QueueSummary } from '../../../../universal/grid/QueueSummary'
import Actions from '../actions'
import Block from './block'

import { get, post, clone, map } from '../../../utils'
import { apiurl } from '../../../settings'

export default class Cluster extends React.Component<any, any> {
  private refreshInterval: any;
  
  constructor(props) {
    super(props)

    this.state = {
      queues: {},
      running: null
    }
  }
  
  /* shouldComponentUpdate() {
    return PureRenderMixin.shouldComponentUpdate.apply(this, arguments);
  } */

  componentDidMount() {
    this.load()
  }

  componentWillUnmount() {
    this.stopChecking()
  }

  render() {
    return (
      <Block name="cluster" title="Cluster">
        {this.renderChildren()}
      </Block>
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
          <option value="">- Queues -</option>
          {map(this.state.queues, (id, q: QueueSummary) => <option key={id} value={id}>{`${q.name}`}</option>)}
        </select>
        <button onClick={e => this.run(e)}>Run</button>
      </div>
    )
  }

  load() {
    get(`${apiurl}/cluster/queues`)
      .then(queues => this.setState({ queues: queues }))
  }

  run(e) {
    e.preventDefault()

    let queueID = (this.refs['queue'] as HTMLSelectElement).value
    if (queueID) {
      let jobs = JSON.parse(Output.JobSpec(this.props.doc.stack[0]))
      post(`${apiurl}/cluster/queues/${queueID}/submit`, jobs)
    }
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
