import React from 'react'
import { Link } from 'react-router'

import { Page, Loading, ErrorMessage, Table } from './Page'
import { map, get, post, del } from '../utils'

let url = "http://localhost:8081/api"

export default class Cluster extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      loading: true,
      error: null,
      configs: null,
      services: null,
      modal: { open: false }
    }
  }

  componentDidMount() {
    this.load()
    this.refresh()
    this.timer = setInterval(() => this.refresh(), 5000)
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

        <h2>Machines</h2>
        {this.renderInstances()}
        {this.renderLogs()}

        // show also if other non-iems ec2 instances are running
      </div>
    )
  }

  renderInstances() {
    return map(this.state.services, (key, service) => (
      <Instances key={key} instances={service.instances} onTerminate={instance => this.terminate(instance)} />
    ))
  }

  renderLogs() {
    return
    return (
      <div className={'modal ' + (this.state.modal.open ? 'open' : 'closed')}>
        <div className="modal-header">
          <button onClick={() => this.setState({ modal: { open: false } })}>Close</button>
          <h1>{this.state.modal.title}</h1>
        </div>
        <pre>{this.state.modal.content}</pre>
      </div>
    )
  }

  load() {
    this.setState({ loading: true, error: null })

    get(`${url}/cluster/configs`)
      .done(configs => this.setState({ loading: false, configs: configs }))
      .fail(err => this.setState({ loading: false, error: 'Could not load data' }))
  }

  refresh() {
    get(`${url}/cluster/services`)
      .done(services => this.setState({ services: services }))
      .fail(err => this.setState({ error: 'Could not load data' }))
  }

  launch() {
    let config = this.state.configs[this.refs.config.value]
    let count = parseInt(this.refs.count.value)
    console.log('launching', config, count, 'times')

    post(`${url}/cluster/services/${config.service}/configs/${config.id}/launch`)
      .fail(err => this.setState({ error: 'Could not launch' }))
  }

  terminate(instance) {
    del(`${url}/cluster/services/${instance.service}/instances/${instance.id}`)
      .fail(err => this.setState({ error: 'Could not terminate instance' }))
  }
}

class Instances extends React.Component {
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
      cores: { title: 'vCPU' },
      ram: { title: 'RAM' },
      swap: { title: 'Swap' },
      disk: { title: 'Disk' },
    }

    let instances = this.props.instances.map(instance => {
      return {
        id: instance.id,
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

    return (
      <Table columns={columns} data={instances} buttons={buttons} />
    )
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
    if (hours   < 10) hours   = "0" + hours
    if (minutes < 10) minutes = "0" + minutes
    return hours + ':' + minutes
  }
}
