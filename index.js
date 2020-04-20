var express = require('express')();
var http = require('http').Server(express);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var stdin = process.openStdin();
const fs = require("fs")
var bodyParser = require('body-parser');
var multer = require('multer');
var upload = multer();
var session = require('express-session');
var cookieParser = require('cookie-parser');
var mon = require('mongoose');
const {
v4: uuidv4
} = require('uuid');

//need this for user schema
const{User} = require('./model/user');

express.use(bodyParser.json());
express.use(bodyParser.urlencoded({
extended: true
}));
express.use(upload.array());
express.use(cookieParser());
express.use(session({
secret: "Your secret key"
}));
var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017';
var dburl = "mongodb://localhost:27017/kahoot";
mon.connect(dburl);
var players = []
// Good thing this isn't an app we are selling
// Mimic Registered Users
var users = [{
id: 4567,
        name: 'bob',
        password: 4567
},
{
id: 1234,
    name: 'jane',
    password: 1234
}
]
var pin = 1234

// Player Login Screen
express.get('/', function (req, res) {
        if (req.session.player) {
        res.redirect('/lobby')
        } else {
        res.sendFile(__dirname + '/login.html');
        }
        });

// Player Login Form Submit
express.post('/player-login', function (req, res) {
        var player = {
id: uuidv4(),
name: req.body.Name
}
if (!playerLoggedIn(player.id) && req.body.PIN == pin) {
players.push(player)
req.session.player = player
res.redirect('/lobby')
} else {
res.redirect('/')
}
})

// Player Logout Form Submit
express.get('/player-logout', function (req, res) {
    logout(req.session.player.id)
    io.emit('Game Data', players);

    req.session.destroy(function () {
        console.log('user logged out')
    })
    res.redirect('/')
})

// Game Lobby (waiting area)
express.get('/lobby', function (req, res) {
    if (req.session.player) {
        res.sendFile(__dirname + '/lobby.html');
    } else {
        res.redirect('/')
    }
})

// Host Login Screen
express.get('/host', function (req, res) {
    if (req.session.user) {
        res.redirect('/create')
    } else {
        res.sendFile(__dirname + '/host.html')
    }
})

// Host Logout Form Submit
express.get('/host-logout', function (req, res) {
        req.session.destroy(function () {
                console.log('user logged out')
                })
        res.redirect('/host')
        })

// Host Login Form Submit
/*
express.post('/host-login', function (req, res) {
        if (!req.body.Name || !req.body.Password || !req.body.Id) {
        // Redirect to an error page or same login page
        } else {
        var query = {
id: Number(req.body.Id),
password: Number(req.body.Password)
}

// Comment this out for now Mongo
MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("kahoot");
    dbo.collection("user").findOne(query, function (err, result) {
            if (err) throw err
            if (result == null) {
            return res.redirect('/host')
            } else if (result != null) {
            db.close();
            req.session.user = result.Id
            console.log('looged in as ')
            console.log(result)
            return res.redirect('/create')
            }
            });
    })
// for (var key in users) {
//   if (users[key].id == req.body.Id && users[key].password == req.body.Password) {
//     req.session.user = users[key]
//     return res.redirect('/create')
//   }
// }
// return res.redirect('/host') // Failed Login
}
})
*/
// Host Create Game Screen
express.get('/create', function (req, res) {
        if (req.session.user) {
        res.sendFile(__dirname + '/create.html')
        } else {
        res.redirect('/host')
        }
        })

io.on('connection', function (socket) {
        // Send Players to Client
        io.emit('Game Data', players);

        // Also added from Joey,
        // Could potentially be done
        // instead with express get
        socket.on('answerJSON', function (msg) {
                console.log(msg);
                })

        });

http.listen(port, function () {
        console.log('listening on *:' + port);
        });

function playerLoggedIn(id) {
    for (var key in players) {
        if (players[key].id == id) {
            return true
        }
    }
    return false
}

function logout(id) {
    for (var i = players.length - 1; i >= 0; i--) {
        if (players[i].id == id) {
            players.splice(i, 1);
            console.log('removed player: ' + id)
        }
    }
}

// START JOEY ADD

let MAX_QUESTION_TIME = 10;
let TIMER = MAX_QUESTION_TIME;
let gameStart = false;

