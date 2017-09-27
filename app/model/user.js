const mongoose = require('mongoose');

var Products = require('./product');
var schema = mongoose.Schema;

var userSchema = mongoose.Schema({
    email : {
        type: String,
        unique: true,
        required: true
    },
    password : {
        type: String
    },
    name : String,
    admin: {
        type: Boolean,
        default: false
    },
    address : String,
    cart : [{
        type: schema.Types.ObjectId,
        ref:'Products'
    }]
});


module.exports = mongoose.model('Users', userSchema);