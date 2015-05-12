function createConsumerMap(execlib){
  var lib = execlib.lib;

  var ret = new lib.Map;
  ret.add('basic',require('./consumers/basic.js')(execlib));

  return ret;
}

module.exports = createConsumerMap;
