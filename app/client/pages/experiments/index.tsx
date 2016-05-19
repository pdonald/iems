import * as React from 'react'
import { Link, browserHistory } from 'react-router'

import Page from '../../components/Page'
import Table from '../../components/Table'
import ErrorMessage from '../../components/ErrorMessage'
import Loading from '../../components/Loading'
import { get, post, del, toArray, groupBy, clone, map, isodate } from '../../utils'
import { apiurl } from '../../settings'

import './index.less'

export default class Experiments extends React.Component<any, any> {
  constructor(props) {
    super(props)

    this.state = {
      init: { loading: true, error: null },
      save: { saving: false, error: null  },

      experiments: {}, // loaded experiments, { id: object }
      filters: {},     // selected filters, { group: { filter: true, filter2: false } }
      groupby: null    // filter name to group experiments by
    }
  }

  componentDidMount() {
    this.loadExperiments()
  }

  render() {
    return (
      <Page heading='Experiments' id='experiments'>
        {this.renderContent()}
      </Page>
    )
  }

  renderContent() {
    if (this.state.init.loading) {
      return <Loading/>
    }

    if (this.state.init.error) {
      return <ErrorMessage error={this.state.init.error} retry={() => this.loadExperiments()}/>
    }

    let extra;
    if (this.state.save.saving) {
      extra = <p>Saving...</p>
    }
    if (this.state.save.error) {
      extra = <ErrorMessage error={this.state.save.error} dismiss={true} />
    }

    let experiments = toArray(this.state.experiments).filter(this.isExprimentFiltered.bind(this))
    let groups = groupBy(experiments, e => e.tags[this.state.groupby])

    return (
      <div>
        {extra}

        <div className="flex">
          <section className="experiments-container">
            {map(groups, (key, group) => (
              <div key={key}>
                {this.state.groupby ? <h2>{this.state.groupby + ': ' + key}</h2> : null}

                <Table columns={{ name: { title: 'Name' }, progress: { title: 'Progress' }, lastModified: { title: 'Last modified' } }}
                       rows={group.map(e => { 
                         return { 
                           name: (
                              <div className="action-buttons-container">
                                <a href="" onClick={ev => ev.preventDefault() || browserHistory.push(`/experiments/${e.id}`)}>{e.props.name}</a>
                                <span className="action-buttons">
                                  <a onClick={_ => this.cloneExperiment(e)}><i className="fa fa-clone"></i></a>
                                  {' '}
                                  <a onClick={_ => this.deleteExperiment(e)}><i className="fa fa-remove"></i></a>
                                </span>
                              </div>
                           ),
                           progress: (
                             <div>
                                <div style={{'width': '50%', height: '5px', 'background': 'green', 'borderRadius': '5px'}}></div>
                             </div>
                           ),
                           lastModified: (e.props.updated || 'n/a').substr(0, 16)
                         } 
                        })} />
              </div>
            ))}
          </section>

          <section className="filters">
            <div><button onClick={() => this.createExperiment()} className="primary">Create</button></div>
            <p><input type="search" placeholder="Search"/></p>

            <p>Group by:{' '}
              <select onChange={e => this.onGroupByChange((e.target as HTMLInputElement).value)}>
                <option value="">-- None --</option>
                {map(this.state.filters, key => <option key={key} value={key}>{key}</option>)}
              </select>
            </p>

            <Filters filters={this.state.filters} onChange={filters => this.onFiltersChange(filters)}/>
          </section>
        </div>
      </div>
    )
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

  loadExperiments() {
    this.setState({ init: { loading: true, error: null }})

    get(`${apiurl}/experiments`)
      .then(exps => {
        this.setState({
          init: { loading: false, error: null },
          experiments: exps,
          filters: this.makeFilters(toArray(exps))
        })
      })
      .catch(err => {
        this.setState({ init: { loading: false, error: 'Could not load experiments' } })
      })
  }

  createExperiment() {
    let exp = {
      id: 'exp-' + Math.round(Math.random() * 1000),
      props: {
        "name": 'New Experiment',
        "created": isodate(),
        "updated": isodate()
      },
      tags: {},
      vars: {},
      "graph": {
        "id": 0, "title": "Main", "type": "main", "category": "undefined",
        "x": 0, "y": 0, "collapsed": false,
        "processes": [], "groups": [], "links": []
      }
    }

    post(`${apiurl}/experiments/${exp.id}`, exp)
      .then(_ => {
        this.state.experiments[exp.id] = exp
        this.setState(this.state)
        browserHistory.push(`/experiments/${exp.id}`)
      })
  }

  cloneExperiment(exp) {
    let clonedexp = clone(exp)
    clonedexp.id = exp.id + '-clone'

    let i;
    for (i = 0; this.state.experiments[clonedexp.id]; i++) {
      clonedexp.id = exp.id + '-clone' + (i ? i : '')
    }

    clonedexp.props.name = clonedexp.props.name + ' (Clone' + (i ? ` #${i}` : '') + ')'
    clonedexp.props.created = isodate()
    clonedexp.props.updated = isodate()

    this.setState({ save: { saving: true, error: null }})

    post(`${apiurl}/experiments/${clonedexp.id}`, clonedexp)
      .then(() => {
        this.state.experiments[clonedexp.id] = clonedexp
        this.setState({
          save: { saving: false, error: null },
          experiments: this.state.experiments,
          filters: this.makeFilters(toArray(this.state.experiments))
        })
        browserHistory.push(`/experiments/${clonedexp.id}`)
      })
      .catch(msg => {
        console.error(msg)
        this.setState({ save: { saving: false, error: `Could not clone experiment ${exp.name}` } })
      })
  }

  deleteExperiment(exp) {
    this.setState({ save: { saving: true, error: null }})

    del(`${apiurl}/experiments/${exp.id}`)
      .then(() => {
        delete this.state.experiments[exp.id]
        this.setState({
          save: { saving: false, error: null },
          experiments: this.state.experiments,
          filters: this.makeFilters(toArray(this.state.experiments))
        })
      })
      .catch(msg => {
        console.error(msg)
        this.setState({ save: { saving: false, error: `Could not clone experiment ${exp.name}` } })
      })
  }
}

class Filters extends React.Component<any, any> {
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