// Just here until we have questions coming in from database
let questions = [
{
    "_id": "5e899f49155b058abe1715ce",
        "question": "War fought from 1754 to 1763 between Britain and France that started in the Americas and moved to Europe.",
        "answers": ["French & Indian war", "American Civil War", "Spanish-American War", "American Civil War"], "answerindex": 0
},
{
    "_id": "5e8d1857d1e6f77c4a17c177",
    "question": "what is hello world",
    "answers": ["something", "something else", "neither", "another"], "answerindex": 0
}
]

express.get('/game', function (req, res) {

        if (gameStart === false) {
        gameStart = true;
        let questionNumber = 0;

        // continuously called once game starts
        var game = setInterval(function () {
                let questionToSend = {};

                io.sockets.emit('timer', TIMER);
                TIMER--;

                if (TIMER === -1) {
                TIMER = MAX_QUESTION_TIME;

                // serve next questions

                if (questionNumber < questions.length) {
                questionToSend = {
Q: questions[questionNumber]['question'],
a1: questions[questionNumber]['answers'][0],
a2: questions[questionNumber]['answers'][1],
a3: questions[questionNumber]['answers'][2],
a4: questions[questionNumber]['answers'][3]
}
} else {
questionToSend = {
Q: "gameover",
   a1: "gameover",
   a2: "gameover",
   a3: "gameover",
   a4: "gameover"
}

}

//console.log(questionToSend);

io.sockets.emit('question', questionToSend);
questionNumber++;

}
}, 1000);


}

res.sendFile(__dirname + '/game.html')

})


express.get('/idRequest', function (req, res) {
        console.log("Emitting id: " + req.session.player.id + "To: " + req.session.player.name);
        let JSONdata = JSON.stringify({id : req.session.player.id});
        res.send(JSONdata);
        })

// Also added a socket message  higher up
// End Joey Add
// alex starts here
express.get('/createuser',function(req, res){//used for creating host user
    res.sendFile(__dirname +'/createuser.html')
});

express.post('/host/makenewhost',(req,res,next)=>{
    mon.connect(dburl);
    d_id = makeid();
    var user = new User({
        username : req.body.username,
        password : req.body.password,
//documentid : 'laksjgiqregianrt76452634',
        documentid : d_id,
});
    User.create(user,function(err,user){
        if(err){
            //console.log("we have error");
            return next(err);
        }
        else{
            //console.log("did we make it here?")
            //console.log(user._id);
            //return res.sendFile(__dirname + '/loginhost.html');
        }
    });
    //return res.sendFile(__dirname +'/loginhost.html');
    //mon.close();
    res.redirect('/host');

});
express.post('/host-login', function (req, res, next) {
    
    //console.log("trying to authenticate: this got called");
    //console.log(req.body.username);
    //console.log(req.body.password);
    mon.connect(dburl);
    if (req.body.username && req.body.password) {
        User.authenticate(req.body.username, req.body.password, function (err, user) {
            if (err || !user) {
                var err = new Error("Bad username and password combination");
                return next(err);
            }
            else {
                //console.log(user.documentid);
                //req.session.documentid = user.documentid;
                //console.log(req.session.documentid);
                req.session.user = user;
                //return res.redirect("you are logged in");
                //mon.close();
                return res.redirect('/host');
            }
        })
    }
});

//express.get('/loginhost',function(req,res){
//        return res.sendFile(__dirname + "/loginhost.html");
//        })

