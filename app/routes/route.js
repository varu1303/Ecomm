const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const jtoken = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const ObjectId = require('mongodb').ObjectID;

const Users = require('./../model/userQuery');
const Products = require('./../model/prodQuery');
const jwt = require('./../../config/jwtsecret');
const myResponse = require('./../../config/response');
const exportEmail = require('./../../config/email-cred');



module.exports = function(app) {
    
/*User logged or not middleware */
    
    var isAuthenticated = function(req,res,next) {
        if(req.cookies.jwtoken){
            jtoken.verify(req.cookies.jwtoken, jwt.secret,function(err, token){
                if(err){
                    var result = myResponse.generate(true,err,502,null);
                    res.send(result);                     
                }else{
                    req.body.email = token.data;
                    req.body.admin = token.admin;
                    next();                    
                }
            });
        }else{
            var result = myResponse.generate(true,'USER NOT LOGGED IN',401,null);
            res.send(result);            
        }
    };
    
    var isAuthorised = function(req, res, next) {
        if(!req.body.admin){
            var result = myResponse.generate(true,'User not authorised - has to be admin',401,null);
            res.send(result);             
        }else{
            next();
        }
    };
    
    var isNotLogged = function(req, res, next) {
        if(req.cookies.jwtoken){
            var result = myResponse.generate(true,'Logged user cannot access -Forgot password- api',400,null);
            res.send(result); 
        }else{
            next();          
        }
    };

    
/* THIS PART CREATING NEW PASSWORD AND SENDING IT OVER IN EMAIL */
    
    function makeid() {
          var text = "";
          var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

          for (var i = 0; i < 8; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

          return text;
    }
    
    var transporter = nodemailer.createTransport({
        service: "Gmail",
        host: "smtp.gmail.com",
        auth: {
            user: exportEmail.id, // Your email id
            pass: exportEmail.password // Your password
        }
    });

    
    var emailSender = function(email) {
        
        return new Promise(function(resolve, reject){
            var newpass = makeid();
            var text = 'Hello! your new password: ' + newpass; 
            var mailOptions = {
                    from: exportEmail.id, // sender address
                    to: email, // list of receivers
                    subject: 'Password Change', // Subject line
                    text: text 
                };

            transporter.sendMail(mailOptions, function(error, info){
                if(error){
                    console.log(error);
                    reject();

                }else{
                    console.log('Message sent: ');
                    resolve({
                        email: email,
                        pass: newpass
                    });
                }
            }); 
            
        });


    };
    
/* ----NODE MAILER ENDS HERE---- */
    
    
/* ROUTES START FROM HERE*/    
    app.get('/',function(req,res) {
        res.send('WELCOME!!');
    });
/*USER RELATED ROUTES*/    

/* email and password must for sign up, admin default value is false */
    app.post('/signup',function(req,res) {
        
        if(req.body.email && req.body.password){   
            Users.addUser(req.body)
                .then(function(d) {
                        var result = myResponse.generate(false,'User Signed Up',200,d.email);
                        res.send(result);
                })
                .catch(function(e) {
                        var result = myResponse.generate(true,'Sign up failed', e.message,503,null);
                        res.send(result);
                });
        }else{
                var result = myResponse.generate(true,'Enter email and password **rest optional',400,null);
                res.send(result);        
        }
    });

/* email and password required for login - JWT passed in cookie to client*/
    app.post('/login', function(req, res) {
        
        if(req.body.email && req.body.password){
        
            Users.loginUser(req.body.email)
                .then(function(d) {

                    if(!d) {
                        var result = myResponse.generate(true,'Email not found',401,d);
                        res.send(result);
                    }else if(!bcrypt.compareSync(req.body.password, d.password)) {
                        var result = myResponse.generate(true,'Password do not match',401,null);
                        res.send(result);                      
                    } else {
                        var result = myResponse.generate(false,'Logged in!',200,d.email);
                        var payload = JSON.stringify({data: req.body.email, admin: d.admin});
                        var token = jtoken.sign(payload, jwt.secret);
                        res.cookie('jwtoken', token).send(result);
                    }

            })
                .catch(function(e) {
                        var result = myResponse.generate(true,'Log in failed', e.message,503,null);
                        res.send(result);
            });
        }else{
            var result = myResponse.generate(true,'email & password required for logging in',400,null);
            res.send(result);             
        }
    });
    
/*Cookie carrying the JWT which was going back and forth for validation is destroyed */   
    app.get('/logout', function(req,res) {
        res.clearCookie('jwtoken');
        var result = myResponse.generate(false,'Logged Out',200,null);
        res.send(result);
    });
    
/*Forgotpass route sets a new password and sends it to the email address */  
    app.post('/forgotpass',isNotLogged, function(req, res) {
        
        if(!req.body.email){
            var result = myResponse.generate(true,'Need email for which password has to be reset',400,null);
            res.send(result);
        }else{
            Users.loginUser(req.body.email)
                .then(function(d) {
                    if(d){
                        emailSender(d.email)
                            .then(function(d){
                                Users.updatePassword(d)
                                    .then(function(data){
                                        var result = myResponse.generate(false,'Check email for new updated password',200,null);
                                        res.send(result);                                     
                                })
                                    .catch(function(error){
                                        var result = myResponse.generate(true,'Password could not be updated',503,null);
                                        res.send(result);
                                });
                            
                        })
                            .catch(function(){
                                var result = myResponse.generate(true,'New Password could not be sent',502,null);
                                res.send(result); 
                        });                                 
                    }
                    else
                        throw {};
            })
                .catch(function(e){
                    var result = myResponse.generate(true,'Provided Email not signed up',401,null);
                    res.send(result);                
            });
        }
    });
    
/*After getting new password below route used to set a new one need to send password and duppassword in body to change it*/    
    app.post('/changepassword',isAuthenticated,function(req,res) {
        if(req.body.password && req.body.duppassword){
            if(req.body.password == req.body.duppassword ){   
                    data = {
                        email: req.body.email,
                        pass: req.body.password
                    };
                    Users.updatePassword(data)
                        .then(function(d){
                            var result = myResponse.generate(false,'Password changed',200,null);
                            res.send(result);                                     
                        })
                        .catch(function(e){
                            var result = myResponse.generate(true,'Password could not be changed',503,null);
                            res.send(result);
                    });
            }else{
                    var result = myResponse.generate(true,'New password not confirmed',401,null);
                    res.send(result);                
            }
        }else{
            var result = myResponse.generate(true,'Both password and duppassword required',400,null);
            res.send(result);  
            
        }
    });
    
/*PRODUCT RELATED ROUTES*/

/*getall products*/
    app.get('/product/getall',function(req,res) {
       Products.getAllProd()
        .then(function(d) {
            var result = myResponse.generate(false,'All Products fetched',200,d);
            res.send(result);           
       })
        .catch(function(e) {
            var result = myResponse.generate(true,'Products could not be fetched',e,503,null);
            res.send(result);           
       });
        
    });
    
/*getone product*/
    app.get('/product/get/:prodid',function(req,res) {

       Products.getOneProd(req.params.prodid)
        .then(function(d) {
           if(!d){
                var result = myResponse.generate(true,'Product not present',400,null);
                res.send(result);
           }else{
                var result = myResponse.generate(false,'Product fetched',200,d);
                res.send(result);
           }
           
       })
        .catch(function(e) {
            var result = myResponse.generate(true,'Product could not be fetched',503,null);
            res.send(result);           
       });
        
    });
    
    
    
/*adding new product */
    app.post('/product/add',isAuthenticated,isAuthorised,function(req,res){
        if(req.body.name && req.body.price){
            Products.add(req.body)
                .then(function(d) {
                    var result = myResponse.generate(false,'Product Added',200,d);
                    res.send(result);            
            })
                .catch(function(e){
                    var result = myResponse.generate(true,'Product could not be Added',503,null);
                    res.send(result);            
            });
        }else {
                var result = myResponse.generate(true,'name and price has to be specified **rest optional',400,null);
                res.send(result);             
        }
    });
    
    
    
/*removing a product */
    app.post('/product/remove/:prodid',isAuthenticated,isAuthorised,function(req,res){
        Products.remove(req.params.prodid)
            .then(function(d) {
                if(!d){
                    var result = myResponse.generate(true,'Product not present',400,null);
                    res.send(result);                    
                }else{
                    var result = myResponse.generate(false,'Product Removed',200,d);
                    res.send(result);                     
                }
           
        })
            .catch(function(e){
                var result = myResponse.generate(true,'Product could not be Removed',503,null);
                res.send(result);            
        });
    });
    
/*Update inStock for a product,*/
    
    app.post('/product/updatestock/:prodid',isAuthenticated,isAuthorised,function(req,res){
        if(req.body.inStock!=undefined){
            Products.updateStock(req.params.prodid,req.body.inStock)
                .then(function(d) {
                    if(!d){
                        var result = myResponse.generate(true,'Product not present',400,null);
                        res.send(result);                        
                    }else{
                        var result = myResponse.generate(false,'Product Updated',200,d);
                        res.send(result);                          
                    }          
            })
                .catch(function(e){

                    var result = myResponse.generate(true,'Product could not be Updated',503,null);
                    res.send(result);            
            });
        }else {
            var result = myResponse.generate(true,'send new inStock to update ',400,null);
            res.send(result);            
        }
    });
    
/*Update price of a product */
    
    app.post('/product/updateprice/:prodid',isAuthenticated,isAuthorised,function(req,res){
        if(req.body.price){
            Products.updatePrice(req.params.prodid,req.body.price)
                .then(function(d) {
                    if(!d){
                        var result = myResponse.generate(true,'Product not present',400,null);
                        res.send(result);
                    }else{
                        var result = myResponse.generate(false,'Product Updated',200,d);
                        res.send(result);                          
                    }
            })
                .catch(function(e){
                    var result = myResponse.generate(true,'Product could not be Updated',503,null);
                    res.send(result);            
            });
        }else {
            var result = myResponse.generate(true,'send new price to be updated',400,null);
            res.send(result);            
        }
    });
    
    
    
/*USER's cart related apis */
    
    
    app.get('/user/cart',isAuthenticated,function(req,res) {
        Users.getCart(req.body.email)
            .then(function(d){
                c= d.cart;
                var result = myResponse.generate(false,'Cart fetched',200,c);
                res.send(result);
        })
            .catch(function(e) {
                var result = myResponse.generate(true,'Cart not fetched',200,null);
                res.send(result); 
        })
    });
    
    app.post('/user/cartadd',isAuthenticated,function(req,res) {
        Users.addToCart(req.body.email)
            .then(function(d){
                if(req.body.prodId){
                    var pid = ObjectId(req.body.prodId);
                    d.cart.push(pid);
                    return Users.saveuser(d);                    
                }else{
                    var result = myResponse.generate(true,'send prodId in body (as string)',400,d.cart);
                    res.send(result);                    
                }            
        })
            .then(function(d){
                var result = myResponse.generate(false,'Product added in Cart',200,d.cart);
                res.send(result);
        })
            .catch(function(e){
                var result = myResponse.generate(true,'Product could not be added to Cart',503,null);
                res.send(result);             
        });
        
        
    });
    

    
    app.post('/user/cartremove',isAuthenticated,function(req,res) {
        Users.removeFromCart(req.body.email)
            .then(function(d){
                if(req.body.prodId){
                    var pid = ObjectId(req.body.prodId);
                    var index = d.cart.indexOf(pid);
                    if(index != -1)
                        d.cart.splice(index,1);
                    return Users.saveuser(d);                     
                }else{
                    var result = myResponse.generate(true,'send prodId in body (as string)',400,d.cart);
                    res.send(result);                    
                } 
           
        })
            .then(function(d){
                var result = myResponse.generate(false,'Product removed from Cart',200,d.cart);
                res.send(result);
        })
            .catch(function(e){
                var result = myResponse.generate(true,'Product could not be removed from Cart',503,null);
                res.send(result);             
        });
        
        
    });
    
    
    app.get('*', function(req, res, next) {
        var err = new Error();
        err.status = 404;
        next(err);
    });
     
};






















