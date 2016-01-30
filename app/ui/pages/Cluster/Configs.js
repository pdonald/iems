import React from 'react'
import { browserHistory } from 'react-router'

import { Page, Loading, ErrorMessage, Table, Form } from '../Page'
import { map, get, post, del } from '../../utils'
import { apiurl } from '../../settings'

export class Index extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      loading: null,
      error: null,
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

    if (this.state.error) {
        return <ErrorMessage error={this.state.error} retry={() => this.load()}/>
    }

    return this.renderList()
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
        <Table columns={service.ui.configs.columns}
               data={map(service.configs, (key, config) => config)} buttons={buttons}
               emptyText="No configurations created yet" />
      </section>
    ))
  }

  load() {
    this.setState({ loading: true, error: null })

    get(`${apiurl}/cluster/services`)
      .then(services => this.setState({ loading: false, services: services }))
      .fail(err => this.setState({ loading: false, error: 'Could not load data' }))
  }

  edit(config) {
    browserHistory.push(`/cluster/configs/${config.service}/${config.id}`)
  }

  clone(config) {
    console.log('cloning', config)
    post(`${apiurl}/cluster/services/${config.service}/configs`, config)
      .done(config => browserHistory.push(`/cluster/configs/${config.service}/${config.id}`))
      .fail(err => this.setState({ error: `Could not clone ${config.name}` }))
  }

  delete(config) {
    del(`${apiurl}/cluster/services/${config.service}/configs/${config.id}`)
      .done(_ => this.load())
      .fail(err => this.setState({ error: `Could not delete ${config.name}` }))
  }
}

export class Edit extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      loading: true,
      error: null,
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

    if (this.state.error) {
        return <ErrorMessage error={this.state.error} retry={() => this.load()}/>
    }

    return (
      <Form form={this.state.service.ui.configs.form} values={this.state.config}
            onSave={config => this.save(config)}
            onDelete={() => this.delete()}
            onCancel={() => this.cancel()} />
    )
  }

  load() {
    this.setState({ loading: true, error: null })

    get(`${apiurl}/cluster/services/${this.props.routeParams.service}/configs/${this.props.routeParams.id}`)
      .then(config => { this.setState({ config: config }); return config })
      .then(config => get(`${apiurl}/cluster/services/${config.service}`).then(service => this.setState({ service: service })))
      .done(_ => this.setState({ loading: false }))
      .fail(err => this.setState({ loading: false, error: 'Could not load data' }))
  }

  save(config) {
    console.log('saving', config)
    post(`${apiurl}/cluster/services/${config.service}/configs/${config.id}`, config)
      .done(config => this.setState({ config: config }))
      .fail(err => this.setState({ error: `Could not save changes` }))
  }

  delete() {
    let config = this.state.config
    del(`${apiurl}/cluster/services/${config.service}/configs/${config.id}`)
      .done(_ => browserHistory.push('/cluster/configs'))
      .fail(err => this.setState({ error: `Could not delete ${config.name}` }))
  }

  cancel() {
    browserHistory.push('/cluster/configs')
  }
}