express.get('/createquestions',function(req,res){
    if(!req.session.user){
        return res.redirect('host');
    }
    return res.sendFile(__dirname + '/createquestions.html');
})
express.post('/processquestions',function(req,res){
    //console.log(req.body);//for checking remove later
    if (!req.session.user) {
        res.redirect('/host');
    }
    //save questions to db
    //then redirect back to create game or something 
    return res.redirect("we tried to parse to console here");
});
express.post('/savequestionset',function(req,res){
    //first get user doc id
    if(!req.session.user){
        return res.redirect('/host');
    }
    //else{

    //}
});
express.get('/addquestion',function(req,res){
    if(!req.session.user){
        return res.redirect('host');
    }
    return res.sendFile(__dirname + '/addquestion.html');
})
function makeid(){
    const length = 24;
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; 
    var charslength = characters.length;
    for(var i = 0; i < length; i++){
        result += characters.charAt(Math.floor(Math.random() * charslength));
    }
    //console.log(result);//for checking
    return result;
}
express.get('/getquestions',function(req, res){
    if(!req.session.user){
        return res.redirect('/host');
    }
    var collection = req.query['collection']
    exports.getallindoc('test_questions','mcgame',function(docs){
        res.jsonp(docs);
    });
    //res.jsonp(collection);
    //res.jsonp("not yet implemented");
    //res.jsonp(retquestions);
});
/*express.get('/updateonerec',function(req,res){//for testing delete if necessary
    var myfuparray = ['this is one','this is two','this is four','this is five'];
    var mcollection= 'mydocs';
    var mdb= 'testupdate';
    //var mq= {mykey:'thisisnotit'};
    var mqkey = 'mykey';
    var mqvalue = 'someonehelpme';
    var mq = {mykey:mqvalue};
    var updateval = {$addToSet:{'somearr':{$each: myfuparray}}};
    exports.updateRecordArray(mcollection,mdb,mq,updateval,function(result){
        //console.log(result);
    });
    res.redirect('/host');
})*/
express.post('/updateonerec',function(req,res){
    var mcollection= req.body.collectionname;
    var mdb= req.body.whichdb;
    var myqkey = req.body.findkey;
    var myqvalue= req.body.findvalue;
    var mq = {myqkey:myqvalue};
    var arraykey = req.body.arrkey;
    var arrayvalue = req.body.arrlist;
    if(Array.isArray(arrayvalue)){
        var updateval = {$addToSet:{arraykey:{$each: arrayvalue}}};    
    }
    else {
        var updateval = { $addToSet: { arraykey: arrayvalue } };
    }
    exports.updateRecordArray(mcollection,mdb,mq,updateval,function(result){
        //console.log(result);
    });
    res.redirect('/host');
});
express.post('/insertquestion',function(req,res){
    var collectionname= req.body.collectionname;
    var mcollection = collectionname.replace(/ /g,"_");
    //var mdb= req.body.whichdb;
    var mdb = 'mcgame';
    //var myqkey = req.body.findkey;
    //var myqvalue= req.body.findvalue;
    //var mq = {myqkey:myqvalue};
    var ans0 = req.body.answer0;
    var ans1 = req.body.answer1;
    var ans2 = req.body.answer2;
    var ans3 = req.body.answer3;
    var questiontext = req.body.question;
    var correctindex = req.body.answerindex;
    var answerarray = [ans0,ans1,ans2,ans3];
    var insertval = {question:questiontext,answers:answerarray,answerindex:correctindex};
    //var arraykey = req.body.arrkey;
    //var arrayvalue = req.body.arrlist;
    
    exports.insertRecord(mcollection,mdb,insertval,function(result){
        //console.log(result);
    });
    res.redirect('/host');
})
exports.getallindoc = function(collection, dbname, callback){
    MongoClient.connect(url, function(err, client) {
        var dbo = client.db(dbname);
        //var cursor = db.collection('question');//.find();
        dbo.collection(collection).find({}).toArray(function(err,docs){
            //console.log("found");
            //exports.retquestions = function(){
            //    return docs;
            //}
            callback(docs);
            client.close();
        }); 
        
    });
}
exports.fineoneindoc = function(collection, dbname, myquery,callback){
    MongoClient.connect(url, function(err, client) {
        var dbo = client.db(dbname);
        //var cursor = db.collection('question');//.find();
        dbo.collection(collection).find(myquery).toArray(function(err,docs){
            //console.log("found");
            //exports.retquestions = function(){
            //    return docs;
            //}
            callback(docs);
            client.close();
        }); 
        
    });
}
//exports.makeCollection = function(){
//
//};
exports.updateRecordArray = function(collection,dbname,mquery,updatearray,callback){
    //var mquery = {documentid = userdocsid};
    MongoClient.connect(url,function(err, client){
        var dbo = client.db(dbname);
        dbo.collection(collection).update(mquery,updatearray,{upsert:true},function(err,result){
            if(err){
                console.log("error updating array. why?");
                throw err;
            }
            callback(result);
            client.close();
        });
    })
};
exports.insertRecord = function(collection,dbname,updatearray,callback){
    //var mquery = {documentid = userdocsid};
    MongoClient.connect(url,function(err, client){
        var dbo = client.db(dbname);
        dbo.collection(collection).insertOne(updatearray,function(err,result){
            if(err){
                console.log("error inserting array. why?");
                throw err;
            }
            callback(result);
            client.close();
        });
    })
};
// end alex add
