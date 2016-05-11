import * as React from 'react'

export default class Block extends React.Component<Props, any> {
  constructor(props) {
    super(props)
    this.state = { collapsed: false }
  }
  
  render() {
    if (this.props.hidden)
      return null
      
    return (
      <div className={"block " + this.props.name}>
        <h2 onClick={this.handleTitleClick.bind(this)}>
          {this.props.title}
          {this.state.collapsed && <small>{' (+)'}</small>}
        </h2>
        {!this.state.collapsed && this.props.children}
      </div>
    )
  }
  
  handleTitleClick(e) {
    this.setState({ collapsed: !this.state.collapsed })
  }
}

interface Props {
   name: string
   title: string
   children?: any
   hidden?: boolean
}