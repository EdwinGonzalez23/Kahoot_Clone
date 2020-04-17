var mon = require('mongoose');
var bcrypt = require('bcrypt');

var UserSchema = new mon.Schema({
    username:{
        type: String,
        unique: true,
        required: true,
        trim: true
    },
    password:{
        type: String,
        required: true
    },
    documentid:{
        type: String,
        required: true
    }
});
UserSchema.statics.authenticate = function (username, password, callback){
    User.findOne({username: username}).exec(function(err, user){
        if(err){
            console.log("some err ocurred")
            return callback(err)
        }else if(!user){
            console.log("not match")
            var err = new Error("username/password combination is incorrect");
            err.status = 401;
            return(callback(err));
        }
        bcrypt.compare(password,user.password, function(err, result){
            if(result == true){
                return callback(null, user)
            }
            else{
                return callback();
            }
        })
    })
}

UserSchema.pre('save', function(next){
    var user = this
    bcrypt.hash(user.password, 10, function(err,hash){
        if(err){
            return next(err);
        }
        user.password = hash;
        next();
    })
});
var User = mon.model('User',UserSchema);
module.exports = {User};