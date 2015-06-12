function createLMService(execlib,ParentServicePack){
  'use strict';
  var ParentService = ParentServicePack.Service,
      lib = execlib.lib,
      execSuite = execlib.execSuite,
      registry = execSuite.registry,
      taskRegistry = execSuite.taskRegistry;
      
  var ParentService = ParentServicePack.Service;

  registry.register('allex_remoteserviceneedingservice');
  registry.register('allex_serviceneedservice');
  registry.register('allex_engagedmodulesservice');

  function factoryCreator(parentFactory){
    return {
      'service': require('./users/serviceusercreator')(execlib,parentFactory.get('service')),
      'user': require('./users/usercreator')(execlib,parentFactory.get('user')) 
    };
  }

  function LMService(prophash){
    ParentService.call(this,prophash);
    this.ipstrategies = prophash.ipstrategies;
    console.log('ipstrategies',this.ipstrategies);
    this.needsTable = [];
    this.servicesTable = [];
    this.startSubServiceStatically('allex_remoteserviceneedingservice','needs',{
      modulename: 'allex_serviceneedservice'
    }).done(
      this.onNeedsSink.bind(this,prophash.needs)
    );
    this.startSubServiceStatically('allex_availablelanservicesservice','services',{}).done(
      this.onServicesSink.bind(this)
    );
    this.startSubServiceStatically('allex_engagedmodulesservice','engaged_modules',{}).done(
      this.onEngagedModulesSink.bind(this)
    );
  }
  ParentService.inherit(LMService,factoryCreator);
  LMService.prototype.__cleanUp = function(){
    this.needsTable = [];
    ParentService.prototype.__cleanUp.call(this);
  };
  LMService.prototype.introduceUser = function(userhash){
    if(userhash.role === 'user'){
      userhash.name = userhash.ip;
    }
    return ParentService.prototype.introduceUser.call(this,userhash);
  };
  LMService.prototype.onNeedsSink = function(needs,sink){
    taskRegistry.run('materializeData',{
      sink:sink,
      data:this.needsTable,
      onRecordDeletion:this.onNeedDown.bind(this)
    });
    if(lib.isArray(needs)){
      needs.forEach(this.engageNeed.bind(this,sink));
    }
  };
  LMService.prototype.engageNeed = function(needsink,need){
    need.strategies = need.strategies || {};
    need.strategies.ip = this.ipstrategies;
    needsink.call('spawn',need);
  };
  LMService.prototype.onNeedDown = function(needhash){
    console.log('need down',needhash);
    //this.data.create(needhash);
    this.subservices.get('services').call('create',needhash);
  };
  LMService.prototype.onServicesSink = function(sink){
    taskRegistry.run('materializeData',{
      sink:sink,
      data:this.servicesTable,
      onRecordDeletion:this.onServiceDown.bind(this)
    });
  };
  LMService.prototype.onServiceDown = function(servicehash){
    console.log('service down',servicehash);
    var need = servicehash;
    need.ipaddress = null;
    need.tcpport = null;
    need.httpport = null;
    need.wsport = null;
    this.subservices.get('needs').call('spawn',need);
  };
  LMService.prototype.onEngagedModulesSink = function(emsink){
    ['allexcore','allex_dataservice'].forEach(function(emn){
      emsink.call('create',{
        modulename:emn
      });
    });
  };
  
  return LMService;
}

module.exports = createLMService;
