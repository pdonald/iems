import * as React from 'react'

import { clone, map } from '../../utils'

export default class Filters extends React.Component<any, any> {
  constructor(props) {
    super(props)
  }

  onChange(key, changes) {
    let allfilters = clone(this.props.filters)

    for (let filter in allfilters[key]) {
      if (filter in changes) {
        allfilters[key][filter].selected = changes[filter]
      }
    }

    this.props.onChange(allfilters)
  }

  render() {
    return (
      <div>
        {map(this.props.filters, (key, filter) => (
          <Filter key={key} name={key} filters={filter}
                  onChange={changes => this.onChange(key, changes)} />
        ))}
      </div>
    )
  }
}

class Filter extends React.Component<any, any> {
  constructor(props) {
    super(props)
  }

  check(e, name, selected) {
    this.props.onChange({ [name]: selected })
  }

  checkAll(e, selected) {
    e.preventDefault()

    let changes = {}
    for (let name in this.props.filters) {
      changes[name] = selected
    }
    this.props.onChange(changes)
  }

  render() {
    return (
      <div className="filter-group">
        <h3>{this.props.name}</h3>
        <p>
          <a href onClick={e => this.checkAll(e, true)}>Select all</a>
          {' '}
          <a href onClick={e => this.checkAll(e, false)}>Clear all</a>
        </p>
        <ul>
          {map(this.props.filters, (name, filter: any) => (
            <li key={name}>
              <label>
                <input type="checkbox" checked={filter.selected}
                      onChange={e => this.check(e, name, (e.target as HTMLInputElement).checked)}/>
                {name}{' '}
                <small>({filter.count})</small>
              </label>
            </li>
          ))}
        </ul>
      </div>
    )
  }
}
