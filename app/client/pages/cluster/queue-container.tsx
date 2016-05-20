import * as React from 'react'

import ErrorMessage from '../../components/ErrorMessage'
import Loading from '../../components/Loading'
import { get } from '../../utils'
import { apiurl } from '../../settings'

import { QueueSummary } from '../../../universal/grid/QueueSummary'

import QueueList from './queue-list'

export default class QueueContainer extends React.Component<Props, any> {
  private timer: any;
  
  constructor(props) {
    super(props)

    this.state = {
      loading: true,
      error: null,
      services: null,
      queues: null
    }
  }

  componentDidMount() {
    this.load()
    this.timer = setInterval(() => this.load(), 2000)
  }

  componentWillUnmount() {
    clearInterval(this.timer)
  }

  render() {
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

    return <QueueList queues={this.state.queues} instances={instances} />
  }

  load() {
    get(`${apiurl}/cluster/services`)
      .then(services => this.setState({ loading: false, error: null, services: services }))
      .then(x => {
          get(`${apiurl}/cluster/queues`)
            .then(queues => this.setState({ loading: false, error: null, queues: queues }))
            .then(_ => {
              if (this.props.onUpdate) {
                this.props.onUpdate(this.state.queues)
              }
            })
            .catch(err => this.setState({ loading: false, error: 'Could not load data: queues' }))
      })
      .catch(err => this.setState({ loading: false, error: 'Could not load data: services' }))
  }
}

interface Props {
  onUpdate?: (queues: { [id: string]: QueueSummary }) => void
}