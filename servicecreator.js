function createLMService(execlib,ParentServicePack){
  var ParentService = ParentServicePack.Service,
      lib = execlib.lib,
      execSuite = execlib.execSuite,
      registry = execSuite.registry,
      taskRegistry = execSuite.taskRegistry;
      
  var ParentService = ParentServicePack.Service;

  registry.register('allex_remoteserviceneedingservice');
  registry.register('allex_serviceneedservice');

  function factoryCreator(parentFactory){
    return {
      'service': require('./users/serviceusercreator')(execlib,parentFactory.get('service')),
      'user': require('./users/usercreator')(execlib,parentFactory.get('user')) 
    };
  }

  function LMService(prophash){
    ParentService.call(this,prophash);
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
    //console.log('needs',sink.modulename,sink.role,'for',needs);
    if(lib.isArray(needs)){
      needs.forEach(sink.call.bind(sink,'spawn'));
      /*
      needs.forEach(function(need){
        sink.call('spawn',need).done(function(){
          console.log('new Service need',arguments);
        },function(){
          console.error('spawn nok',arguments);
        });
      });
      */
    }
  };
  LMService.prototype.onServicesSink = function(sink){
    taskRegistry.run('materializeData',{
      sink:sink,
      data:this.servicesTable,
      onRecordDeletion:this.onServiceDown.bind(this)
    });
  };
  LMService.prototype.onNeedDown = function(needhash){
    console.log('need down',needhash);
    //this.data.create(needhash);
    this.subservices.get('services').call('create',needhash);
  };
  LMService.prototype.onServiceDown = function(servicehash){
    console.log('service down',servicehash);
    var need = servicehash;
    need.ipaddress = null;
    need.tcpport = null;
    need.httpport = null;
    need.wsport = null;
    this.subservices.get('needs').call('spawn',need);/*.done(function(){
      console.log('new Service need',arguments);
    },function(){
      console.error('spawn nok',arguments);
    });*/
    //console.log('service down handled');
  };
  
  return LMService;
}

module.exports = createLMService;
