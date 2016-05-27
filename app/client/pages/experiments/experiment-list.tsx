import * as React from 'react'
import { browserHistory } from 'react-router'

import Table from '../../components/Table'
import { map } from '../../utils'

import DocumentModel from '../../../universal/experiment/DocumentModel'

import './index.less'

export default class ExperimentList extends React.Component<Props, {}> {
  constructor(props) {
    super(props)
  }
  
  render() {
    return (
      <section className="experiments-container">
        {map(this.props.groups, (key, group) => (
          <div key={key}>
            {this.props.groupby ? <h2>{this.props.groupby + ': ' + key}</h2> : null}

            <Table columns={{ name: { title: 'Name' }, progress: { title: 'Progress' }, lastModified: { title: 'Last modified' } }}
                    rows={group.map(e => { 
                      return { 
                        name: (
                          <div className="action-buttons-container">
                            <a href="" onClick={ev => ev.preventDefault() || browserHistory.push(`/experiments/${e.id}`)}>{e.props.name}</a>
                            <span className="action-buttons">
                              <a onClick={_ => this.props.cloneExperiment(e)}><i className="fa fa-clone"></i></a>
                              {' '}
                              <a onClick={_ => this.props.deleteExperiment(e)}><i className="fa fa-remove"></i></a>
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
    )
  }
}

interface Props {
  groups: { [key: string]: DocumentModel[] }
  groupby: string
  cloneExperiment: Function
  deleteExperiment: Function
}