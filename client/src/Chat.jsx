import React,{useEffect,useState,useContext,useRef} from 'react'
import { UserContext } from './UserContext';
import Avatar from './Avatar'
import Logo from './Logo'
import {uniqBy} from "lodash";
import axios from 'axios';
import Contact from './Contact';
function Chat() {
    const [ws,setWs] = useState(null);
    const [onlinePeople ,setOnlinePeople] = useState({});
    const [offlinePeople,setOfflinePeople]  = useState({});
    const [selectedUserId,setSelectUsedId] = useState(null);
    const {username,id,setId,setUsername} = useContext(UserContext);
    const [newMessageText,setNewMessageText] = useState("");
    const [messages,setMessages] = useState([]);
    
    const divUnderMessages = useRef();
    useEffect(()=>{
        connectToWs();
        // setOnlinePeople(people);
    },[])
    //to basically autoreconnect whenever something happens
    function connectToWs(){
        const ws = new WebSocket('ws://localhost:4040')
        setWs(ws);
        //things that should happen when messaging
        ws.addEventListener('message', handleMessage);

        ws.addEventListener('close',()=>{
            setTimeout(()=>{
                console.log("disconnected, trying to reconnect");
                connectToWs();
            },1000);
        });
    }
    function showingthepeople(peopleArray){
        // console.log(peopleArray);
        const people = {};
        peopleArray.forEach(({userId,username}) => {
            people[userId]  = username;
        })
        // setOnlinePeople(people);
        // setPeopleOnline({...peopleOnline,people});
        // let mydatanew = {...peopleOnline,people};
        // console.log(mydatanew);
        // console.log(people)
        return people;
    }
    async function handleMessage(ev){
        const messageData = JSON.parse(ev.data);
        console.log(messageData)
        console.log({ev,messageData});
        if('online' in messageData){
            // console.log(messageData.online);
            const obj = showingthepeople(messageData.online);
            
            await setOnlinePeople(obj);
            // console.log(onlinePeople);
        }
        else if ('text' in messageData) {
            if (messageData.sender === selectedUserId) {
              await setMessages(prev => ([...prev, {...messageData}]));
            }
          }
        }
        // console.log({messages});
    function logout(){
        axios.post('/logout').then(()=>{
            setWs(null);
            setId(null);
            setUsername(null);
        })
    }
    async function sendMessage(ev, file = null) {
        if(ev){
            ev.preventDefault();
        }
        // console.log(messageData)
        ws.send(JSON.stringify({
          recipient: selectedUserId,
          text: newMessageText,
          file,
        }));
        if (file) {
          await axios.get('/messages/'+selectedUserId).then(res => {
             setMessages(res.data);
          });
        } else {
          setNewMessageText('');
          await setMessages(prev => ([...prev,{
            text: newMessageText,
            sender: id,
            recipient: selectedUserId,
            file,
            _id: Date.now(),
          }]));
        }
      }
    function sendFile(ev){
        const reader = new FileReader();
        //returns as Base64
        reader.readAsDataURL(ev.target.files[0]);
        reader.onload = ()=>{
             sendMessage(null,{
               name: ev.target.files[0].name,
                data: reader.result,
                
            });
        }
       
    }
    
    useEffect(()=>{
        console.log('hj');
        const div = divUnderMessages.current;
        if(div){
            div.scrollIntoView({behavior:'smooth',block:'end'});
        }
    },[messages]);

    useEffect(()=>{
        axios.get('/people').then(res=>{
            const offlinePeopleArr = res.data
                .filter(p=>p._id!==id)
                .filter(p=> !Object.keys(onlinePeople).includes(p._id));
            const offlinePeople = {}
            offlinePeopleArr.forEach(p=>{
                offlinePeople[p._id] = p;
            });
            setOfflinePeople(offlinePeople);
        });
        
    },[onlinePeople]);


    useEffect(()=>{
        if(selectedUserId){
            axios.get('/messages/'+selectedUserId).then(res=>{
                setMessages(res.data);
            })
        }
    },[selectedUserId]);


    const onlinePeopleExcludingHimself = {...onlinePeople};
    //to delete himself from the object of all the users
    delete onlinePeopleExcludingHimself[id];

    //to only get unique messages
    const messagesWithoutDups = uniqBy(messages,'_id');
    
    
  return (
    <div className = 'flex h-screen ' >
        
        <div className = 'flex flex-col flex-grow relative overflow-y-scroll bg-white-100 w-1/3'>
            <div className ='flex-grow' >
                <Logo/>
                {Object.keys(onlinePeopleExcludingHimself).map(userId=>(
                    <Contact 
                        key = {userId}
                        id = {userId}
                        username = {onlinePeopleExcludingHimself[userId]}
                        onClick = {()=>setSelectUsedId(userId)}
                        selected = {userId === selectedUserId}
                        online = {true} 
                    />

                ))}
                {Object.keys(offlinePeople).map(userId=>(
                    <Contact 
                        key = {userId}
                        id = {userId}
                        username = {offlinePeople[userId].username}
                        onClick = {()=>setSelectUsedId(userId)}
                        selected = {userId === selectedUserId}
                        online = {false} 
                    />
                    
                ))}
            </div>
            <div className = 'p-2 text-center' >
                <span className = "mr-2 text-sm text-gray-600">Hey {username}</span>
                <button onClick = {logout} className = 'text-sm text-gray-600 bg-blue-200 py-1 px-2 rounded-md '>logout</button>
                
            </div>

    
        </div>
        <div className = 'flex flex-col flex-grow bg-red-50 w-2/3 p-2'>
            <div className = "flex-grow">
                {!selectedUserId && (

                    <div className = 'flex h-full flex-grow items-center justify-center'>
                        <div className = 'text-gray-400'>&larr; Select a Person</div>
                    </div>
                )}
                {!!selectedUserId &&(
                        
                    <div className = "relative h-full">
                    <div className ="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
                        {messagesWithoutDups.map(message=>(
                        <div key = {message._id} className = {(message.sender === id? 'text-right':'text-left')}> 
                            <div className = {'text-left inline-block p-2 my-2 rounded-lg text-sm ' + (message.sender === id? 'bg-blue-300 text-white': 'bg-white text-gray-700')}>
                                {message.text}
                                {message.file && (
                                    <div>
                                        
                                        <a target = '_blank' className = 'border-b flex items-center gap-1' href = {axios.defaults.baseURL + '/uploads/' + message.file}>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 cursor-pointer">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                                            </svg>
                                            {message.file}
                                        </a>
                                    </div>

                                )}
                            </div>
                            </div>
                        ))}
                        <div ref = {divUnderMessages}></div> 
                    </div>
                    </div>
                )}
            </div>
            {!!selectedUserId && (
                <form className = 'flex gap-2 items-center ' onSubmit = {sendMessage}>

                <input type = "text" value = {newMessageText} 
                onChange = {ev=>setNewMessageText(ev.target.value)}
                placeholder = "type your message here"
                className='bg-white flex-grow border rounded-lg p-2'/>
                {/* file attachments */}
                <label type = 'button' className= 'items-center'>
                    <input type = "file" className = 'hidden' onChange = {sendFile}></input>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 cursor-pointer">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>

                </label>
                <button type = "submit" className = 'p2 text-black rounded-lg'>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>

                </button>
                </form>
            )}
            
        </div>
      
    </div>
  )
}

export default Chat
