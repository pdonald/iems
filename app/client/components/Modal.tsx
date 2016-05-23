import * as React from 'react'

import { merge } from '../utils'

export default class Modal extends React.Component<Props, {}> {
  render() {
    if (this.props.isOpen === false)
      return
      
    let modalStyle: any = {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: '9999',
      background: '#fff'
    }

    if (this.props.width && this.props.height) {
      modalStyle.width = this.props.width + 'px'
      modalStyle.height = this.props.height + 'px'
      modalStyle.marginLeft = '-' + (this.props.width/2) + 'px',
      modalStyle.marginTop = '-' + (this.props.height/2) + 'px',
      modalStyle.transform = null
    }
    
    if (this.props.style) {
      modalStyle = merge(modalStyle, this.props.style)
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
    
    if (this.props.backdropStyle) {
      backdropStyle = merge(backdropStyle, this.props.backdropStyle)
    }
    
    return (
      <div className={this.props.containerClassName}>
        <div className={this.props.className} style={modalStyle}>
          {this.props.children}
        </div>
        {!this.props.noBackdrop && 
            <div className={this.props.backdropClassName} style={backdropStyle} 
                 onClick={e => this.close(e)}/>}
      </div>
    )
  }
  
  close(e) {
    e.preventDefault()
    
    if (this.props.onClose) {
      this.props.onClose()
    }
  }
}

interface Props {
  isOpen?: boolean
  noBackdrop?: boolean
  width?: number
  height?: number
  style?: { [key: string]: string }
  backdropStyle?: { [key: string]: string }
  children?: any
  className?: string
  backdropClassName?: string
  containerClassName?: string
  onClose?: Function
}