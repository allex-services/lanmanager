function createBehaviorMap(execlib){
  'use strict';

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
