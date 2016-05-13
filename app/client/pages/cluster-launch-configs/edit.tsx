import * as React from 'react'
import { Link, browserHistory } from 'react-router'

import Page from '../../components/Page'
import Table from '../../components/Table'
import Form from '../../components/Form'
import ErrorMessage from '../../components/ErrorMessage'
import Loading from '../../components/Loading'
import Notifications from '../../components/Notifications'
import { map, get, post, del } from '../../utils'
import { apiurl } from '../../settings'

export default class Edit extends React.Component<any, any> {
  constructor(props) {
    super(props)

    this.state = {
      loading: true,
      loadingError: null,
      service: null,
      config: null
    }
  }

  componentDidMount() {
    this.load()
  }

  render() {
    return (
      <Page heading="Launch Configurations">
        {this.renderContent()}
      </Page>
    )
  }

  renderContent() {
    if (this.state.loading) {
      return <Loading/>
    }

    if (this.state.loadingError) {
        return <ErrorMessage error={this.state.loadingError} retry={() => this.load()}/>
    }

    return (
      <div>
        <Notifications ref="notifications"/>
        <Form form={this.state.service.ui.configs.form} values={this.state.config}
              onSave={config => this.save(config)}
              onDelete={() => this.delete()}
              onCancel={() => this.cancel()} />
      </div>
    )
  }

  load() {
    this.setState({ loading: true, loadingError: null })

    if (!this.props.routeParams.id) {
      get(`${apiurl}/cluster/services/${this.props.location.query.service}`)
        .then(service => this.setState({ loading: false, service: service, config: { service: service.id } }))
    } else {
      get(`${apiurl}/cluster/configs/${this.props.routeParams.id}`)
        .then(config => { this.setState({ config: config }); return config })
        .then(config => get(`${apiurl}/cluster/services/${config.service}`).then(service => this.setState({ service: service })))
        .then(_ => this.setState({ loading: false }))
        .catch(err => this.setState({ loading: false, loadingError: 'Could not load data' }))
    }
  }

  save(config) {
    let notifications = this.refs['notifications'] as Notifications 
    if (config.id) {
      post(`${apiurl}/cluster/configs/${config.id}`, config)
        .then(config => this.setState({ config: config }))
        .then(_ => notifications.success(`Changes saved`, config.id))
        .catch(err => notifications.error(`Could not save changes`, config.id))
    } else {
      post(`${apiurl}/cluster/configs`, config)
        .then(config => browserHistory.push(`/cluster/configs/${config.id}`))
        .catch(err => notifications.error(`Could not save changes`, config.id))
    }
  }

  delete() {
    let config = this.state.config
    if (config.id) {
      let notifications = this.refs['notifications'] as Notifications
      del(`${apiurl}/cluster/configs/${config.id}`)
        .then(_ => browserHistory.push('/cluster/configs'))
        .catch(err => notifications.error(`Could not delete launch configuration`, config.id))
    } else {
      browserHistory.push('/cluster/configs')
    }
  }

  cancel() {
    browserHistory.push('/cluster/configs')
  }
}
