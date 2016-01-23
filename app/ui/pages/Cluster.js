import React from 'react'
import { Link } from 'react-router'

import { Page, Loading, ErrorMessage, Table } from './Page'
import { map, get, post } from '../utils'

let url = "http://localhost:8081/api"

export default class Cluster extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      loading: true,
      error: null,
      configs: null,
      services: null
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

        {this.renderInstances()}
      </div>
    )
  }

  renderInstances() {
    return map(this.state.services, (key, service) => (
      <section key={key} className={'service-' + key}>
        <h2>{service.name}</h2>
        {service.id == 'awsec2' && <AwsEc2Instances instances={service.instances} />}
      </section>
    ))
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
}

class AwsEc2Instances extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    let columns = {
      config: { title: 'Launch Config' },
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
        state: instance.state,
        config: instance.config.name,
        loadavg: instance.stats.cpu.loadavg && instance.stats.cpu.loadavg.join(' '),
        cores: instance.stats.cpu.cores,
        ram: instance.stats.memory.ram ? this.format(instance.stats.memory.ram.used) + ' / ' + this.format(instance.stats.memory.ram.total) : null,
        swap: instance.stats.memory.swap ? this.format(instance.stats.memory.swap.used) + ' / ' + this.format(instance.stats.memory.swap.total) : null,
        disk: instance.stats.memory.disk ? this.format(instance.stats.memory.disk.used) + ' / ' + this.format(instance.stats.memory.disk.total) : null,
        uptime: this.formatElapsed(instance.stats.uptime.boot)
      }
    })

    return (
      <Table columns={columns} data={instances} />
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
