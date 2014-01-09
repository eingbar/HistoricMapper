var mongoose = require('mongoose');
var hash = require('../util/hash');
var Schema   = mongoose.Schema;


var UserSchema = mongoose.Schema({
	firstName:  String,
	lastName:   String,
	email:      String,
	screenName: String,
	userName:   String,
	approved:   Boolean,
	emailVerified:   Boolean,
	salt:       String,
	hash:       String,
	ModDailyDigest   : {type: Boolean, default: true},
	resetPasswordID: { type: Schema.Types.ObjectId },
	resetPasswordTimeout: Date,
	userLevel:  { type: Number, default: 0 },
	facebook:{
		id:       String,
		email:    String,
		name:     String
	},
	twitter:{
		id:       String,
		email:    String,
		name:     String
	}
});

UserSchema.statics.resetPassword = function (userID, next) {
	var resetPasswordID = new mongoose.Types.ObjectId;
	var randomstring = Math.random().toString(36).slice(-8);
	this.findById(userID, function(err, user){
		// if(err) throw err;
		if(err) return next(err);
		if(!user) return next('User not found');
		hash(randomstring, user.salt, function(err, hash){
			if(err) return next(err);
			user.hash = hash;
			user.resetPasswordID = resetPasswordID;
			var days = 7; 
            user.resetPasswordTimeout = new Date(Date.now() + days*24*60*60*1000);

			user.save(function (err) {
				if(err) return next(err);
				next(null, {resetId: resetPasswordID, tempPassword: randomstring})
			});
		});
	});
}

UserSchema.statics.generateResetID = function (userID, next) {
	var resetPasswordID = new mongoose.Types.ObjectId;
	var randomstring = Math.random().toString(36).slice(-8);
	this.findById(userID, function(err, user){
		// if(err) throw err;
		if(err) return next(err);
		if(!user) return next('User not found');
		hash(randomstring, user.salt, function(err, hash){
			if(err) return next(err);
			//user.hash = hash;
			user.resetPasswordID = resetPasswordID;
			var days = 7; 
            user.resetPasswordTimeout = new Date(Date.now() + days*24*60*60*1000);

			user.save(function (err) {
				if(err) return next(err);
				next(null, {resetId: resetPasswordID, tempPassword: randomstring})
			});
		});
	});
}

UserSchema.statics.changePassword = changePassword;

function changePassword (userID, password, next) {
	var User = mongoose.model("User");
	try{
		verifyPasswordComplexity(password, function (err) {
			if(err) return next(err);
			User.findById(userID, function(err, user){
				// if(err) throw err;
				if(err) return next(err);
				if(!user) return next('User not found');
				hash(password, user.salt, function(err, hash){
					if(err) return next(err);
					user.hash = hash;
					if (user.resetPasswordID) {user.resetPasswordID = null;};
					user.save(function (err) {
						if(err) return next(err);
						next(null);
					});
				});
			});
		});	
	}
	catch(err){
		return next(err);
	}	
}

UserSchema.statics.userChangePassword = function (email, currentPassword, newPassword, next) {	
	var User = this;
	try{
		if (!currentPassword) {return next(null)};
		validateUserPassword(email, currentPassword, function (err, user, message) { //message = message.message
			if(err) return next(err);
			if (!user) {return next(message.message)};
			changePassword(user._id, newPassword, function (err) {
				if(err) return next(err);
				return next(null);
			});
		});
	}
	catch(err){
		return next(err);
	}	
}

UserSchema.statics.checkDBforUser = function (type, value, existing, done) {
	var q = {};
	q[type] = value;
	var existing = existing;
	if (!existing) {
		this.findOne(q, function(err, user){
			// if(err) throw err;
			if(err) return done(err);
			if(!user) return done(null, false);
			else return done(null, true);
		});
	} else {
		if (type == 'email') {
			//{$and:[{email: {$ne: "ajohnson@gnomon.com"}}, {email: "columbus@adamlj.com"}]}
			var query = {$and:[{email: {$ne: existing}}, {email: value}]};
			this.findOne(query, function(err, user){
				// if(err) throw err;
				if(err) return done(err);
				if(!user) return done(null, false);
				else return done(null, true);
			});
		} else if (type == 'screenName') {
			q.email = {'$ne': existing};
			this.findOne(q, function(err, user){
				// if(err) throw err;
				if(err) return done(err);
				if(!user) return done(null, false);
				else return done(null, true);
			});
		};
	}
	
}

UserSchema.statics.signup = function(firstName, lastName, screenName, email, password, done){
	var User = this;
	verifyPasswordComplexity(password, function (err) {
		if(err) return done(err);
		hash(password, function(err, salt, hash){
			if(err) throw err;
			// if (err) return done(err);
			User.create({
				firstName : firstName,
				lastName: lastName,
				screenName: screenName,
				email : email,
				userLevel: 0,
				salt : salt,
				approved: true,
				emailVerified: false,
				hash : hash
			}, function(err, user){
				if(err) throw err;
				// if (err) return done(err);
				done(null, user);
			});
		});
	});
}


UserSchema.statics.isValidUserPassword = validateUserPassword;

function validateUserPassword (email, password, done) {
	var User = mongoose.model("User");
	User.findOne({email : email}, function(err, user){
		// if(err) throw err;
		if(err) return done(err);
		if(!user) return done(null, false, { message : 'Incorrect email.' });
		if(!user.approved) return done(null, false, { message : 'This account is not approved, please contact the site administrator.' });
		if(!user.emailVerified) return done(null, false, { message : 'Email verification is not complete. Check your inbox, <a href="/user/resendEmail/' + user.email + '">or click here to have the email resent</a>' });
		hash(password, user.salt, function(err, hash){
			if(err) return done(err);
			if(hash == user.hash) return done(null, user);
			done(null, false, {
				message : 'Incorrect password'
			});
		});
	});
}

UserSchema.statics.verifyUser = function (id, done) {
	this.findOne({_id: id}, function (err, user) {
		if(err) return done(err);
		if (!user) {done('User Not Found')}
		else {
			user.emailVerified = true;
			user.save(function (err) {
				if(err) return done(err);
				done(null, user);
			});
		}
	});
}



UserSchema.statics.findOrCreateFaceBookUser = function(profile, done){
	var User = this;
	this.findOne({ 'facebook.id' : profile.id }, function(err, user){
		if(err) throw err;
		// if (err) return done(err);
		if(user){
			done(null, user);
		}else{
			User.create({
				email : profile.emails[0].value,
				facebook : {
					id:    profile.id,
					email: profile.emails[0].value,
					name:  profile.displayName
				}
			}, function(err, user){
				if(err) throw err;
				// if (err) return done(err);
				done(null, user);
			});
		}
	});	
}

function verifyPasswordComplexity (password, next) {
	if (password.length < 8) {return next("Password not long enough. Must be at least 8 characters long.");};
	var hasUpperCase = /[A-Z]/.test(password);
	var hasLowerCase = /[a-z]/.test(password);
	var hasNumbers = /\d/.test(password);
	var hasNonalphas = /\W/.test(password);
	if (hasUpperCase + hasLowerCase + hasNumbers + hasNonalphas < 3)
	{
		return next("Invalid password. The password must then contain characters from at least 3 of the following 4 rules:<ol><li>Upper case</li><li>Lower case</li><li>Number</li><li>Special character</li></ol>");
	}
	return next(null);
}

var User = mongoose.model("User", UserSchema);
module.exports = User;
