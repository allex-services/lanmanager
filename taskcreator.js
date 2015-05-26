function createBehaviorMap(execlib){
  var execSuite = execlib.execSuite,
      taskRegistry = execSuite.taskRegistry;

  return [{
    name: 'satisfyLanManager',
    klass: require('./tasks/satisfylanmanager')(execlib)
  },{
    name: 'consumeLanManager',
    klass: require('./tasks/consumelanmanager')(execlib)
  }];
}

module.exports = createBehaviorMap;
