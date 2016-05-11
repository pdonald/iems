import * as React from 'react'

export default class Block extends React.Component<Props, any> {
  render() {
    if (this.props.hidden)
      return null
      
    return (
      <div className={"block " + this.props.name}>
        <h2>{this.props.title}</h2>
        {this.props.children}
      </div>
    )
  }
}

interface Props {
   name: string;
   title: string;
   children?: any;
   hidden?: boolean;
}