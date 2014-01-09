
/*
 * GET users listing.
 */
// var User = require('../schemas/UserSchema');
// var HistoricSite = require('../schemas/HistoricSiteSchema');

var mongoose = require( 'mongoose' );
var User = mongoose.model( 'User' );
var HistoricSite = mongoose.model( 'HistoricSite' );

exports.list = function(req, res){
  res.send("respond with a resource");
};

exports.login = function(req, res){
  res.render('user/login', {title: 'Account Login'});
};

exports.getUserDetails = function(req, res){ 
  User.findById(res.locals.user._id, function (err, user) {
    if( err ) return next( err );
    res.render('user/details', {title: 'Edit Your User Details', model: user});
  });
};

exports.postUserDetails = function(req, res){ 

  User.findById(res.locals.user._id, function (err, user) {
    if( err ) return next( err );    

    User.userChangePassword(user.email, req.body.currentPassword, req.body.newPassword, function (err) {
      if (err) {req.flash('error', err); res.render('user/details', {title: 'Edit Your User Details', model:req.body, flashErrors: req.flash('error')}); return;};
      if (req.body.currentPassword) {req.flash('success', 'User Password Updated.');};
      if (req.body.email != user.email) {
        user.emailVerified = false
      };      
      user.firstName = req.body.firstName;
      user.lastName = req.body.lastName;
      user.email = req.body.email; //need to re-verify??
      user.screenName = req.body.screenName;
      user.ModDailyDigest = (req.body.ModDailyDigest === "true");
      user.save(function (err) {
        if (err) {req.flash('error', err); res.render('user/details', {title: 'Edit Your User Details', model:req.body, flashErrors: req.flash('error')}); return;};
        if (!user.emailVerified) {
          var mailer = require('../config/mailer');
          mailer.sendVerificationEmail(user, function (err) {
            if( err ) return next(err);
            req.flash('success', 'Email address updated. Verification email has been resent. Please check your email.');
            req.logout();
            res.redirect('/user/login');
          });          
        } else {
          req.flash('success', 'User details have been updated.');
          res.redirect('/user/details');
        };
      })
    });
  });  
};

exports.getForgotPassword = function(req, res, next){
  res.render('user/forgotpassword', {title: 'Forgot User Password'});
};

exports.postForgotPassword = function(req, res, next){
  User.findOne({email: req.body.email}, function (err, user) {
    if( err ) return next( err );
    if (!user) {
      req.flash('error', 'That email address was not found.');
      res.redirect('/user/forgotpassword');
      return;
    };
    User.resetPassword(user._id, function (err, results) {
      if( err ) return next(err);
      var mailer = require('../config/mailer');
      mailer.sendPasswordResetEmail(user.email, results.resetId, function (err) {
        if( err ) return next(err);
        req.flash('success', 'Your password has been reset, and an email with further instructions has been sent to the address provided.');
        res.redirect( '/user/login' );
      });
    });
  });
};

exports.getDraftPlaces = function(req, res, next){
  HistoricSite.find({ "Status" : "Draft", "DataOwner" : res.locals.user._id, "Obsolete" : false }, function (err, draftPlaces) {
    res.render('user/draftPlaces', {title: 'My Draft Places', model: draftPlaces});
  });  
};

exports.loginPost = function(req, res, next) {
  // If this function gets called, authentication was successful.
  // `req.user` contains the authenticated user.
  if (req.session.returnToURL) {
    var url = req.session.returnToURL;
    req.session.returnToURL = false;
    res.redirect(url);
  }else{
    res.redirect('/');
  }    
};

exports.logout = function(req, res, next){
  req.logout();
  res.redirect('/');
};

exports.signup = function(req, res, next){
  res.render('user/signup', {title: 'Account Signup', messages: req.flash('error'), model: {}});
};

exports.resendEmail = function (req, res, next) {
  var emailAddress = req.params.email;
  User.findOne({email: emailAddress}, function (err, user) {
    if(err) return next(err);
    if (!user) {res.send('User Not Found', 404); return;}
    else {
      var mailer = require('../config/mailer');
      mailer.sendVerificationEmail(user, function (err) {
        if(err) return next(err);
        req.flash('success', 'Verification email has been resent');
        res.redirect('/user/login');
      });      
    }
  });
}

exports.signupPost = function(req, res, next){
  //firstName, lastName, screenName email, password,
	User.signup(req.body.firstName, req.body.lastName, req.body.screenName, req.body.email, req.body.password, function(err, user){
    if (err) {
      req.flash('error', err);
      //res.redirect('/user/signup');
      res.render('user/signup', {title: 'Account Signup', model:req.body, flashErrors: req.flash('error')});
      return;
    };
    
    var mailer = require('../config/mailer');
    mailer.sendVerificationEmail(user, function (err) {
      res.render('user/verifyEmailIncomplete', {title: 'Email Verification In Progress', id: user._id});
    });
	});
};

exports.verify = function (req, res, next) {
  User.verifyUser(req.params.id, function (err, user) {
    if (err && err != "User Not Found") {throw err}
    else if (err == "User Not Found") {res.render('404', { url: req.url, title:'Error 404: File Not Found' }); return;}

    req.flash('success', 'Your email has been verified. Please log in with the form below.');
    res.redirect('/user/login');
  });
}

exports.checkDB = function(req, res, next){
  //:type/:value
  var email = req.query.email;
  var screenName = req.query.screenName;
  var existing = req.query.existing;

  if (!(email) && !(screenName)) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(false));
  } else {
    if (email) {
      User.checkDBforUser('email', email, existing, function (err, result) {
        if( err ) return next( err );
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(!result));
      });      
    } else if (screenName) {
      User.checkDBforUser('screenName', screenName, existing, function (err, result) {
        if( err ) return next( err );
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(!result));
      }); 
    }
  }  
};

exports.getResetPasswordVerify = function (req, res, next) {  
  User.find({resetPasswordID: req.params.id}, function (err, users) {
    if( err ) return next( err );
    var user;
    if (users.length > 0) {user = users[0]};
    if (!user) {return next( {status: 404, description: "File Not Found"} )};

    res.render('user/resetpassword/verify', {title: 'Password Reset'});
  });  
}

exports.postResetPasswordVerify = function (req, res, next) {
  //save new password to db and send to login page
  User.find({resetPasswordID: req.params.id}, function (err, users) {
    if( err ) return next( err );
    var user;
    if (users.length > 0) {user = users[0]};
    if (!user) {return next( {status: 404, description: "File Not Found"} )};
    
    User.changePassword(user._id, req.body.password, function (err) {
      if (err) {
        req.flash('error', err);
        res.redirect('/user/resetpassword/verify/' + req.params.id);
        return;
      };

      req.flash('success', 'Your password has been reset. Please log in with the form below.');
      res.redirect('/user/login');
    });
  });
}