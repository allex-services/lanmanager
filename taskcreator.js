function createBehaviorMap(execlib){
  'use strict';
  var execSuite = execlib.execSuite,
      taskRegistry = execSuite.taskRegistry;

  return [{
    name: 'satisfyLanManager',
    klass: require('./tasks/satisfylanmanager')(execlib)
  },{
    name: 'consumeLanManager',
    klass: require('./tasks/consumelanmanager')(execlib)
  },{
    name: 'followLanManager',
    klass: require('./tasks/followlanmanager')(execlib)
  },{
    name: 'startLanManager',
    klass: require('./tasks/startlanmanager')(execlib)
  }];
}

module.exports = createBehaviorMap;
