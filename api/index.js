
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcryptjs');


const cookieParser = require('cookie-parser');
const User = require('./models/User');
const Message = require('./models/Message');
//websockets 
const ws = require('ws');
//to store files
const fs = require('fs');
const { ConnectionClosedEvent } = require('mongodb');
dotenv.config();







mongoose.connect(process.env.MONGO_URL);
const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);
console.log(process.env.MONGO_URL);

const app = express();
//to make the uploads folder available to view
//express.static is to view files like images pdfs etc
app.use('/uploads', express.static(__dirname + '/uploads'));
app.use(express.json())
app.use(cookieParser());
app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
}));
app.get('/test',(req,res)=>{
    res.json('test ok');
});

async function getUserDataFromRequest(req){
    return new Promise((resolve,reject)=>{
        const token = req.cookies?.token;
        if(token){
            jwt.verify(token,jwtSecret,{},(err,userData)=>{
                if(err){ throw err;}
                resolve(userData);
        
            })
        }else{
            reject('no token');
        }
    })
}

app.get('/messages/:userId',async (req,res)=>{
    const {userId} = req.params;
    const userData = await getUserDataFromRequest(req);
    const ourUserId = userData.userId;
    const messages = await Message.find({
        sender : {$in:[userId,ourUserId]},
        recipient: {$in:[userId,ourUserId]}
    }).sort({createdAt:1});
    res.json(messages);

})


app.get('/people',async(req,res)=>{
    const users = await User.find({},{'_id':1,username:1});
    res.json(users);
})


app.get('/profile',(req,res)=>{
    const token = req.cookies?.token;
    if(token){
        jwt.verify(token,jwtSecret,{},(err,userData)=>{
            if(err){ throw err;}
            res.json(userData);
    
    
        })
    }
    else{
        res.status(401).json('no token available');
    }
    
})
app.post('/login',async (req,res)=>{
    const {username,password} = req.body;
    const founduser = await User.findOne({username});
    if(founduser){
        const passok = bcrypt.compareSync(password,founduser.password);
        if(passok){
            jwt.sign({userId:founduser._id,username},jwtSecret,{},(err,token)=>{
                res.cookie('token',token,{sameSite:'none',secure:true}).json({
                    id: founduser._id,
                })
            })
        }
    }
    

})

app.post('/logout',(req,res)=>{
    res.cookie('token','',{sameSite:'none',secure:true}).json('ok');
});

app.post('/register',async (req,res)=>{
    console.log(req.body);
    const {username,password} = req.body;
    
    try{
        const hashedpassword = bcrypt.hashSync(password,bcryptSalt);
        const createdUser = await User.create({
            username:username,
            password: hashedpassword});
        jwt.sign({userId:createdUser._id,username},jwtSecret,{},(err,token)=>{
            if(err){
                throw err;
            }
            res.cookie('token',token,{sameSite:'none',secure:true}).status(201).json({
                id: createdUser._id,
            });
        });
    }catch(err){
        throw err;
        res.status(500).json('error');
    }
    
    


});


const server = app.listen(4040);

//creating a websocket server
//wss = websocketserver
const wss = new ws.WebSocketServer({server});
//wss has all the connections but we want to put a single connection into the "connection" which is our logged in user 
wss.on('connection',(connection,req)=>{

    function notifyAboutOnlinePeople(){
        [...wss.clients].forEach(client=>{
            client.send(JSON.stringify({
                online: [...wss.clients].map(c=>({userId:c.userId,username : c.username}))
            }))
        })
    }
    connection.isAlive = true;
    connection.timer = setInterval(()=>{
        connection.ping()
        connection.deathTimer = setTimeout(()=>{
            connection.isAlive = false;
            clearInterval(connection.timer);
            connection.terminate();
            notifyAboutOnlinePeople();
            
        },1000);

    },3000);
    //if there is a ping then there will be a pong
    connection.on('pong',()=>{
        //clearing out so that if there is pong then the connection is still alive and else then it will be dead 
        clearTimeout(connection.deathTimer);
    })

    //read the username and id from the cookie for the connection
    const cookies = req.headers.cookie;
    if(cookies){
        const tokenCookieString = cookies.split(';').find(str=>str.startsWith('token='));
        if(tokenCookieString){
            const token = tokenCookieString.split('=')[1];
            if(token){
                jwt.verify(token,jwtSecret,{},(err,userData)=>{
                    if(err) throw err;
                    const {userId,username} = userData;
                    //setting up the connection to a user(logged in user)
                    // console.log(userData);
                    connection.userId = userId;
                    connection.username = username;
                })
            }
        }
    }
    connection.on('message',async (message)=>{
        const messageData = JSON.parse(message.toString());
        //console.log(messageData);
        const {recipient,text,file} = messageData;
        let filename = null;
        if(file){
            const parts = file.name.split('.');
            const ext = parts[parts.length-1];
            filename = Date.now() + '.' + ext;
            const path = __dirname + '/uploads/' + filename;
            const bufferData = new Buffer(file.data.split(',')[1],'base64');
            fs.writeFile(path,bufferData,()=>{
                console.log('file saved: ' + path);
            });
            
        }
        if(recipient && (text||file)){
            const messageDoc = await Message.create({
                sender: connection.userId,
                recipient,
                text,
                file: file? filename:null,
            });
            [...wss.clients]
            .filter(c => c.userId === recipient)
            .forEach(c=> c.send(JSON.stringify({
                text,
                sender: connection.userId,
                recipient,
                file: file? filename:null,
                _id: messageDoc._id,
            }))) ;
        }
        

    });
    //to see no of connections in the app
    //console.log([...wss.clients].map(c=>c.username));
    notifyAboutOnlinePeople();



})

