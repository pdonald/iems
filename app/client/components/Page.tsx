import * as React from 'react'

export default class Page extends React.Component<any, any> {
  render() {
    let heading = this.props.heading ? <h1>{this.props.heading}</h1> : null
    let loading = this.props.loading ? <p>Loading...</p> : null

    return (
      <div className="page" id={this.props.id}>
        {heading}
        {loading}
        {this.props.children}
      </div>
    )
  }
}