function createLMService(execlib,ParentServicePack){
  var lib = execlib.lib,
      execSuite = execlib.execSuite,
      registry = execSuite.registry;
      
  var ParentService = ParentServicePack.Service;

  registry.register('allex_needingservice');
  registry.register('allex_serviceneedservice');

  function factoryCreator(parentFactory){
    return {
      'service': require('./users/serviceusercreator')(execlib,parentFactory.get('service')),
      'user': require('./users/usercreator')(execlib,parentFactory.get('user')) 
    };
  }

  function onNeedsSink(lms,needs,sink){
    lms.state.set('haveneeds',true);
    lms.server.add('needs',sink);
    console.log('needs',sink.modulename,sink.role,'for',needs);
    if(lib.isArray(needs)){
      needs.forEach(function(need){
        console.log('spawn',need,'?');
        sink.call('spawn',need).done(function(){
          console.log('spawn ok',arguments);
        },function(){
          console.error('spawn nok',arguments);
        });
      });
    }
  }
  function LMService(prophash){
    console.log('new LMService',prophash);
    ParentService.call(this,prophash);
    execSuite.start({
      service: {
        modulename: 'allex_needingservice',
        instancename: 'lmneeds',
        propertyhash: {
          modulename: 'allex_serviceneedservice'
        }
      }
    }).done(
      onNeedsSink.bind(null,this,prophash.needs)
    );
  }
  ParentService.inherit(LMService,factoryCreator);
  LMService.prototype.__cleanUp = function(){
    console.log('LMService dead');
    ParentService.prototype.__cleanUp.call(this);
  };
  
  return LMService;
}

module.exports = createLMService;
