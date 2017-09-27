const mongoose = require('mongoose');
const bcrypt = require('bcrypt');


const Users = require('./user');

mongoose.Promise = global.Promise;

module.exports = {
    
    addUser: function(data) {
        
        var saltRounds = 13;
        var hash = bcrypt.hashSync(data.password, saltRounds);
//        console.log(bcrypt.compareSync(data.password, hash));
        
        
        var user = new Users({
            email : data.email,
            password : hash,
            name : data.name,
            address : data.address,
            admin : data.admin
        });
        
        return user.save();
    },
    
    loginUser: function(email) {
      
        return Users.findOne({email : email});
    },
    
    updatePassword: function(d) {

        console.log(d.pass);
        var saltRounds = 13;
        var hash = bcrypt.hashSync(d.pass, saltRounds);
        return Users.findOneAndUpdate({email: d.email},  { $set: { password: hash }});
    },
    
    getCart: function (email) {
        return Users.findOne({email : email})
            .populate('cart');
    },
    
    addToCart: function(uid) {

        return Users.findOne({email :uid});
           
    },
    
    removeFromCart: function(uid) {

        return Users.findOne({email :uid});
           
    },
    
    saveuser: function(d) {
        return d.save();
    }
    
};

