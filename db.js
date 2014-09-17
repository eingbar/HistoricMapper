/**
 * Created by Adam on 10/1/13. Adam is on the phone.
 */
var mongoose = require( 'mongoose' );
var Schema   = mongoose.Schema;
var format = require('util').format;


var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : 27017;
var dbName = process.env['MONGO_NODE_DRIVER_DB'] != null ? process.env['MONGO_NODE_DRIVER_DB'] : 'HistoricMapper_GNO';

mongoose.connect( format('mongodb://%s:%d/%s', host, port, dbName) );
