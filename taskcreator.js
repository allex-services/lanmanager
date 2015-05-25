function createBehaviorMap(execlib){
  var execSuite = execlib.execSuite,
      taskRegistry = execSuite.taskRegistry;

  return [{
    name: 'consumeLanManager',
    klass: require('./tasks/consumeLanManager.js')(execlib)
  }];
}

module.exports = createBehaviorMap;
