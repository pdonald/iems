import * as React from 'react'

export default class ErrorMessage extends React.Component<any, any> {
  render() {
    if (!this.props.error) {
      return null
    }

    let retry;
    if (this.props.retry) {
      retry = <button onClick={() => this.props.retry()}>Retry</button>
    }

    // todo: dismissable

    return (
      <div className="alert-error" role="alert">
        <strong>Error:</strong> {this.props.error} {retry}
      </div>
    )
  }
}