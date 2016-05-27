import * as React from 'react'
import { Link, browserHistory } from 'react-router'

import Page from '../../components/Page'
import Table from '../../components/Table'
import ErrorMessage from '../../components/ErrorMessage'
import Loading from '../../components/Loading'
import { get, post, del, toArray, groupBy, clone, map, isodate } from '../../utils'
import { apiurl } from '../../settings'
import ExperimentList from './experiment-list'

import './index.less'

export default class ExperimentContainer extends React.Component<Props, any> {
  constructor(props) {
    super(props)

    this.state = {
      init: { loading: true, error: null },
      save: { saving: false, error: null  },
      experiments: {}
    }
  }

  componentDidMount() {
    this.loadExperiments()
  }

  render() {
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

    let experiments = toArray(this.state.experiments)
    if (this.props.isExprimentFiltered) experiments = experiments.filter(e => this.props.isExprimentFiltered(e))
    let groups = groupBy(experiments, e => e.tags[this.props.groupby])

    return (
      <div>
        {extra}

        <div className="flex">
          <ExperimentList groups={groups} groupby={this.props.groupby}
            cloneExperiment={e => this.cloneExperiment(e)}
            deleteExperiment={e => this.deleteExperiment(e)} />
        </div>
      </div>
    )
  }

  loadExperiments() {
    this.setState({ init: { loading: true, error: null }})

    get(`${apiurl}/experiments`)
      .then(exps => {
        this.setState({
          init: { loading: false, error: null },
          experiments: exps
        })
        if (this.props.onUpdate) this.props.onUpdate(this.state.experiments)
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
          experiments: this.state.experiments
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
          experiments: this.state.experiments
        })
        if (this.props.onUpdate) this.props.onUpdate(this.state.experiments)
      })
      .catch(msg => {
        console.error(msg)
        this.setState({ save: { saving: false, error: `Could not clone experiment ${exp.name}` } })
      })
  }
}

interface Props {
  groupby?: string
  isExprimentFiltered?: (e: any) => boolean
  onUpdate?: (experiments: any) => void
}