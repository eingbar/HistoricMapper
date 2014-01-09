var throttleLoop = function (array, delay, i, callback) {
  if (i < array.length) {
    var item = array[i];
    if (item instanceof Array) {callback.apply(null, array[i]);}
    else {callback.apply(null, [array[i]]);};    
    i++;
    if (i < array.length) {setTimeout(throttleLoop, delay, array, delay, i, callback);};
  };  
}

module.exports = throttleLoop;