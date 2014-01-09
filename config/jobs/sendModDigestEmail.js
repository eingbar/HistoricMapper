//https://github.com/mattpat/node-schedule

var schedule = require('node-schedule');
var mailer = require('../mailer');
var _ = require('underscore');

var rule = new schedule.RecurrenceRule();

//rule.second = [0, 30];
rule.hour = 23; rule.minute = 55;


var j = schedule.scheduleJob(rule, function(){
	try{
		var mongoose = require( 'mongoose' );
		var ReviewApproval = mongoose.model( 'ReviewApproval' );
		var User = mongoose.model( 'User' );
		var mods, todaysStats, olderStats;

		var haveData = _.after(3, function () {
			if (mods.length > 0 && (todaysStats.length > 0 || olderStats.length > 0)) {
				mailer.sendModDailyDigestEmail(mods, todaysStats, olderStats);
			};			
		});

		var map = function() {
		    if (!this) {
		        return;
		    }
		    emit(this.Type, 1);
		}

		var reduce = function(key, values) {
		    var count = 0;
		    for (index in values) {
		        count += values[index];
		    }
		    return count;
		}
		var start = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
		var end = new Date(start.getFullYear(), start.getMonth(),  start.getDate() + 1);
		var todayQuery = {"Status": "Pending", "RecEnterDate": {"$gte": start, "$lt": end}};
		var beforeToday = {"Status": "Pending", "RecEnterDate": {"$lt": start}};

		ReviewApproval.mapReduce({map: map, reduce: reduce, query: todayQuery}, function (err, results) {
			if (err) { console.log('Todays Query:' + err); return;};
			try{	
				todaysStats = results;
				haveData();
			}
			catch(err){
				console.log('Todays Query Results:' + err);
			}
		});
		ReviewApproval.mapReduce({map: map, reduce: reduce, query: beforeToday}, function (err, results) {
			if (err) { console.log('Before Today Query:' + err); return;};
			try{
				olderStats = results;
				haveData();
			}
			catch(err){
				console.log('Before Today Query Results:' + err)
			}			
		});
		User.find({userLevel: {"$gt": 50}, ModDailyDigest: true, approved: true, emailVerified: true}, function (err, results) {
			if (err) { console.log('Mod. Query:' + err); return;};			
			try{	
				mods = results;
				haveData();
			}
			catch(err){
				console.log('Mod. Query Results:' + err)
			}
		});
		//Users Query haveData();
	}
	catch(err){
		console.log(err);
	}    
});