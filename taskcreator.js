function createBehaviorMap(execlib){
  var execSuite = execlib.execSuite,
      taskRegistry = execSuite.taskRegistry;

  taskRegistry.registerClass('consumeLanManager',require('./tasks/consumeLanManager.js')(execlib));
}

module.exports = createBehaviorMap;
