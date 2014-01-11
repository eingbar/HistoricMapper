var User = require('../../schemas/UserSchema');

exports.isAuthenticated = function (req, res, next){
    if(req.isAuthenticated()){
        next();
    }else{
        clearUploadedFiles(req);
        req.session.returnToURL = req.url;
        res.redirect('/user/login');
    }
}

exports.isModerator = function (req, res, next){
    if(req.isAuthenticated()){
        //res.locals.user
        if (res.locals.user.userLevel >= 50) {next();}
        else {
            req.flash('error', 'You do not have permissions to view the requested page.');
            res.redirect('/user/login');
        };
    }else{
        clearUploadedFiles(req);
        req.session.returnToURL = req.url;
        res.redirect('/user/login');
    }
}

exports.isAdministrator = function (req, res, next){
    if(req.isAuthenticated()){
        if (res.locals.user.userLevel >= 100) {next();}
        else {
            req.flash('error', 'You do not have permissions to view the requested page.');
            res.redirect('/user/login');
        };
    }else{
        clearUploadedFiles(req);
        req.session.returnToURL = req.url;
        res.redirect('/user/login');
    }
}

function clearUploadedFiles (req) {
    if (req.files) {
        var FileStorage = require('../../util/FileStorage');
        for (var property in req.files) {
            if (req.files[property].path) {
                FileStorage.deleteLocalFile(req.files[property].path, function (argument) { });
            };
        };
    };    
}

exports.userExist = function(req, res, next) {

    // User.or([{email: req.body.email}, {screenName: req.body.screenName}]).count(function (err, count) {
    User.find({ $or: [{email: req.body.email}, {screenName: req.body.screenName}] }).count(function (err, count) {
        if (count === 0) {
            next();
        } else {
            req.flash('error', 'That email address or screen name is already registered.');
            res.redirect('/user/signup');
        }
    });
}
