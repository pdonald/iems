import * as React from 'react'

import { map, merge } from '../utils'

export default class Form extends React.Component<any, any> {
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
              {map(field.options, (key, group: any) => (
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
        <footer>
          <div className="button-group">
            <button onClick={e => this.handleSave(e)}>Save</button>
            <button onClick={e => this.handleCancel(e)}>Cancel</button>
            <button onClick={e => this.handleDelete(e)} className="delete">Delete</button>
          </div>
        </footer>
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
