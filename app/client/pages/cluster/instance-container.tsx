import * as React from 'react'

import ErrorMessage from '../../components/ErrorMessage'
import Loading from '../../components/Loading'
import { get, del } from '../../utils'
import { apiurl } from '../../settings'

import InstanceList from './instance-list'

export default class InstanceContainer extends React.Component<any, any> {
  private timer: any;
  
  constructor(props) {
    super(props)

    this.state = {
      loading: true,
      error: null,
      services: null
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

    return <InstanceList instances={instances} onTerminate={i => this.terminate(i)} />
  }

  load() {
    this.refresh()
  }

  refresh() {
    get(`${apiurl}/cluster/services`)
      .then(services => this.setState({ loading: false, error: null, services: services }))
      .catch(err => this.setState({ loading: false, error: 'Could not load data: services' }))
  }
  
  terminate(instance) {
    del(`${apiurl}/cluster/services/${instance.service}/instances/${instance.id}`)
      .catch(err => this.setState({ error: 'Could not terminate instance' }))
  }
}
