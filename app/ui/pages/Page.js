import React from 'react'

import { map, merge } from '../utils'

export class Page extends React.Component {
  render() {
    let heading = this.props.heading ? <h1>{this.props.heading}</h1> : null
    let loading = this.props.loading ? <p>Loading...</p> : null

    return (
      <div className="page">
        {heading}
        {loading}
        {this.props.children}
      </div>
    )
  }
}

export class ErrorMessage extends React.Component {
  render() {
    if (!this.props.error) {
      return null
    }

    let retry;
    if (this.props.retry) {
      retry = <button onClick={() => this.props.retry()}>Retry</button>
    }

    // todo: dismissable

    return (
      <div className="alert-error" role="alert">
        <strong>Error:</strong> {this.props.error} {retry}
      </div>
    )
  }
}

export class Loading extends React.Component {
  render() {
    return <p>Loading...</p>
  }
}

export class Table extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    let columns = this.props.columns
    let rows = this.props.data

    if (rows.length == 0) {
      return <p>{this.props.emptyText}</p>
    }

    if (!columns && rows.length > 0) {
      columns = {}
      map(rows[0], key => columns[key] = { title: key })
    }

    return (
      <table>
      <thead>
      <tr>
        {map(columns, (key, col) => <th key={key}>{col.title}</th>)}
        <th>Actions</th>
      </tr>
      </thead>
      <tbody>
      {rows.map((row, index) => (
        <tr key={index}>
          {map(columns, key => <td key={key}>{row[key]}</td>)}
          <td>{this.props.buttons.map(b => <button key={b.title} onClick={e => b.handler(row)}>{b.title}</button>)}</td>
        </tr>
      ))}
      </tbody>
      </table>
    )
  }
}

export class Form extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      values: props.values
    }
  }

  render() {
    let fields = []

    for (let key in this.props.form) {
      let field = this.props.form[key]
      if (field.hidden) {
        continue
      }
      let input;
      if (field.options) {
        if (Array.isArray(field.options)) {
          input = (
            <select value={this.state.values[key]} onChange={e => this.handleChange(e, key)}>
              {field.options.map((o, index) => <option key={index} value={o}>{o}</option>)}
            </select>
          )
        } else {
          input = (
            <select value={this.state.values[key]} onChange={e => this.handleChange(e, key)}>
              {map(field.options, (key, group) => (
                <optgroup label={group.title} key={key}>
                  {group.options.map((o, index) => <option key={index} value={o}>{o}</option>)}
                </optgroup>
              ))}
            </select>
          )
        }
      } else if (field.secret) {
        input = <input type="password" onChange={e => this.handleChange(e, key)} />
      } else {
        input = <input type="text" value={this.state.values[key] || field.defaultValue} onChange={e => this.handleChange(e, key)} />
      }

      fields.push((
        <div key={key} className="row">
          <label>{field.label || key}</label>{' '}
          {input}
        </div>
      ))
    }

    return (
      <form>
        {fields}
        <div>
          <button onClick={e => this.handleSave(e)}>Save</button>
          <button onClick={e => this.handleCancel(e)}>Cancel</button>
          <button onClick={e => this.handleDelete(e)}>Delete</button>
        </div>
      </form>
    )
  }

  handleChange(e, key) {
    this.setState({ values: merge(this.state.values, { [key]: e.target.value }) })
  }

  handleSave(e) {
    e.preventDefault()
    this.props.onSave(this.state.values)
  }

  handleDelete(e) {
    e.preventDefault()
    this.props.onDelete()
  }

  handleCancel(e) {
    e.preventDefault()
    this.props.onCancel()
  }
}
