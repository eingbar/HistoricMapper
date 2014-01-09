//https://github.com/mattpat/node-schedule

var schedule = require('node-schedule');

var _ = require('underscore');
var mongoose = require( 'mongoose' );
var User = mongoose.model( 'User' );

var rule = new schedule.RecurrenceRule();

//rule.second = [0, 30];
rule.hour = 0; //run at midnight

var AWS = require('aws-sdk'); 
var config = new AWS.Config({
		accessKeyId: GLOBAL.AWSKey, secretAccessKey: GLOBAL.AWSSecret, region: 'us-east-1'
});
AWS.config = config;
var sqs = new AWS.SQS();

var bounceURL = 'https://sqs.us-east-1.amazonaws.com/967344322316/ses-bounces-queue';
var complaintURL = 'https://sqs.us-east-1.amazonaws.com/967344322316/ses-complaints-queue';

var j = schedule.scheduleJob(rule, function(){
	try{
		if (!GLOBAL.AWSKey) {return;};					
		
		processBounceMessages();
		processComplaintsMessage();

	}
	catch(err){
		console.log(err);
	}    
});

function getBounceMessage (next) {
	sqs.receiveMessage({QueueUrl: bounceURL}, function (err, data) { 
		if (err) { return next(err) };
		next(err, data);
	});
}

function processBounceMessages () {
	getBounceMessage(function (err, data) {
		if (err) { console.log('SES Bounces Error:' + err); return;};		
		if (data.Messages) {
			for (var i = 0; i < data.Messages.length; i++) {
				var message = data.Messages[i];
				var MessageId = message.MessageId;
				var ReceiptHandle = message.ReceiptHandle;
				var body = JSON.parse(message.Body);
				var messageContent = JSON.parse(body.Message);

				for (var i = 0; i < messageContent.bounce.bouncedRecipients.length; i++) {
					var bouncedRecipient = messageContent.bounce.bouncedRecipients[i];
					User.findOne({email: bouncedRecipient.emailAddress}, function (err, user) {
						if (err) { console.log('SES Bounces User Error:' + err); return;};
						if (!user) {return};

						bouncedRecipient.reportingMTA = messageContent.bounce.reportingMTA;
						bouncedRecipient.timestamp = messageContent.bounce.timestamp;
						bouncedRecipient.bounceType = messageContent.bounce.bounceType;
						bouncedRecipient.bounceSubType = messageContent.bounce.bounceSubType;
						if (bouncedRecipient.bounceType = "Permanent") {
							user.emailLocked = true;
							user.emailLockedReason = JSON.stringify(bouncedRecipient);
							user.save(function (err) { });
						};											
					});
				};
				sqs.deleteMessage({QueueUrl: bounceURL, ReceiptHandle: ReceiptHandle}, function (err, data) {
					if (err) { console.log('SES Bounces Message Delete Error:' + err); return;};
				});
			};
			processBounceMessages();
		};		
	});
}

function getComplaintsMessage (next) {
	sqs.receiveMessage({QueueUrl: complaintURL}, function (err, data) { 
		if (err) { return next(err) };
		next(err, data);
	});
}

function processComplaintsMessage () {
	getComplaintsMessage(function (err, data) {
		if (err) { console.log('SES Complaints Error:' + err); return;};
		if (data.Messages) {
			for (var i = 0; i < data.Messages.length; i++) {
				var message = data.Messages[i];
				var MessageId = message.MessageId;
				var ReceiptHandle = message.ReceiptHandle;
				var body = JSON.parse(message.Body);
				var messageContent = JSON.parse(body.Message);

				for (var i = 0; i < messageContent.complaint.complainedRecipients.length; i++) {
					var complaintRecipient = messageContent.complaint.complainedRecipients[i];
					User.findOne({email: complaintRecipient.emailAddress}, function (err, user) {
						if (err) { console.log('SES Complaints User Error:' + err); return;};
						if (!user) {return};

						complaintRecipient.complaintFeedBackType = messageContent.complaint.complaintFeedbackType;
						complaintRecipient.timestamp = messageContent.complaint.timestamp;
						complaintRecipient.userAgent = messageContent.complaint.userAgent;

						user.emailLocked = true;
						user.emailLockedReason = JSON.stringify(complaintRecipient);
						user.save(function (err) { });
					});
				};
				sqs.deleteMessage({QueueUrl: complaintURL, ReceiptHandle: ReceiptHandle}, function (err, data) {
					if (err) { console.log('SES Bounces Complaints Delete Error:' + err); return;};
				});
			};
			processComplaintsMessage();
		};		
	});
}