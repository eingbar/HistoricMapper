//http://www.nodemailer.com/
var nodemailer = require('nodemailer');
var _ = require('underscore');
//aws account CityOfEureka.CA@gnomon.com
//Access Key ID: AKIAJUNAQGECP3J3SHYQ
//Secret Access Key: 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

var transport = nodemailer.createTransport("SES", {
    AWSAccessKeyID: GLOBAL.AWSKey,
    AWSSecretKey: GLOBAL.AWSSecret
});

// var transport = nodemailer.createTransport("SMTP", {
//     host: "localhost",
//     secureConnection: false, // use SSL
//     port: 25
// });
//http://docs.aws.amazon.com/ses/latest/DeveloperGuide/mailbox-simulator.html
// transport.sendMail({
// 	to: 'bounce@simulator.amazonses.com',
// 	from: GLOBAL.supportEmail,
// 	subject: 'Tesst',
// 	html: 'test'
// }, function (err, response) {
// 	if(error){
//         console.log(error);
//     }else{
//         console.log("Message sent: " + response.message);
//     }
// });

function sendMail (email, next) {
	var mongoose = require( 'mongoose' );
	var User = mongoose.model( 'User' );
	User.count({email: email.to, emailLocked: true}, function (err, count) {
		if (err) {return next(err)};
		if (count == 0) {
			email.headers = _.extend(email.headers || {}, {"X-Sent-To": email.to});
			transport.sendMail(email, next);
		} else {
			return next('The email address "' + email.to + '" has been locked, and email can not be sent to it. Please contact an administrator for help.');
		};
	});	
}

exports.sendMail = function (email, next) {
	sendMail (email, next);
};

exports.sendPasswordResetEmail = function (to, resetID, next) {
	sendMail({
		to: to,
		from: GLOBAL.supportEmail,
		subject: 'Password Reset',
		html: '<p>Your password for <a href="' + GLOBAL.SiteURL + '">' + GLOBAL.SiteName + '</a> has been reset.</p> \n <p>Click the following link to complete the reset process and log in: <a href="' + GLOBAL.SiteURL + '/user/resetpassword/verify/' + resetID + '">' + GLOBAL.SiteURL + '/user/resetpassword/verify/' + resetID + '</a></p>'
	}, next);  
};

exports.sendVerificationEmail = function (user, next) {
  sendMail({
    to: user.email,
    from: GLOBAL.supportEmail,
    subject: 'Email Verification',
    html: '<p>Thank you for registering an account with <a href="' + GLOBAL.SiteURL + '">' + GLOBAL.SiteName + '</a></p> \n <p>Click the following link to complete your registration: <a href="' + GLOBAL.SiteURL + '/user/verify/' + user._id + '">' + GLOBAL.SiteURL + '/user/verify/' + user._id + '</a></p>'
  }, next);  
};

exports.sendSiteApprovedEmail = function (dataOwner, site, next) {
	var emailString = '<p>Greetings,</p><p>A place that you submitted to the moderators for review has been approved!</p>';
	emailString += '<p>You may follow this link <a href="' + GLOBAL.SiteURL + '/sites/details/' + site._id + '">' + GLOBAL.SiteURL + '/sites/details/' + site._id + '</a> to view the published place.</p>';
	emailString += '<p>Thank you,<br>The ' + GLOBAL.SiteName + ' Administrators<br>';
	emailString += '<a href="' + GLOBAL.SiteURL + '/">' + GLOBAL.SiteURL + '/</a></p>';

	sendMail({
		to: dataOwner.email,
		from: 'The ' + GLOBAL.SiteName + ' Administrators <' + GLOBAL.supportEmail + '>',
		subject: GLOBAL.SiteName + ' Submitted Place Approved!',
		generateTextFromHTML: true,
		html: emailString
	}, next);  
};

exports.sendSiteSentBackEmail = function (dataOwner, site, next) {

	var emailString = '<p>Greetings,</p><p>A place that you submitted to the moderators for review has been sent back to you.</p>';
	emailString += '<p>You may follow this link <a href="' + GLOBAL.SiteURL + '/sites/edit/' + site._id + '">' + GLOBAL.SiteURL + '/sites/edit/' + site._id + '</a> to edit the submitted place. You are free to make changes and submit the place again.</p>';
	if (site.InternalNotes) {
		emailString += '<p>The Contributor/Moderator Internal Notes:<br>';
		emailString += '"' + site.InternalNotes.replace(/\n/g, '<br />') + '"</p>';
	};
	emailString += '<p>Thank you,<br>The ' + GLOBAL.SiteName + ' Administrators<br>';
	emailString += '<a href="' + GLOBAL.SiteURL + '/">' + GLOBAL.SiteURL + '/</a></p>';

	sendMail({
		to: dataOwner.email,
		from: 'The ' + GLOBAL.SiteName + ' Administrators <' + GLOBAL.supportEmail + '>',
		subject: GLOBAL.SiteName + ' Submitted Place Sent Back to You',
		generateTextFromHTML: true,
		html: emailString
	}, next);  
};

exports.sendModDailyDigestEmail = function (mods, todaysStats, olderStats) {
	try{
		var emailString = '<p>Greetings,</p><p>There are items in the ' + GLOBAL.SiteName + ' moderation queue.</p>';
		if (todaysStats.length > 0) {
			emailString += '<p><strong>New items from the last 24 hours:</strong><br>';
			for (var i = 0; i < todaysStats.length; i++) {
				var stat = todaysStats[i];
				emailString += stat._id + ': ' + stat.value + '<br>';
			};
			emailString += '</p>';
		};

		if (olderStats.length > 0) {
			emailString += '<p><strong>Older items still in the queue:</strong><br>';
			for (var i = 0; i < olderStats.length; i++) {
				var stat = olderStats[i];
				emailString += stat._id + ': ' + stat.value + '<br>';
			};
			emailString += '</p>';
		};

		emailString += '<p>Please log in and review the pending items by navigating to this site: <a href="' + GLOBAL.SiteURL + '/moderator/review">' + GLOBAL.SiteURL + '/moderator/review</a></p>';
		emailString += '<p>Thank you,<br>The ' + GLOBAL.SiteName + ' Administrators<br>';
		emailString += '<a href="' + GLOBAL.SiteURL + '/">' + GLOBAL.SiteURL + '/</a></p>';	


		var throttleLoop = require('../util/throttleLoop');
		var throttleSpeed = 1000;

		throttleLoop(mods, throttleSpeed, 0, function (mod) {
			sendMail({
				to: mod.email,
				from: 'The ' + GLOBAL.SiteName + ' Administrators <' + GLOBAL.supportEmail + '>',
				subject: GLOBAL.SiteName + ' Daily Moderator Report',
				generateTextFromHTML: true,
				html: emailString
			}, function (err) {
				if( err ) {console.log('SES Error: ' + err);}
			});
		});
	}
	catch(err){
		console.log('sendModDailyDigestEmail:' + err);
	}	
};

