import React from 'react';
import {useContext} from 'react';
import {UserContext} from './UserContext';
import Chat from './Chat';
import RegisterAndLogin from './RegisterAndLogin';
export default function Routingpage(){
    const {username,id}  =useContext(UserContext);
    if(username){
        return <Chat/>
    }

    return(
        <RegisterAndLogin/>

    )
}