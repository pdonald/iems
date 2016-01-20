import React from 'react'
import { browserHistory } from 'react-router'
import jQuery from 'jquery'

import { Page, Loading, ErrorMessage, Table, Form } from './Page'
import { map, get, post, del } from '../utils'

let url = "http://localhost:8081/api"

export class Index extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      loading: null,
      error: null,
      services: null,
      configs: null
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
      <section key={key} className={'serice-' + key}>
        <h2>{service.title}</h2>
        <Table columns={service.ui.configs.columns}
               data={map(this.state.configs, (ckey, c) => c).filter(c => c.service == key)} buttons={buttons}
               emptyText="No configurations created yet" />
      </section>
    ))
  }

  load() {
    this.setState({ loading: true, error: null })

    jQuery
      .when(
        get(`${url}/cluster/services`).then(data => data),
        get(`${url}/cluster/configs`).then(data => data)
      )
      .done((services, configs) => this.setState({ loading: false, services: services, configs: configs }))
      .fail(err => this.setState({ loading: false, error: 'Could not load data' }))
  }

  edit(config) {
    browserHistory.push(`/cluster/configs/${config.id}`)
  }

  clone(config) {
    console.log('cloning', config)
    post(`${url}/cluster/configs`, config)
      .done(config => browserHistory.push(`/cluster/configs/${config.id}`))
      .fail(err => this.setState({ error: `Could not clone ${config.name}` }))
  }

  delete(config) {
    del(`${url}/cluster/configs/${config.id}`)
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

    get(`${url}/cluster/configs/${this.props.routeParams.id}`)
      .then(config => { this.setState({ config: config }); return config })
      .then(config => get(`${url}/cluster/services/${config.service}`).then(service => this.setState({ service: service })))
      .done(_ => this.setState({ loading: false }))
      .fail(err => this.setState({ loading: false, error: 'Could not load data' }))
  }

  save(config) {
    console.log('saving', config)
    post(`${url}/cluster/configs/${config.id}`, config)
      .done(config => this.setState({ config: config }))
      .fail(err => this.setState({ error: `Could not save changes` }))
  }

  delete() {
    let config = this.state.config
    del(`${url}/cluster/configs/${config.id}`)
      .done(_ => browserHistory.push('/cluster/configs'))
      .fail(err => this.setState({ error: `Could not delete ${config.name}` }))
  }

  cancel() {
    browserHistory.push('/cluster/configs')
  }
}
