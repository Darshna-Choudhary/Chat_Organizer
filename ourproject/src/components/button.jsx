import React from 'react'
import "./button.css"
const Button = ({func,text}) => {
  return (
    <div className='button'>
      <button onClick={func}>{text}</button>
    </div>
  )
}

export default Button
