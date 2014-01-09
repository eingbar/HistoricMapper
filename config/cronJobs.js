var fs = require('fs');

var models_dir = __dirname + '/jobs';

fs.readdirSync(models_dir).forEach(function (file) {
  if(file[0] === '.') return; 
  require(models_dir+'/'+ file);
});