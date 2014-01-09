/**
 * Created by Adam on 10/1/13.
 */
var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : 27017;
var dbName = process.env['MONGO_NODE_DRIVER_DB'] != null ? process.env['MONGO_NODE_DRIVER_DB'] : 'GeekDB';

var MongoClient = require('mongodb').MongoClient
    , format = require('util').format,
    ObjectID = require('mongodb').ObjectID;

exports.selectAll = function(next){
    MongoClient.connect(format('mongodb://%s:%d/%s', host, port, dbName), function(err, db) {
        if(err) throw err;

        var collection = db.collection('GeekPlaces');
        collection.find().toArray(function(err, results) {
            db.close();
            next(results);
        });
    })
};

exports.selectByID = function(ID, next){
    MongoClient.connect(format('mongodb://%s:%d/%s', host, port, dbName), function(err, db) {
        if(err) throw err;

        var collection = db.collection('GeekPlaces');
        collection.findOne({"_id": new ObjectID(ID)}, function(err, doc) {
            next(doc);
        });
//        collection.findOne({_id: format('ObjectID(%s)', ID)}, function(result){
//            if(err) throw err;
//
//            db.close();
//        });
    })
};

