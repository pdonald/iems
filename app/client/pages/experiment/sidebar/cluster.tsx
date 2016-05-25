import * as React from 'react'
import * as PureRenderMixin from 'react-addons-pure-render-mixin'

import Output from '../../../../universal/experiment/Output'
import { QueueSummary } from '../../../../universal/grid/QueueSummary'
import Actions from '../actions'
import Block from './block'
import QueueContainer from '../../cluster/queue-container'

import { get, post, clone, map } from '../../../utils'
import { apiurl } from '../../../settings'

export default class Cluster extends React.Component<any, any> {
  constructor(props) {
    super(props)

    this.state = {
      queues: {}
    }
  }
  
  /* shouldComponentUpdate() {
    return PureRenderMixin.shouldComponentUpdate.apply(this, arguments);
  } */

  componentDidMount() {
    this.load()
  }

  render() {
    return (
      <Block name="cluster" title="Cluster">
        {this.renderContent()}
      </Block>
    )
  }

  renderContent() {
    let queueCount = Object.keys(this.state.queues).length
    return (
      <div>
        <select ref="queue">
          <option value="">- Queues -</option>
          {map(this.state.queues, (id, q: QueueSummary) => <option key={id} value={id} selected={queueCount == 1}>{`${q.name}`}</option>)}
        </select>
        <button onClick={e => this.run(e)}>Run</button>
        <QueueContainer onUpdate={queues => this.updateStatus(queues)}/>
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
  
  updateStatus(queues: { [id: string]: QueueSummary }) {
    var status = {}
    for (let qid in queues) {
      for (let hash in queues[qid].jobs) {
        let job = queues[qid].jobs[hash]
        status[hash] = job.globalState
      }
    }
    Actions.updateStatus(status, queues)
  }
}
