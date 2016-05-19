import * as React from 'react'

import { merge } from '../utils'

export default class Modal extends React.Component<Props, {}> {
  render() {
    if (this.props.isOpen === false)
      return
      
    let width = this.props.width || 300
    let height = this.props.height || 300
    
    let style = {
      position: 'absolute',
      width: width + 'px',
      height: height + 'px',
      marginLeft: '-' + (width/2) + 'px',
      marginTop: '-' + (height/2) + 'px',
      top: '50%',
      left: '50%',
      zIndex: '9999'
    }
    
    if (this.props.style) {
      style = merge(style, this.props.style)
    }
    
    let backdropStyle = {
      position: 'absolute',
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.3)',
      top: '0px',
      left: '0px',
      zIndex: '9998'
    }
    
    return (
      <div className={this.props.containerClassName}>
        <div style={style} className={this.props.className}>
          {this.props.children}
        </div>
        {!this.props.noBackdrop && 
            <div style={backdropStyle} 
                 className={this.props.backdropClassName} 
                 onClick={e => this.close(e)}/>}
      </div>
    )
  }
  
  close(e) {
    if (this.props.onClose) {
      this.props.onClose()
    }
  }
}

interface Props {
  isOpen?: boolean
  noBackdrop?: boolean
  width: number
  height: number
  style?: { [key: string]: string }
  children?: any
  className?: string
  backdropClassName?: string
  containerClassName?: string
  onClose?: Function
}