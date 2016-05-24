import * as React from 'react'
import * as PureRenderMixin from 'react-addons-pure-render-mixin'

import Block from './block'
import Actions from '../actions'

import DocumentModel from '../../../../universal/experiment/DocumentModel'
import GroupModel from '../../../../universal/experiment/GroupModel'
import ProcessModel from '../../../../universal/experiment/ProcessModel'

export default class Properties extends React.Component<Props, {}> {
  /* shouldComponentUpdate() {
    return PureRenderMixin.shouldComponentUpdate.apply(this, arguments)
  } */
  
  onProcessParamChange(process, key, value) {
    Actions.processParamChanged(process, key, value)
  }
  
  onExperimentParamChange(key, value) {
    if (this.props.doc.props.hasOwnProperty(key)) {
      Actions.experimentPropertyChanged(key, value)
    } else {
      Actions.experimentTagChanged(key, value)
    }
  }
  
  onRemove(key) {
    Actions.experimentTagRemoved(key)
  }
  
  onAdd() {
    let keyElement = this.refs['key'] as HTMLInputElement
    let valueElement = this.refs['value'] as HTMLInputElement
    let propName = keyElement.value
    if (!propName.length) return
    if (this.props.doc.props[propName]) return
    if (this.props.doc.tags[propName]) return // accidental override
    Actions.experimentTagChanged(propName, valueElement.value)
    keyElement.value = valueElement.value = ''
    keyElement.focus()
  }
  
  onEnter(e) {
    e.preventDefault()
    
    if (e.keyCode == 13) {
      this.onAdd()
    }
  }

  render() {
    var selected
    selected = selected || (this.props.graph as GroupModel).groups.filter(g => g.selected)[0]
    selected = selected || (this.props.graph as GroupModel).processes.filter(p => p.selected)[0]

    var heading, body
    if (!selected || !selected.params) {
      let props = {}
      for (let key in this.props.doc.props) props[key] = this.props.doc.props[key]
      for (let key in this.props.doc.tags) if (!props.hasOwnProperty(key)) props[key] = this.props.doc.tags[key]
      var children = Object.keys(props).map(key => {
        return (
          <tr key={'EP' + key}>
          <th>{key}</th>
          <td><input type="text" value={props[key]} onChange={e => this.onExperimentParamChange(key, (e.target as HTMLInputElement).value)}/></td>
          <td>{!this.props.doc.props.hasOwnProperty(key) && <a onClick={e => this.onRemove(key)}><i className="fa fa-remove"></i></a>}</td>
          </tr>
        )
      })
      heading = 'Experiment Properties'
      body = (
        <table>
        <tbody>
          {children}
          <tr>
            <th><input type="text" ref="key" onKeyUp={this.onEnter.bind(this)} /></th>
            <td><input type="text" ref="value" onKeyUp={this.onEnter.bind(this)}/></td>
          </tr>
        </tbody>
        </table>
      )
    } else {
      var p: ProcessModel = selected
      var children = Object.keys(p.template.params).map(key => {
        let validationMsg = p.isParamInvalid(key)
        return (
          <tr key={'P' + key}>
          <th>{key}</th>
          <td className={validationMsg ? 'invalid' : ''}>
            <input title={validationMsg} type="text" value={p.params[key] || ''} onChange={e => this.onProcessParamChange(p, key, (e.target as HTMLInputElement).value)}/>
          </td>
          </tr>
        )
      })
      heading = p.template.title + ' Properties'
      body = <table><tbody>{children.length ? children : <tr><td><p>No properties for this item.</p></td></tr>}</tbody></table>
    }

    return (
      <Block name="properties" title={heading}>
        {body}
      </Block>
    )
  }
}

interface Props {
  doc: DocumentModel
  graph: GroupModel | ProcessModel
}