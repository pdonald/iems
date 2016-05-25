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

export default class QueueList extends React.Component<Props, any> {
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
    
    function mapState(state) {
      if (state == 'stopped') return 'pending'
      return state
    }

    let rows = map(this.props.queues, (key: string, q: QueueSummary) => {
      let jobs = groupBy(Object.keys(q.jobs).map(k => q.jobs[k]), j => mapState(j.state))
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
        <Table columns={columns} rows={rows} />
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
      <Modal width={800} height={500} onClose={() => this.setState({ selectedQueue: null })} className="modal">
        <h1>
          {q.name} queue hosts
          <i className="close-button fa fa-remove" onClick={() => this.setState({ selectedQueue: null })}/>
        </h1>
        <table className="cool-table">
        <thead>
          <tr>
            <th>Host</th>
            <th>Slots</th>
          </tr>
        </thead>
        <tbody>
          {this.props.instances.map(host => (
            <tr key={host.id}>
              <td>{host.id}</td>
              <td><input type="text"
                    defaultValue={typeof this.state.slots[q.id+host.id] != 'undefined' ? this.state.slots[q.id+host.id] : (q.hosts[host.id] && q.hosts[host.id].slots || 0)}
                    onChange={e => this.state.slots[q.id+host.id] = +(e.target as HTMLInputElement).value}
                    style={{width: '20px', textAlign: 'center'}}/></td>
            </tr>
          ))}
        </tbody>
        </table>
        <p>
          <button onClick={() => this.update(q) || this.setState({ selectedQueue: null })}>Save</button>
        </p>
      </Modal>
    )
  }
  
  renderJobsModal() {
    if (!this.state.selectedQueueJobs) return
    let q: QueueSummary = this.props.queues[this.state.selectedQueueJobs]
    if (!q) return
    
    let columns = {
      experiment: { title: 'Experiment' },
      jobname: { title: 'Process name' },
      logs: { title: 'Logs', sortable: false },
      status: { title: 'Status' },
      actions: { title: 'Actions', sortable: false }
    }
    
    let rows = map(q.jobs, (key, j) => ({
      job: j,
      experiment: j.tags['expname'] || j.tags['expid'],
      jobname: j.name,
      logs: (
        <span>
          <a href={`${apiurl}/cluster/file?host=${j.tags['host']}&filename=${j.tags['stdout']}&size=${100*1024}&raw`} target="_blank">stdout</a>
          {' '}
          <a href={`${apiurl}/cluster/file?host=${j.tags['host']}&filename=${j.tags['stderr']}&size=${100*1024}&raw`} target="_blank">stderr</a>
        </span>
      ) ,
      status: <span className={'state state-' + this.jobstate(j)}>{this.jobstate(j)}</span>,
      actions: (
        <span>
          <a onClick={_ => this.stopJob(q.id, j.id)}>Stop</a>
          {' '}
          <a onClick={_ => this.resetJob(q.id, j.id)}>Reset</a>
          {' '}
          <a onClick={_ => this.deleteJob(q.id, j.id)}>Delete</a>
        </span>
      )
    }))
    
    return (
      <Modal width={800} height={500} onClose={() => this.setState({ selectedQueueJobs: null })} className="modal">
        <h1>
          {q.name} jobs
          <i className="close-button fa fa-remove" onClick={() => this.setState({ selectedQueueJobs: null })}/>
        </h1>
        <Table columns={columns} rows={rows} id={row => row.job.id} />
      </Modal>
    )
  }
  
  jobstate(job: JobSummary): string {
    if (job.globalState == 'error') return job.state == 'error' ? 'error' : 'deperror'
    if (job.globalState == 'stopped') return job.state == 'stopped' ? 'stopped' : 'depstopped'
    return job.globalState
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
  
  stopJob(qid, jid) {
    post(`${apiurl}/cluster/queues/${qid}/jobs/${jid}/stop`)
  }
  
  resetJob(qid, jid) {
    post(`${apiurl}/cluster/queues/${qid}/jobs/${jid}/reset`)
  }
  
  deleteJob(qid, jid) {
    post(`${apiurl}/cluster/queues/${qid}/jobs/${jid}/delete`)
  }
}

interface Props {
  queues: { [id: string]: QueueSummary }
  instances: any[]
}
