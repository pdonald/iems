import * as React from 'react'
import { Link, browserHistory } from 'react-router'

import Page from '../../components/Page'
import Table from '../../components/Table'
import ErrorMessage from '../../components/ErrorMessage'
import Loading from '../../components/Loading'
import { get, post, del, toArray, groupBy, clone, map, isodate } from '../../utils'
import { apiurl } from '../../settings'
import ExperimentContainer from './experiment-container'
import Filters from './filters'

import DocumentModel from '../../../universal/experiment/DocumentModel'

import './index.less'

export default class Experiments extends React.Component<any, any> {
  constructor(props) {
    super(props)

    this.state = {
      filters: {},     // selected filters, { group: { filter: true, filter2: false } }
      groupby: null    // filter name to group experiments by
    }
  }

  render() {
    return (
      <Page heading='Experiments' id='experiments'>
        {this.renderContent()}
      </Page>
    )
  }

  renderContent() {
    return (
      <div className="flex">
        <ExperimentContainer
          groupby={this.state.groupby}
          isExprimentFiltered={e => this.isExprimentFiltered(e)} 
          onUpdate={exps => this.setState({ filters: this.makeFilters(exps) })} />

        <section className="filters">
          <div><button className="primary" onClick={e => this.createExperiment()}>Create</button></div>
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
    )
  }

  makeFilters(experiments: { [id: string]: DocumentModel }) {
    // todo: preserve old values when ovrriding
    let filters = {}
    for (let expid in experiments) {
      let exp = experiments[expid]
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
    try {
      for (let tag in exp.tags) {
        if (!this.state.filters[tag])
          continue
        // ignore this filter if all are unselected
        if (Object.keys(this.state.filters[tag]).filter(f => this.state.filters[tag][f].selected).length == 0) {
          continue
        }
        if (!this.state.filters[tag][exp.tags[tag]].selected) {
          return false
        }
      }
      return true
    } catch (e) {
      console.error(e)
      return true
    }
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
      props: {
        "name": 'New Experiment',
        "created": isodate(),
        "updated": isodate()
      },
      tags: {},
      vars: {
        'srclang': 'en',
        'trglang': 'lv',
        'tempdir': '/tmp',
        'workdir': ''
      },
      "graph": {
        "id": 0, "title": "Main", "type": "main", "category": "undefined",
        "x": 0, "y": 0, "collapsed": false,
        "processes": [], "groups": [], "links": []
      }
    }

    post(`${apiurl}/experiments/${exp.id}`, exp)
      .then(_ => {
        browserHistory.push(`/experiments/${exp.id}`)
      })
  }
}
