import React from 'react'
import "./navbar.css";
import Button from './button';
const Navbar = () => {
  return (
    <nav>
        <div className="wrapper">

            <img src="/favicon.ico" alt="logo" />
        <h1>GetChat..</h1>


        </div>
      <ul>
        <li><Button text={"Home"}/> </li>
        <li><Button text={"About"}/> </li>
      </ul>
    </nav>
  )
}

export default Navbar
