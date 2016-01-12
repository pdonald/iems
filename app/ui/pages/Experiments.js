import React from 'react'
import { Link } from 'react-router'
import jQuery from 'jquery'

function toArray(obj) {
  return Object.keys(obj).map(key => obj[key])
}

export default class Experiments extends React.Component {
  constructor(props) {
    super(props)

    // todo: loading, error, redux, preloading
    this.state = {
      experiments: {},
      filters: {},
      groupby: null
    }
  }

  componentDidMount() {
    jQuery.get('http://localhost:8081/api/experiments', (exps) => {
      this.setState({
        experiments: exps,
        filters: this.makeFilters(toArray(exps))
      })
    })
  }

  makeFilters(experiments) {
    // todo: preserve old values when ovrriding
    let filters = {}
    for (let exp of experiments) {
      for (let tag in exp.tags) {
        let val = exp.tags[tag]
        if (!filters[tag]) filters[tag] = {}
        if (!filters[tag][val]) filters[tag][val] = { count: 0, selected: false }
        filters[tag][val].count++
      }
    }
    return filters
  }

  isExprimentFiltered(exp) {
    for (let tag in exp.tags) {
      // ignore this filter if all are unselected
      if (Object.keys(this.state.filters[tag]).filter(f => this.state.filters[tag][f].selected).length == 0) {
        continue;
      }
      if (!this.state.filters[tag][exp.tags[tag]].selected) {
        return false
      }
    }
    return true
  }

  onFiltersChange(filters) {
    this.setState({ filters: filters })
  }

  onGroupByChange(groupby) {
    this.setState({ groupby: groupby })
  }

  createExperiment() {
    let exp = {
      id: 'exp-' + Math.round(Math.random() * 1000),
      name: 'New Experiment',
      vars: {},
      "created": new Date().toString(),
      "updated": new Date().toString(),
      tags: {},
      "graph": {
        "id": 0, "title": "Main", "type": "main", "category": "undefined",
        "x": 0, "y": 0, "collapsed": false,
        "processes": [], "groups": [], "links": []
      }
    }

    jQuery.ajax({
      type: 'POST',
      url: 'http://localhost:8081/api/experiments/' + exp.id,
      data: JSON.stringify(exp),
      contentType: 'application/json',
      success: (res) => {
        console.log(res)
        this.state.experiments[exp.id] = exp
        this.setState(this.state)
      },
    })
  }

  cloneExperiment(exp) {
    let clone = JSON.parse(JSON.stringify(exp))
    clone.id = exp.id + '-clone'

    let i;
    for (i = 0; this.state.experiments[clone.id]; i++) {
      clone.id = exp.id + '-clone' + (i ? i : '')
    }

    clone.name = clone.name + ' (Clone' + (i ? ` #${i}` : '') + ')'

    jQuery.ajax({
      type: 'POST',
      url: 'http://localhost:8081/api/experiments/' + clone.id,
      data: JSON.stringify(clone),
      contentType: 'application/json',
      success: (res) => {
        console.log(res)
        this.state.experiments[clone.id] = clone
        this.setState(this.state)
      },
    })
  }

  deleteExperiment(exp) {
    jQuery.ajax({
      type: 'DELETE',
      url: 'http://localhost:8081/api/experiments/' + exp.id,
      success: (res) => {
        console.log(res)
        delete this.state.experiments[exp.id]
        this.setState(this.state)
      },
    })
  }

  render() {
    let experiments = toArray(this.state.experiments).filter(this.isExprimentFiltered.bind(this))
    let groupby = this.state.groupby

    let groups = {}
    if (groupby) {
      for (let exp of experiments) {
        let value = exp.tags[groupby]
        if (!groups[value]) groups[value] = []
        groups[value].push(exp)
      }
    } else {
      groups[''] = experiments
    }

    return (
      <div className="page">
        <h1>Experiments</h1>

        <button onClick={() => this.createExperiment()}>Create</button>

        <div style={{'display': 'flex'}}>
          <div className="experiments-container">
            {Object.keys(groups).map(key => (
              <div key={key}>
                {groupby ? <h2>{groupby + ': ' + key}</h2> : null}
                <table className="experiments">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groups[key].map(e => (
                    <tr key={e.id}>
                      <td><Link to={`/experiments/${e.id}`}>{e.name}</Link></td>
                      <td>
                        <button onClick={() => this.cloneExperiment(e)}>Clone</button>
                        {' '}
                        <button onClick={() => this.deleteExperiment(e)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            ))}
          </div>

          <div className="filters">
            <p>Group by:{' '}
              <select onChange={e => this.onGroupByChange(e.target.value)}>
                <option value="">-- None --</option>
                {Object.keys(this.state.filters).map(key => <option key={key} value={key}>{key}</option>)}
              </select>
            </p>

            <Filters filters={this.state.filters} onChange={filters => this.onFiltersChange(filters)}/>
          </div>
        </div>
      </div>
    )
  }
}

class Filters extends React.Component {
  constructor(props) {
    super(props)
  }

  onChange(key, changes) {
    let allfilters = JSON.parse(JSON.stringify(this.props.filters))

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
        {Object.keys(this.props.filters).map(key => (
          <Filter key={key} name={key} filters={this.props.filters[key]}
                  onChange={changes => this.onChange(key, changes)} />
        ))}
      </div>
    )
  }
}

class Filter extends React.Component {
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
          {Object.keys(this.props.filters).map(name => (
            <li key={name}>
              <label>
                <input type="checkbox" checked={this.props.filters[name].selected}
                      onChange={e => this.check(e, name, e.target.checked)}/>
                {name}{' '}
                <small>({this.props.filters[name].count})</small>
              </label>
            </li>
          ))}
        </ul>
      </div>
    )
  }
}
