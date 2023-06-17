import React from 'react'
import Avatar from './Avatar'
export default function Contact({id,username,onClick,selected,online}) {
  return (
    <div key = {id} onClick = {()=>onClick(id)} 
          
            className = {"border-b border-gray-100 py-2 pl-4   flex items-center gap-2 cursor-pointer " + (selected ? 'bg-blue-50' : '') }>
        <Avatar online = {online} username = {username} userId = {id}/>
            <span className = 'text-gray-700'>{username}</span>
    </div>
  )
}
