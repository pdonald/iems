import * as React from 'react'
import { Link } from 'react-router'

import Page from '../../components/Page'
import Table from '../../components/Table'
import ErrorMessage from '../../components/ErrorMessage'
import Loading from '../../components/Loading'
import Modal from '../../components/Modal'
import { map, sum, get, post, del, groupBy } from '../../utils'
import { apiurl } from '../../settings'

import { QueueSummary } from '../../../universal/grid/QueueSummary'
import { JobSummary } from '../../../universal/grid/JobSummary'

import './index.less'

export default class Cluster extends React.Component<any, any> {
  private timer: any;
  
  constructor(props) {
    super(props)

    this.state = {
      loading: true,
      error: null,
      configs: null,
      services: null,
      queues: null
    }
  }

  componentDidMount() {
    this.load()
    this.refresh()
    this.timer = setInterval(() => this.refresh(), 2000)
  }

  componentWillUnmount() {
    clearInterval(this.timer)
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

    let instances = []
    for (let service in this.state.services) {
      for (let instance of this.state.services[service].instances) {
        instances.push(instance)
      }
    }

    return (
      <div>
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

        {this.renderQueues(this.state.queues, instances)}
        {this.renderInstances(instances)}
        {/*show also if other non-iems ec2 instances are running*/}
      </div>
    )
  }

  renderQueues(queues, instances) {
    return <Queues queues={queues} instances={instances} />
  }

  renderInstances(instances) {
    if (instances.length == 0) {
      return null
    }

    return (
      <div>
        <h2>Hosts</h2>
        <Instances instances={instances} onTerminate={instance => this.terminate(instance)} />
      </div>
    )
  }

  load() {
    this.setState({ loading: true, error: null })

    get(`${apiurl}/cluster/configs`)
      .then(configs => this.setState({ loading: false, configs: configs }))
      .catch(err => this.setState({ loading: false, error: 'Could not load data: configs' }))
  }

  refresh() {
    get(`${apiurl}/cluster/services`)
      .then(services => this.setState({ services: services }))
      .catch(err => this.setState({ error: 'Could not load data: services' }))

    get(`${apiurl}/cluster/queues`)
      .then(queues => this.setState({ queues: queues }))
      .catch(err => this.setState({ error: 'Could not load data: queues, ' + err }))
  }

  launch() {
    let configRef = this.refs['config'] as any
    let countRef = this.refs['count'] as any
    let config = this.state.configs[configRef.value]
    let count = parseInt(countRef.value)

    post(`${apiurl}/cluster/services/${config.service}/launch?config=${config.id}&count=${count}`)
      .catch(err => this.setState({ error: 'Could not launch' }))
  }

  terminate(instance) {
    del(`${apiurl}/cluster/services/${instance.service}/instances/${instance.id}`)
      .catch(err => this.setState({ error: 'Could not terminate instance' }))
  }
}

class Instances extends React.Component<any, any> {
  constructor(props) {
    super(props)
  }

  render() {
    let columns = {
      config: { title: 'Launch Config' },
      id: { title: 'ID' },
      state: { title: 'State' },
      uptime: { title: 'Uptime' },
      loadavg: { title: 'Load Avg.' },
      cores: { title: 'Cores' },
      ram: { title: 'RAM' },
      swap: { title: 'Swap' },
      disk: { title: 'Disk' },
    }

    let instances = this.props.instances.map(instance => {
      return {
        id: instance.id,
        service: instance.service,
        state: instance.state,
        config: instance.config.name,
        loadavg: instance.stats && instance.stats.cpu.loadavg && instance.stats.cpu.loadavg.join(' '),
        cores: instance.stats && instance.stats.cpu.cores,
        ram: instance.stats && instance.stats.memory.ram ? this.format(instance.stats.memory.ram.used) + ' / ' + this.format(instance.stats.memory.ram.total) : null,
        swap: instance.stats && instance.stats.memory.swap ? this.format(instance.stats.memory.swap.used) + ' / ' + this.format(instance.stats.memory.swap.total) : null,
        disk: instance.stats && instance.stats.memory.disk ? this.format(instance.stats.memory.disk.used) + ' / ' + this.format(instance.stats.memory.disk.total) : null,
        uptime: instance.stats && this.formatElapsed(instance.stats.uptime.boot),
        instance: instance
      }
    })

    let buttons = [
      //{ title: 'Reprovision', handler: instance => this.reprovision(instance) },
      { title: 'Terminate', handler: row => this.props.onTerminate(row.instance) },
    ]

    return <Table columns={columns} rows={instances} buttons={buttons} id={row => row.service + '/' + row.id} />
  }

  format(bytes) {
    function round(n, d = 0) { let p = Math.pow(10, d); return Math.round(n*p)/p; }
    if (bytes < 1024) return bytes + 'B'
    if (bytes < 1024*1024) return round(bytes/1024) + 'KB'
    if (bytes < 1024*1024*1024) return round(bytes/1024/1024) + 'MB'
    if (bytes < 1024*1024*1024*1024) return round(bytes/1024/1024/1024, 1) + 'GB'
    if (bytes < 1024*1024*1024*1024*1024) return round(bytes/1024/1024/1024/1024, 2) + 'TB'
    return 'too much'
  }

