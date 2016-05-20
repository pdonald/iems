import * as React from 'react'
import { Link } from 'react-router'

import Page from '../../components/Page'
import Table from '../../components/Table'
import ErrorMessage from '../../components/ErrorMessage'
import Loading from '../../components/Loading'
import Modal from '../../components/Modal'
import { map, sum, get, post, del, groupBy } from '../../utils'
import { apiurl } from '../../settings'

import InstanceContainer from './instance-container'
import QueueContainer from './queue-container'

import { QueueSummary } from '../../../universal/grid/QueueSummary'
import { JobSummary } from '../../../universal/grid/JobSummary'

import './index.less'

export default class Cluster extends React.Component<any, any> {
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
        <h2>Queues</h2>
        <QueueContainer/>
        <input type="text" ref="queueName"/>{' '}<button onClick={e => this.addQueue(e)}>Add queue</button>

        <h2>Hosts</h2>
        <InstanceContainer/>
        {/* todo: show also if other non-iems ec2 instances are running */}
        <div>
          <select ref="config">
            {map(this.state.configs, (id, config: any) => (
              <option key={id} value={id}>{config.name}</option>
            ))}
          </select>{' '}
          <input type="text" ref="count" style={{width:'20px','textAlign':'center'}} defaultValue="1"/>{' '}
          <button onClick={() => this.launch()}>Launch</button>{' '}
          <Link to="/cluster/configs">Launch configurations</Link>
        </div>
      </div>
    )
  }
  
  load() {
    this.setState({ loading: true, error: null })

    get(`${apiurl}/cluster/configs`)
      .then(configs => this.setState({ loading: false, configs: configs }))
      .catch(err => this.setState({ loading: false, error: 'Could not load data: configs' }))
  }

  launch() {
    let configRef = this.refs['config'] as any
    let countRef = this.refs['count'] as any
    let config = this.state.configs[configRef.value]
    let count = parseInt(countRef.value)

    post(`${apiurl}/cluster/services/${config.service}/launch?config=${config.id}&count=${count}`)
      .catch(err => this.setState({ error: 'Could not launch' }))
  }
  
  addQueue(e) {
    e.preventDefault()

    let queueRef = this.refs['queueName'] as HTMLInputElement
    let name = queueRef.value.trim()
    queueRef.value = ''

    if (name.length) {
      post(`${apiurl}/cluster/queues`, { name: name })
    }
  }
}
