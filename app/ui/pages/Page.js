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

    this.state = {
      sort: { by: null, asc: true, rows: null }
    }
  }

  render() {
    let columns = this.props.columns
    let rows = this.props.rows

    if (rows.length == 0) {
      return <p>{this.props.emptyText}</p>
    }

    if (!columns && rows.length > 0) {
      columns = {}
      map(rows[0], key => columns[key] = { title: key })
    }

    let sortby = this.state.sort.by

    return (
      <table className="cool-table">
      <thead>
      <tr>
        {map(columns, (key, col) => (
          <th key={key} onClick={() => col.sortable !== false && this.sortby(key)} className={col.sortable !== false ? 'sortable' : ''}>
            {col.title}{' '}
            {col.sortable !== false && <span className="arrow">{sortby === key ? (this.state.sort.asc ? '↑' : '↓') : '\u00b7'}</span>}
          </th>
        ))}
        {this.props.buttons && <th>Actions</th>}
      </tr>
      </thead>
      <tbody>
      {(this.state.sort.rows || rows).map((row, index) => (
        <tr key={this.props.id ? this.props.id(row) : index}>
          {map(columns, key => <td key={key}>{row[key]}</td>)}
          {this.props.buttons && <td className="actions">{this.props.buttons.map(b => <button key={b.title} onClick={e => b.handler(row)}>{b.title}</button>)}</td>}
        </tr>
      ))}
      </tbody>
      </table>
    )
  }

  sortby(col) {
    if (this.state.sort.by == col) {
      this.setState({
        sort: {
          by: col,
          asc: !this.state.sort.asc,
          rows: this.props.rows.sort((a, b) => this.compare(a, b, col, !this.state.sort.asc))
        }
      })
    } else {
      this.setState({
        sort: {
          by: col,
          asc: true,
          rows: this.props.rows.sort((a, b) => this.compare(a, b, col, true))
        }
      })
    }
  }

  compare(a, b, by, asc) {
    const x = (asc ? 1 : -1)
    if (!a[by] && !a[by]) return 0
    if (!a[by]) return x
    if (!b[by]) return -x
    return a[by].localeCompare(b[by]) * x
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
        input = <input type="password" value={this.state.values[key] || field.defaultValue} onChange={e => this.handleChange(e, key)} />
      } else if (field.rows) {
        input = <textarea onChange={e => this.handleChange(e, key)} rows={field.rows} value={this.state.values[key] || field.defaultValue} />
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