  formatElapsed(sec_num) {
    let hours   = Math.floor(sec_num / 3600)
    let minutes = Math.floor((sec_num - (hours * 3600)) / 60)
    let seconds = sec_num - (hours * 3600) - (minutes * 60)
    return (hours < 10 ? "0" + hours : hours) + ':' + (minutes < 10 ? "0" + minutes : minutes)
  }
}

class Queues extends React.Component<any, any> {
  constructor(props) {
    super(props)

    this.state = {
      slots: {},
      selectedQueue: null,
      selectedQueueJobs: null
    }
  }

  render() {
    let columns = {
      name: { title: 'Name' },
      slots: { title: 'Slots', sortable: false },
      jobs: { title: 'Jobs', sortable: false }
    }

    let rows = map(this.props.queues, (key: string, q: QueueSummary) => {
      let jobs = groupBy(Object.keys(q.jobs).map(k => q.jobs[k]), j => j.state)
      let states = ['pending', 'running', 'finished', 'error']
      return {
        queue: q,
        name: (
          <div className="action-buttons-container">
            {q.name}
            <span className="action-buttons">
              <a onClick={_ => this.delete(q)}><i className="fa fa-remove"></i></a>
            </span>
          </div>
        ),
        jobs: (
          <div onClick={_ => this.setState({ selectedQueueJobs: q.id })} className="clickable">
            {states.map(state => <span key={state} title={state} className={'state state-' + state}>{jobs[state] ? jobs[state].length : 0}</span>)}
          </div>
        ),
        slots: (
          <div onClick={_ => this.setState({ selectedQueue: q.id })} className="clickable">
            {sum(q.jobs, j => 1, j => j.state == 'running') + ' / ' + sum(q.hosts, h => h.slots)}
          </div>
        )
      }
    })
    
    return (
      <div>
        <h2>Queues</h2>
        <Table columns={columns} rows={rows} />
        <input type="text" ref="queueName"/>{' '}<button onClick={e => this.add(e)}>Add queue</button>
        {this.renderSlotsModal()}
        {this.renderJobsModal()}
      </div>
    )
  }
  
  renderSlotsModal() {
    if (!this.state.selectedQueue) return
    let q: QueueSummary = this.props.queues[this.state.selectedQueue]
    if (!q) return
    return (
      <Modal width={800} height={500} style={{background: '#fff'}} onClose={() => this.setState({ selectedQueue: null })}>
        <h1>{q.name} queue hosts</h1>
        <ul className="reset">
          {this.props.instances.map(host => (
            <li key={host.id}>
              <input type="text"
                defaultValue={typeof this.state.slots[q.id+host.id] != 'undefined' ? this.state.slots[q.id+host.id] : (q.hosts[host.id] && q.hosts[host.id].slots || 0)}
                onChange={e => this.state.slots[q.id+host.id] = +(e.target as HTMLInputElement).value}
                style={{width: '20px', textAlign: 'center'}}/>
              {' '}
              <label>{host.id}</label>
            </li>
          ))}
        </ul>
        <button onClick={() => this.update(q) || this.setState({ selectedQueue: null })}>Save</button>
      </Modal>
    )
  }
  
  renderJobsModal() {
    if (!this.state.selectedQueueJobs) return
    let q: QueueSummary = this.props.queues[this.state.selectedQueueJobs]
    if (!q) return
    return (
      <Modal width={800} height={500} style={{background: '#fff'}} onClose={() => this.setState({ selectedQueueJobs: null })}>
        <h1>{q.name} jobs</h1>
        <ul className="reset">
          {map(q.jobs, (key, j) => (
            <li key={j.id} className={'state state-' + this.jobstate(j)}>
              {j.name}
              {' '}
              ({this.jobstate(j)})
              <a onClick={_ => this.cancelJob(q.id, j.id)}>cancel</a> 
              <a onClick={_ => this.resetJob(q.id, j.id)}>reset</a>
            </li>
          ))}
        </ul>
        <button onClick={() => this.setState({ selectedQueueJobs: null })}>Close</button>
      </Modal>
    )
  }
  
  jobstate(job: JobSummary): string {
    if (job.globalState == 'error') return job.state == 'error' ? 'error' : 'deperror'
    if (job.globalState == 'canceled') return job.state == 'canceled' ? 'canceled' : 'depcanceled'
    return job.globalState
  }

  add(e) {
    e.preventDefault()

    let queueRef = this.refs['queueName'] as HTMLInputElement
    let name = queueRef.value.trim()
    queueRef.value = ''

    if (name.length) {
      post(`${apiurl}/cluster/queues`, { name: name })
    }
  }

  update(q) {
    var hosts = {}

    this.props.instances.forEach(host => {
      hosts[host.id] = typeof this.state.slots[q.id+host.id] != 'undefined' ?
        this.state.slots[q.id+host.id] : (q.hosts[host.id] && q.hosts[host.id].slots || 0)
    })

    post(`${apiurl}/cluster/queues/${q.id}`, hosts)
  }

  delete(queue) {
    del(`${apiurl}/cluster/queues/${queue.id}`)
  }
  
  cancelJob(qid, jid) {
    post(`${apiurl}/cluster/queues/${qid}/jobs/${jid}/cancel`)
  }
  
  resetJob(qid, jid) {
    post(`${apiurl}/cluster/queues/${qid}/jobs/${jid}/reset`)
  }
}
