
/**
 * Module dependencies.
 */

var fs = require('fs');
var config = require('./config/config');
var express = require('express');
var http = require('http');
var path = require('path');
var flash = require('connect-flash');
var mailer = require('./config/mailer');

require( './db' );

var mongoose = require('mongoose'),
  passport = require("passport");
//test
var models_dir = __dirname + '/schemas';

fs.readdirSync(models_dir).forEach(function (file) {
  if(file[0] === '.') return; 
  require(models_dir+'/'+ file);
});

var cronJobs = require('./config/cronJobs');
var Auth = require('./config/middleware/authorization.js');
var app = express();

require('./config/passport')(passport/*, config*/);

// all environments
app.set('port', GLOBAL.AppPort || 30200);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.compress());
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.session({ secret: 'SomethingCoded' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.methodOverride());
app.use(flash());
app.use(function (req, res, next) {  
  res.locals.URLPath = req.path;
  res.locals.user = req.user;
  res.locals.flashErrors = req.flash('error');
  res.locals.flashWarning = req.flash('warning');
  res.locals.flashSuccess = req.flash('success');
  next();
});
app.locals({title: 'Historic Mapper'})
app.use(app.router);
//app.use(express.errorHandler());

// development only
if ('development' == app.get('env')) {
  
}
var cluster = require('./routes/cluster');
//app.get('/checkThis', cluster2.CheckThis);

var indexRoutes = require('./routes/index');
//var cluster = require('./routes/cluster');
app.get('/', indexRoutes.index);
app.get('/cluster', cluster.cluster);
app.get('/cluster/refresh', Auth.isAdministrator, cluster.getRefreshClusterData);
app.get('/historicdistricts/list', indexRoutes.historicDistricts);
app.get('/historicsites/list', indexRoutes.placesGeoJson);
app.get('/historicsites/import', Auth.isAdministrator, indexRoutes.importSites);
app.get('/historicDistricts/import', Auth.isAdministrator, indexRoutes.importDistricts);
app.get('/historicsites/importPhotos', Auth.isAdministrator, indexRoutes.importPhotos);

/*Site Management Routes*/
var sites = require('./routes/sites');
app.get('/sites', sites.index);
app.get('/sites/textsearch/:text', sites.textSearch);
app.get('/sites/thematictour/:text', sites.thematicTour);
app.get('/sites/details/:id', sites.details);
app.post('/sites/details/:id', sites.postDetails);
app.get('/sites/details/:id/comment/delete/:CommentID', Auth.isModerator, sites.getDeleteComment);
app.post('/sites/details/:id/comment/delete/:CommentID', Auth.isModerator, sites.postDeleteComment);

app.get('/sites/details/:id/document/upload', Auth.isAuthenticated, sites.getUploadDocument);
app.post('/sites/details/:id/document/upload', Auth.isAuthenticated, sites.postUploadDocument);
app.get('/sites/details/:id/document/edit/:DocumentID', Auth.isAuthenticated, sites.getEditDocument);
app.post('/sites/details/:id/document/edit/:DocumentID', Auth.isAuthenticated, sites.postEditDocument);
app.get('/sites/details/:id/document/delete/:DocumentID', Auth.isAuthenticated, sites.getDeleteDocument);
app.post('/sites/details/:id/document/delete/:DocumentID', Auth.isAuthenticated, sites.postDeleteDocument);

app.get('/sites/create', Auth.isAuthenticated, sites.getCreate);
app.post('/sites/create', sites.postCreate);
app.get('/sites/edit/:id', Auth.isAuthenticated, sites.getEdit);
app.post('/sites/edit/:id', Auth.isAuthenticated, sites.postEdit);
// app.get('/sites/delete/:id', sites.getDelete);
// app.post('/sites/delete/:id', sites.postDelete);
app.get('/sites/list', sites.list);
app.get('/sites/sitePopupData/:id', sites.getSitePopup);

/*User management routes*/
var user = require('./routes/user');
app.get('/user/login', user.login);
app.get('/user/forgotpassword', user.getForgotPassword);
app.post('/user/forgotpassword', user.postForgotPassword);
app.post('/user/login', passport.authenticate('local', { failureRedirect: '/user/login', failureFlash: true }), user.loginPost);
app.get('/user/logout', user.logout);
app.get('/user/signup', user.signup);
app.get('/user/checkDB', user.checkDB);
app.get('/user/verify/:id', user.verify);
app.get('/user/resendEmail/:email', user.resendEmail);
app.post('/user/signup', Auth.userExist, user.signupPost);
app.get('/user/details', Auth.isAuthenticated, user.getUserDetails);
app.post('/user/details', Auth.isAuthenticated, user.postUserDetails);
app.get('/user/drafts', Auth.isAuthenticated, user.getDraftPlaces);
app.get('/user/resetpassword/verify/:id', user.getResetPasswordVerify);
app.post('/user/resetpassword/verify/:id', user.postResetPasswordVerify);

/*Moderator Routes*/
var moderator = require('./routes/moderator');
app.get('/moderator/review', Auth.isModerator, moderator.reviewPending);
app.get('/moderator/content/approve/:siteID/:type/:contentID', Auth.isModerator, moderator.getApproveContent);
app.get('/moderator/content/reject/:siteID/:type/:contentID', Auth.isModerator, moderator.getRejectContent);
app.get('/moderator/content/delete/:siteID/:type/:contentID', Auth.isModerator, moderator.getDeleteContent);

/*Administrator Routes*/
var siteAdmin = require('./routes/admin');
app.get('/admin/users/', Auth.isAdministrator, siteAdmin.usersIndex);
app.get('/admin/users/edit/:id', Auth.isAdministrator, siteAdmin.getEditUsers);
app.post('/admin/users/edit/:id', Auth.isAdministrator, siteAdmin.postEditUsers);
app.get('/admin/keywords/', Auth.isAdministrator, siteAdmin.keywordsIndex);
app.get('/admin/keywords/edit/:id', Auth.isAdministrator, siteAdmin.getEditKeywords);
app.post('/admin/keywords/edit/:id', Auth.isAdministrator, siteAdmin.postEditKeywords);
app.post('/admin/keywords/create/', Auth.isAdministrator, siteAdmin.postCreateKeyword);
app.get('/admin/tours/', Auth.isAdministrator, siteAdmin.toursIndex);
app.get('/admin/tours/edit/:id', Auth.isAdministrator, siteAdmin.getEditTours);
app.post('/admin/tours/edit/:id', Auth.isAdministrator, siteAdmin.postEditTours);
app.post('/admin/tours/create/', Auth.isAdministrator, siteAdmin.postCreateTour);
app.get('/admin/districts/', Auth.isAdministrator, siteAdmin.getDistrictIndex);
app.get('/admin/districts/create/', Auth.isAdministrator, siteAdmin.getDistrictCreate);
app.post('/admin/districts/create/', Auth.isAdministrator, siteAdmin.postDistrictCreate);
app.get('/admin/districts/edit/:id', Auth.isAdministrator, siteAdmin.getDistrictEdit);
app.post('/admin/districts/edit/:id', Auth.isAdministrator, siteAdmin.postDistrictEdit);
app.get('/admin/deleteditems/', Auth.isAdministrator, siteAdmin.getDeletedItems);
app.get('/admin/deleteditems/undo/:id', Auth.isAdministrator, siteAdmin.undoDeletedItem);
app.get('/admin/deleteditems/delete/:id', Auth.isAdministrator, siteAdmin.processFullDeleteItem);

process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + err);
});

//Error 500 Middleware.
app.use(function(err, req, res, next){
    res.status(err.status || 500);
    if (typeof err == 'string') {
      err = {
        status: 500, 
        description: err
      };
    }
    else if (typeof err == 'object') {
      err = {
        status: 500, 
        description: JSON.stringify(err)
      };
    }
    else{
      err = {
        status: err.status || 500, 
        description: err.description || err
      };
    };  
    res.render('500', { error: err });
});

//Error 404 Middleware. This should always be the last route.
app.use(function(req, res, next){
    res.status(404);

    // respond with html page
    if (req.accepts('html')) {
        res.render('404', { url: req.url, title:'Error 404: File Not Found' });
        return;
    }

    // respond with json
    if (req.accepts('json')) {
        res.send({ error: 'Not found' });
        return;
    }

    // default to plain-text. send()
    res.type('txt').send('Not found');
});

http.createServer(app).listen(app.get('port'), '0.0.0.0', function(){
  console.log('Express server listening on port ' + app.get('port'));
});

