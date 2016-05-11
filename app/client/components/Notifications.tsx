import * as React from 'react'

export default class Notifications extends React.Component<any, any> {
  constructor(props) {
    super(props)

    this.state = {
      messages: []
    }
  }

  success(msg, ...params) {
    this.setState({
      messages: [...this.state.messages, { type: 'success', text: msg }]
    })
  }

  error(msg, ...params) {
    this.setState({
      messages: [...this.state.messages, { type: 'error', text: msg }]
    })
  }

  render() {
    return (
      <div>
        {this.state.messages.map((msg, index) => (
          <div key={index} className={'alert alert-' + msg.type} role="alert">
            <strong>{msg.type}:</strong> {msg.text}
          </div>
        ))}
      </div>
    )
  }
}