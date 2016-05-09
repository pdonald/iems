import * as React from 'react'

import { map, merge } from '../utils'

export default class Table extends React.Component<any, any> {
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
          <th key={key} onClick={() => col.sortable !== false && this.sortby(key)}
              className={key + ' ' + (col.sortable !== false ? 'sortable' : '')}>
            {col.title}{' '}
            {col.sortable !== false && <span className="arrow">{sortby === key ? (this.state.sort.asc ? '↑' : '↓') : '\u00b7'}</span>}
          </th>
        ))}
        {this.props.buttons && <th className="actions">Actions</th>}
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
    return a[by].toString().localeCompare(b[by].toString()) * x
  }
}
