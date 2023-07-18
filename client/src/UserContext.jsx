import React ,{useEffect,useState,createContext} from 'react';
import axios from 'axios';
export const UserContext = createContext({});

export default function UserContextProvider({children}){
    const [username,setUsername] = useState(null);
    const [id,setId] = useState(null);
    useEffect(()=>{
        axios.get('/profile').then(response=>{
            setId(response.data.userId);
            setUsername(response.data.username);
        })
    })
    return (
        < .Provider value = {{username,setUsername,id,setId}}>{children}</>
    )
}