function createLMService(execlib,ParentService){
  'use strict';
  var lib = execlib.lib,
      qlib = lib.qlib,
      execSuite = execlib.execSuite,
      registry = execSuite.registry,
      taskRegistry = execSuite.taskRegistry;
      
  function factoryCreator(parentFactory){
    return {
      'service': require('./users/serviceusercreator')(execlib,parentFactory.get('service')),
      'user': require('./users/usercreator')(execlib,parentFactory.get('user')) 
    };
  }

  function ipStrategyExister (ipstrat, item) {
    if (ipstrat && item && ipstrat.ip === item.ip && ipstrat.role === item.role) {
      return true;
    }
  }
  function uniqueIpStrategyAppender (destarry, ipstrat) {
    if (destarry.some(ipStrategyExister.bind(null, ipstrat))) {
      return;
    }
    destarry.push(ipstrat);
  }

  function appendUniqueIpStrategies (destarry, srcarry) {
    if (!lib.isArray(destarry)) {
      return;
    }
    if (!lib.isArray(srcarry)) {
      return;
    }
    srcarry.forEach(uniqueIpStrategyAppender.bind(null, destarry));
  }

  function LMService(prophash){
    ParentService.call(this,prophash);
    this.ipstrategies = prophash.ipstrategies;
    this.natconfig = prophash.nat;
    this.runTimeDir = prophash.runtimedirectory;
    console.log('ipstrategies',this.ipstrategies);
    this.locks = new qlib.JobCollection();
    this.originalNeeds = new lib.Map();
    this.needsTable = [];
    this.servicesTable = [];
    console.log('running in', process.cwd());
    this.startSubServiceStaticallyWithUserSink('allex_directoryservice', 'storage',{
      path: [process.cwd(), '.allexlanmanager'],
      text: true
    }).done(
      this.onStorage.bind(this)
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
    this.locks.destroy();
    this.locks = null;
    this.runTimeDir = null;
    this.natconfig = null;
    this.ipstrategies = null;
    ParentService.prototype.__cleanUp.call(this);
  };
  LMService.prototype.isInitiallyReady = function () {
    return false;
  };
  LMService.prototype.getRunTimeStorageSinkName = function () {
  };
  LMService.prototype.onStorage = function () {
    if (this.runTimeDir) {
      this.startSubServiceStaticallyWithUserSink('allex_directoryservice', 'rtstorage', {
        path: [this.runTimeDir, '.allexlanmanager'],
        text: true
      }).done(
        this.startFunctionalitySinks.bind(this)
      );
    } else {
      this.subservices.register('rtstorage_usersink', this.subservices.get('storage_usersink'));
      this.startFunctionalitySinks();
    }
  };
  LMService.prototype.startFunctionalitySinks = function () {
    this.startSubServiceStaticallyWithUserSink('allex_remoteserviceneedingservice','needs',{
      modulename: 'allex_serviceneedservice'
    }).done(
      this.onNeedsSink.bind(this)
    );
    this.startSubServiceStaticallyWithUserSink('allex_availablelanservicesservice','services',{}).done(
      this.onServicesSink.bind(this)
    );
    this.startSubServiceStaticallyWithUserSink('allex_engagedmodulesservice','engaged_modules',{}).done(
      this.onEngagedModulesSink.bind(this)
    );
    this.startSubServiceStaticallyWithUserSink('allex_natservice','nat',{}).done(
      this.onNatSink.bind(this, this.natconfig||[])
    );
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
  LMService.prototype.onNeedsSink = function(sink){
    taskRegistry.run('materializeQuery',{
      sink:sink,
      continuous: true,
      data:this.needsTable,
      onRecordDeletion:this.onNeedDown.bind(this)
    });
    this.readNeedsLayers().then(
      (needs) => {
        needs.forEach(engageSingleNeed.bind(this));
      }
    );
    /*
    if(lib.isArray(needs)){
      needs.forEach(this.engageNeed.bind(this,sink));
    }
    */
  };
  function engageSingleNeed (needdesc) {
    return this.engageNeed(needdesc);
  }
  LMService.prototype.engageNeed = execSuite.dependentServiceMethod(['needs'], [], function(needsink, need, defer){
    if (!need || 'undefined' === typeof need.instancename) {
      return;
    }
    this.originalNeeds.replace(need.instancename,need);
    need.strategies = need.strategies || {};
    if (lib.isArray(need.strategies.ip)) {
      appendUniqueIpStrategies(need.strategies.ip, this.ipstrategies);
    } else {
      need.strategies.ip = this.ipstrategies;
    }
    qlib.promise2defer(needsink.call('spawn',need), defer);
  });
  function instancenamefinder(instancename, instancerecord) {
    return instancerecord.instancename === instancename;
  }
  LMService.prototype.addNeed = function (need) {
    if (!need || 'undefined' === typeof need.instancename) {
      return q.reject(new lib.Error('NEED_NOT_DEFINED'));
    }
    //maybe there's a service already running for this need?
    if (this.servicesTable.some(instancenamefinder.bind(null, need.instancename))) {
      return q(true);
    }
    this.originalNeeds.replace(need.instancename,need);
    need.strategies = need.strategies || {};
    need.strategies.ip = this.ipstrategies;
    return this.locks.run('needs', new qlib.PromiseExecutorJob([
      this.saveOriginalNeeds.bind(this),
      this.spawnNeed.bind(this, need)
    ]));
  };
  LMService.prototype.spawnNeed = execSuite.dependentServiceMethod(['needs'], [], function (needssink, need, defer){
    //qlib.promise2defer(needssink.call('spawn',need), defer);
    needssink.call('spawn', need).then(
      defer.resolve.bind(defer, true),
      defer.reject.bind(defer)
    );
  });
  LMService.prototype.removeNeed = function (instancename) {
    console.log('removing', instancename, 'from originalNeeds');
    this.originalNeeds.remove(instancename);
    return this.locks.run('needs', new qlib.PromiseExecutorJob([
      this.saveOriginalNeeds.bind(this),
      this.killNeed.bind(this, instancename)
    ]));
  };
  LMService.prototype.killNeed = execSuite.dependentServiceMethod(['needs'], [], function (needsink, instancename, defer) {
    if (this.needsTable.some(function(item) {
      return item.instancename===instancename;
    })) {
      qlib.promise2defer(needsink.call('kill', instancename), defer);
    } else {
      defer.resolve(true);
    }
    instancename = null;
  });
  LMService.prototype.onNeedDown = function(needhash){
    //console.log('need down',require('util').inspect(needhash, {depth:7}));
    console.info('need', needhash.instancename+' ('+needhash.modulename+') with config\n',needhash.propertyhash,'\n  satisfied by',needhash.ipaddress+':'+needhash.wsport, 'on pid', needhash.pid);
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
    sink = null;
  };
  LMService.prototype.onServiceDown = function(servicehash){
    var infostr, need = servicehash,
        originalneed = this.originalNeeds.get(servicehash.instancename);
    infostr = `Service ${servicehash.instancename} is down`;
    need.ipaddress = null;
    need.tcpport = null;
    need.httpport = null;
    need.wsport = null;
    if (originalneed) {
      lib.traverse(originalneed,function(onv,onn){
        need[onn] = onv;
      });
      //console.log('=> new need',require('util').inspect(need, {depth:7}));
      infostr+=', will spawn a new need';
      this.subservices.get('needs').call('spawn',need);
    }
    need = null;
    console.info(infostr);
  };
  LMService.prototype.onEngagedModulesSink = function(emsink){
    ['allexcore','allex_dataservice'].forEach(function(emn){
      emsink.call('create',{
        modulename:emn
      });
    });
    emsink = null;
  };

  require('./needsfunctionalitycreator')(execlib, LMService);
  
  return LMService;
}

module.exports = createLMService;
