function createServicePack(execlib){
  var execSuite = execlib.execSuite;
  ParentServicePack = execSuite.registry.get('.');

  return {
    Service: require('./servicecreator')(execlib,ParentServicePack),
    SinkMap: require('./sinkmapcreator')(execlib,ParentServicePack),
    Consumers: require('./consumermapcreator')(execlib)
  };
}

module.exports = createServicePack;
