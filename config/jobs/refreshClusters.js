//https://github.com/mattpat/node-schedule

var schedule = require('node-schedule');
var cluster = require('../../routes/cluster');

var rule = new schedule.RecurrenceRule();

rule.hour = 0; rule.minute = 0;


var j = schedule.scheduleJob(rule, function(){
	try{
		cluster.refreshClusterData();
	}
	catch(err){
		console.log(err);
	}    
});