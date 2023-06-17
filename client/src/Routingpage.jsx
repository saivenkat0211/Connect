import React from 'react';
import Register from './RegisterAndLogin';
import {useContext} from 'react';
import {UserContext} from './UserContext';
import Chat from './Chat';
export default function Routingpage(){
    const {username,id}  =useContext(UserContext);
    if(username){
        return <Chat/>
    }

    return(
        <Register/>

    )
}