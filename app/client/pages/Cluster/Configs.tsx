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

export class Index extends React.Component<any, any> {
  constructor(props) {
    super(props)

    this.state = {
      loading: null,
      loadingError: null,
      services: null
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
        {this.renderList()}
      </div>
    )
  }

  renderList() {
    const buttons = [
      { title: 'Clone', handler: config => this.clone(config) },
      { title: 'Edit', handler: config => this.edit(config) },
      { title: 'Delete', handler: config => this.delete(config) },
    ]

    return map(this.state.services, (key, service) => (
      <section key={key} className={'service-' + key}>
        <h2>{service.title}</h2>
        {!service.info.installed && <p className="alert alert-warning">{service.title} is not available.
                                        Please read the setup instructions in the Readme file.</p>}
        <Table columns={service.ui.configs.columns}
               rows={map(this.state.configs, (key, config) => config).filter(config => config.service == key)}
               buttons={buttons}
               emptyText={<span>No configurations created yet.</span>} />
       <Link to={`/cluster/configs/add?service=${key}`}><button className="button-create">Create</button></Link>
      </section>
    ))
  }

  load() {
    this.setState({ loading: true, loadingError: null })

    get(`${apiurl}/cluster/services`)
      .then(services => this.setState({ services: services }))
      .then(_ =>get(`${apiurl}/cluster/configs`).then(configs => this.setState({ configs: configs })))
      .done(_ => this.setState({ loading: false }))
      .fail(err => this.setState({ loading: false, loadingError: 'Could not load launch configurations' }))
  }

  edit(config) {
    browserHistory.push(`/cluster/configs/${config.id}`)
  }

  clone(config) {
    post(`${apiurl}/cluster/configs/${config.id}/clone`, config)
      .done(config => browserHistory.push(`/cluster/configs/${config.id}`))
      .fail(err => this.refs.notifications.error(`Could not clone ${config.name}`, config.id))
  }

  delete(config) {
    del(`${apiurl}/cluster/configs/${config.id}`)
      .then(_ => this.refs.notifications.success(`Deleted ${config.name}`, config.id))
      .done(_ => this.load())
      .fail(err => this.refs.notifications.error(`Could not delete ${config.name}`, config.id))
  }
}

export class Edit extends React.Component<any, any> {
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
        .done(_ => this.setState({ loading: false }))
        .fail(err => this.setState({ loading: false, loadingError: 'Could not load data' }))
    }
  }

  save(config) {
    if (config.id) {
      post(`${apiurl}/cluster/configs/${config.id}`, config)
        .then(config => this.setState({ config: config }))
        .done(_ => this.refs.notifications.success(`Changes saved`, config.id))
        .fail(err => this.refs.notifications.error(`Could not save changes`, config.id))
    } else {
      post(`${apiurl}/cluster/configs`, config)
        .then(config => browserHistory.push(`/cluster/configs/${config.id}`))
        .fail(err => this.refs.notifications.error(`Could not save changes`, config.id))
    }
  }

  delete() {
    let config = this.state.config
    if (config.id) {
      del(`${apiurl}/cluster/configs/${config.id}`)
        .done(_ => browserHistory.push('/cluster/configs'))
        .fail(err => this.refs.notifications.error(`Could not delete launch configuration`, config.id))
    } else {
      browserHistory.push('/cluster/configs')
    }
  }

  cancel() {
    browserHistory.push('/cluster/configs')
  }
}
