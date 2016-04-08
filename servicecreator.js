function createLMService(execlib,ParentServicePack){
  'use strict';
  var ParentService = ParentServicePack.Service,
      lib = execlib.lib,
      qlib = lib.qlib,
      execSuite = execlib.execSuite,
      registry = execSuite.registry,
      taskRegistry = execSuite.taskRegistry;
      
  var ParentService = ParentServicePack.Service;

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
    this.originalNeeds = new lib.Map();
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
    this.startSubServiceStatically('allex_natservice','nat',{}).done(
      this.onNatSink.bind(this, prophash.nat||[])
    );
    this.announceReady();
  }
  ParentService.inherit(LMService,factoryCreator);
  LMService.prototype.__cleanUp = function(){
    if(!this.originalNeeds){
      return;
    }
    this.servicesTable = null;
    this.needsTable = null;
    this.originalNeeds.destroy();
    this.originalNeeds = null;
    ParentService.prototype.__cleanUp.call(this);
  };
  LMService.prototype.isInitiallyReady = function () {
    return false;
  };
  LMService.prototype.announceReady = execSuite.dependentServiceMethod(['needs', 'services', 'engaged_modules', 'nat'], [], function (needssink, servicessink, engaged_modulessink, natsink, defer){
    this.readyToAcceptUsersDefer.resolve(true);
  });
  LMService.prototype.introduceUser = function(userhash){
    if(userhash.role === 'user'){
      userhash.name = userhash.ip;
    }
    return ParentService.prototype.introduceUser.call(this,userhash);
  };
  LMService.prototype.onNeedsSink = function(needs,sink){
    taskRegistry.run('materializeQuery',{
      sink:sink,
      continuous: true,
      data:this.needsTable,
      onRecordDeletion:this.onNeedDown.bind(this)
    });
    if(lib.isArray(needs)){
      needs.forEach(this.engageNeed.bind(this,sink));
    }
  };
  LMService.prototype.engageNeed = function(needsink,need){
    if (!need || 'undefined' === typeof need.instancename) {
      return;
    }
    this.originalNeeds.replace(need.instancename,need);
    need.strategies = need.strategies || {};
    need.strategies.ip = this.ipstrategies;
    needsink.call('spawn',need);
  };
  function instancenamefinder(instancename, instancerecord) {
    return instancerecord.instancename === instancename;
  }
  LMService.prototype.addNeed = execSuite.dependentServiceMethod(['needs'], [], function (needssink, need, defer){
    if (!need || 'undefined' === typeof need.instancename) {
      defer.reject(new lib.Error('NEED_NOT_DEFINED'));
    }
    //maybe there's a service already running for this need?
    if (this.servicesTable.some(instancenamefinder.bind(null, need.instancename))) {
      defer.resolve(true);
      return;
    }
    this.originalNeeds.replace(need.instancename,need);
    need.strategies = need.strategies || {};
    need.strategies.ip = this.ipstrategies;
    //qlib.promise2defer(needssink.call('spawn',need), defer);
    needssink.call('spawn', need).then(
      defer.resolve.bind(defer, true),
      defer.reject.bind(defer)
    );
  });
  LMService.prototype.removeNeed = execSuite.dependentServiceMethod(['needs'], [], function (needsink, instancename, defer) {
    console.log('removing', instancename, 'from originalNeeds');
    this.originalNeeds.remove(instancename);
    if (this.needsTable.some(function(item) {
      return item.instancename===instancename;
    })) {
      needsink.call('kill', instancename);
    }
  });
  LMService.prototype.onNeedDown = function(needhash){
    console.log('need down',needhash);
    this.subservices.get('services').call('create',needhash);
  };
  LMService.prototype.onServicesSink = function(sink){
    taskRegistry.run('materializeQuery',{
      sink:sink,
      continuous: true,
      data:this.servicesTable,
      onRecordDeletion:this.onServiceDown.bind(this)
    });
  };
  LMService.prototype.onNatSink = function (natarry, sink) {
    natarry.forEach(function(nat){
      sink.call('create',nat);
    });
  };
  LMService.prototype.onServiceDown = function(servicehash){
    console.log('service down',servicehash);
    var need = servicehash,
        originalneed = this.originalNeeds.get(servicehash.instancename);
    need.ipaddress = null;
    need.tcpport = null;
    need.httpport = null;
    need.wsport = null;
    if (originalneed) {
      lib.traverse(originalneed,function(onv,onn){
        need[onn] = onv;
      });
      console.log('=> new need',need);
      this.subservices.get('needs').call('spawn',need);
    }
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
