const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const db = require('./config/mongoserver.js');


db.on('connected', function () {
    console.log('Connected to Ecomm DB');
});

const routes = require('./app/routes/route');

var app = express();

app.use(bodyParser.json());
app.use(cookieParser());

routes(app);

//Error handling
app.use(function(err, req, res, next) {
    if (err.status == 404)
        res.status(404).json({ error: true,
                               message: 'PAGE DOES NOT EXIST', 
                               status: 404,
                               data:null
                             });
/*    else if (err.status ==400)*/
        res.json({error : "BAD JSON"});
});

app.listen(3000,function(req,res) {
    console.log('Listening at 3000 port');
})