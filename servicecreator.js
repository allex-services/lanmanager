function createLMService(execlib,ParentServicePack){
  var lib = execlib.lib,
      execSuite = execlib.execSuite,
      registry = execSuite.registry;
      
  var ParentService = ParentServicePack.Service;

  registry.register('allex_remoteserviceneedingservice');
  registry.register('allex_serviceneedservice');

  function factoryCreator(parentFactory){
    return {
      'service': require('./users/serviceusercreator')(execlib,parentFactory.get('service')),
      'user': require('./users/usercreator')(execlib,parentFactory.get('user')) 
    };
  }

  function onNeedsSink(needs,sink){
    console.log('needs',sink.modulename,sink.role,'for',needs);
    if(lib.isArray(needs)){
      needs.forEach(function(need){
        sink.call('spawn',need).done(function(){
          console.log('new Service need',arguments);
        },function(){
          console.error('spawn nok',arguments);
        });
      });
    }
  }
  function LMService(prophash){
    console.log('new LMService',prophash);
    ParentService.call(this,prophash);
    this.startSubServiceStatically('allex_remoteserviceneedingservice','needs',{
      modulename: 'allex_serviceneedservice'
    }).done(
      onNeedsSink.bind(null,prophash.needs)
    );
  }
  ParentService.inherit(LMService,factoryCreator);
  LMService.prototype.__cleanUp = function(){
    console.log('LMService dead');
    ParentService.prototype.__cleanUp.call(this);
  };
  LMService.prototype.introduceUser = function(userhash){
    if(userhash.role!=='service'&&userhash.ip){
      userhash.name = userhash.ip;
    }
    return ParentService.prototype.introduceUser.call(this,userhash);
  };
  
  return LMService;
}

module.exports = createLMService;
