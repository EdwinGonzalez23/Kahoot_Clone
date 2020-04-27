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
//some new things I'll need
var mon = require('mongoose');
//express.engine('html',require('ejs').renderFile);
//
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
    name: req.body.Name,
    score: 0,
    previousScoreAward: 0,
    submittedAnswers: [],
    rightAnswers: []
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
    //var answerJSON = JSON.parse(msg);
    //console.log(answerJSON)
    // console.log(msg);

    // for(var key in players){
    //   //console.log(players[key]['id'] + '  0-0-0 ' +  );
    //   if(players[key]['id'] == answerJSON['id']){
    //     players[key].questionAnswers.push(
    //         {qindex: answerJSON['answer'], time: answerJSON['time']}
    //       )
    //       console.log(players[key].questionAnswers[questionNumber])
    //       //console.log(questions[questionNumber])

    //     players[key].score += answerJSON['time'] * 100
    //   }
    //}

    //console.log(players)


    // players[].answers.push.msg;
    // console.log()
  })

  // hostStartButton.html
  socket.on('startGame', function (msg) {
    io.emit('ask-to-start-game', 'game');
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

let MAX_QUESTION_TIME = 30;
let TIMER = 5; // for start of game
let gameStart = false;
let numAnswered = 0;

// Just here until we have questions coming in from database
let questions = [
  //   {
  //     "_id": "5e899f49155b058abe1715ce",
  //     "question": "War fought from 1754 to 1763 between Britain and France that started in the Americas and moved to Europe.",
  //     "answers": ["French & Indian war", "American Civil War", "Spanish-American War", "American Civil War"], "answerindex": 0
  //   },
  //   {
  //     "_id": "5e8d1857d1e6f77c4a17c177",
  //     "question": "what is hello world",
  //     "answers": ["something", "something else", "neither", "another"], "answerindex": 2
  //   }
];

for (var q = 0; q < 3; q++) {
  questions.push(
    {
      "_id": "5e899f49155b058abe1715ce",
      "question": `Question Q${q} Right answer is 1`,
      "answers": ["1", "2", "3", "4"], "answerindex": 0
    }
  )
}


var questionNumber = -1;



express.get('/sendQuestionsFromHost', function (req, res) {

  if (gameStart === false) {
    console.log("Host Started Game");
    gameStart = true;
    gameLoop();
  }
  res.end();
})

express.get('/game', function (req, res) {
  res.sendFile(__dirname + '/game.html')

})

express.get('/idRequest', function (req, res) {
  console.log("Emitting id: " + req.session.player.id + "To: " + req.session.player.name);
  let JSONdata = JSON.stringify({ id: req.session.player.id });
  res.send(JSONdata);
})


express.get('/scoreboard', function (req, res) {
  res.sendFile(__dirname + '/scoreboard.html')
})

express.get('/scoreboard-score-get', function (req, res) {
  res.send(JSON.stringify(players));
  res.end();
})
express.get('/hostStartButton', function (req, res) {
  res.sendFile(__dirname + '/hostStartButton.html')
})

express.post('/playerAnswer', function (req, res) {
  let maxScore = 10000;
  if (questionNumber >= 0) {
    let playerAnswer = req.body.answer
    //console.log(playerAnswer + " " + questions[questionNumber].answerindex);
    for (var key in players) {
      if (players[key].submittedAnswers.includes(questionNumber) === false) {
        players[key].submittedAnswers.push(questionNumber);
      }
      let scoreChange = 0;
      let submitNumber = parseInt(req.body.submitNumber);
      let isCorrect = playerAnswer == questions[questionNumber].answerindex
      let isThisPlayer = req.body.id == players[key]['id'];
      console.log(submitNumber);

      if (isThisPlayer === true) {
        if (submitNumber > 1) {
          if (isCorrect === true) {
            if (players[key].rightAnswers.includes(questionNumber)) {
              console.log("Had right Answer Already");
            } else {
              players[key].rightAnswers.push(questionNumber);
              console.log("Pushed Right Answer")
              scoreChange = maxScore - ((MAX_QUESTION_TIME - parseInt(req.body.time)) * (MAX_QUESTION_TIME * 10));
              players[key]['previousScoreAward'] = scoreChange;
            }

          }
          if (isCorrect === false) {
            if (players[key].rightAnswers.includes(questionNumber) === true) {
              players[key].rightAnswers.splice(players[key].rightAnswers.indexOf(questionNumber));
              console.log("Had right answer, chose wrong one. Tried to splice: " + questionNumber);
              scoreChange = -players[key]['previousScoreAward'];

              players[key]['previousScoreAward'] = scoreChange;
            }
          }
        } else {
          players[key]['previousScoreAward'] = 0;
          if (isCorrect === true) {
            players[key].rightAnswers.push(questionNumber);
            console.log("Pushed Right answer")
            if ((MAX_QUESTION_TIME - parseInt(req.body.time)) <= 5) {
              scoreChange = maxScore;
            } else {
              scoreChange = maxScore - ((MAX_QUESTION_TIME - parseInt(req.body.time)) * (MAX_QUESTION_TIME * 10));
            }
            players[key]['previousScoreAward'] = scoreChange;
          }
          numAnswered++;
          io.sockets.emit('numPlayerAnswers', numAnswered);

          }

        // console.log(scoreChange);

        // console.log(players[key].rightAnswers);
        // console.log("Previous Score Award: " + players[key]['previousScoreAward'])
        players[key]['score'] += scoreChange;

        // console.log(players[key].submittedAnswers);
        // console.log(players[key]['score']);
        // console.log("---------------------------------")
        break;
      }
    }
  }
  res.send('Got it');
})

express.post('/get-score', function(req, res) {
  console.log(req.body.id)
  for(var key in players){
    if(players[key]['id'] === req.body.id){
      res.send(players[key]['score'].toString());
      break;
    }
  }
  res.end();
})


function gameLoop() {
  var servingQuestion = setInterval(function () {
    let questionToSend = {};
    io.sockets.emit('timer', TIMER);
    TIMER--;
    if (TIMER === -1) {
      TIMER = MAX_QUESTION_TIME;
      numAnswered = 0;
      if (questionNumber < questions.length - 1) {
        questionNumber++;
        questionToSend = {
          Q: questions[questionNumber]['question'],
          a1: questions[questionNumber]['answers'][0],
          a2: questions[questionNumber]['answers'][1],
          a3: questions[questionNumber]['answers'][2],
          a4: questions[questionNumber]['answers'][3]
        }
      } else {
        //sends redirect to all in game to scoreboard
        io.sockets.emit('go-to-scoreboard', 'scoreboard');
        questionNumber = 0;
        clearInterval(servingQuestion); // not sure if this always works, so TODO test this hard
      }
      io.sockets.emit('question', questionToSend);
      io.sockets.emit('numPlayerAnswers', numAnswered);


    }
  }, 1000);

}



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
express.get('/addquestion/*',function(req,res){
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
express.get('/getcollections',function(req, res){
    if(!req.session.user){
    //    return res.redirect('/host');
    res.send(JSON.stringify({"null":"null"}));
    }
    else{
        let dbn = "mcgame";
        let mcollection = "my_collections";
        //var mydocid = req.query.collectionsid;
        var mydocid = req.session.user.documentid;
        //let mq = {userdocumentid:"c15bZehI4lMwSsviGn2YULdV"};
        let mq = {userdocumentid:mydocid};
        exports.fineoneindoc(mcollection,dbn,mq,function(docs){
            //console.log(docs);//for testing remove after some tests
            //console.log(docs[0]['collections']);//should only have on collection
            //res.jsonp(docs);
            //docs = docs.replace(/_/g," ");
            //res.send(JSON.stringify(docs[0]['collections'].replace(/_/g," ")));
            res.send(JSON.stringify(docs[0]['collections']));
        })
        //res.redirect('/game');
    }
})
//express.get('/addquestiontoset')
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
});
express.get('/yourquestionsets',function(req,res){
    if(!req.session.user){
        return res.redirect('/host');
    }
    else{//dirty way to do it | should replace this with io.emit?
        
        return res.sendFile(__dirname + '/yourquestionsets.html');
        //res.render('yourquestionsets',{docid:req.session.user.documentid},function(err,html){
        //});
        //express.render('yourquestionsets',{},function(err,html){
        //express.render('yourquestionsets',{docid:req.session.user.documentid},function(err,html){
        //});
    }
})
express.post('/userdocid',function(req,res){
    if(!req.session.user){
        //return res.redirect('/host');
    }
    else{
        //res.json({udata:req.session.user.documentid});
        var myres = req.session.user.documentid;
        res.send(myres);
    }
});

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
