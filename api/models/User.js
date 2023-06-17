const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {type:String,unique: true},
    password: String,
},{timestamps:true}
);
//collectionname and collectonschema
const UserModel = mongoose.model('User',UserSchema);
module.exports = UserModel;