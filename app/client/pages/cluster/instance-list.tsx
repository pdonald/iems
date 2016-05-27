import * as React from 'react'

import Table from '../../components/Table'

export default class InstanceList extends React.Component<Props, {}> {
  render() {
    let columns = {
      config: { title: 'Launch Config' },
      id: { title: 'ID' },
      state: { title: 'State' },
      ssh: { title: 'SSH' },
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
        ssh: instance.ssh ? instance.ssh.state : 'n/a',
        config: instance.config ? instance.config.name : 'n/a',
        loadavg: instance.stats && instance.stats.cpu.loadavg && instance.stats.cpu.loadavg.join(' '),
        cores: instance.stats && instance.stats.cpu.cores,
        ram: instance.stats && instance.stats.memory.ram ? this.format(instance.stats.memory.ram.used) + ' / ' + this.format(instance.stats.memory.ram.total) : null,
        swap: instance.stats && instance.stats.memory.swap ? this.format(instance.stats.memory.swap.used) + ' / ' + this.format(instance.stats.memory.swap.total) : null,
        disk: instance.stats && instance.stats.memory.disk ? this.format(instance.stats.memory.disk.used) + ' / ' + this.format(instance.stats.memory.disk.total) : null,
        uptime: instance.stats && this.formatElapsed(instance.stats.uptime.boot),
        instance: instance
      }
    })

    let buttons = []
    if (this.props.onTerminate) {
      buttons.push({ title: 'Terminate', handler: row => this.props.onTerminate(row.instance) })
    }
    
    if (!buttons.length) buttons = null

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

interface Props {
  instances: any[]
  onTerminate?: Function
}