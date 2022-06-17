function createSatisfier(execlib){
  'use strict';
  var lib = execlib.lib,
      q = lib.q,
      qlib = lib.qlib,
      execSuite = execlib.execSuite,
      taskRegistry = execSuite.taskRegistry,
      DestroyableTask = execSuite.DestroyableTask;

  function SpawnerJobCore (satisfier, need) {
    this.satisfier = satisfier;
    this.need = need;
    this.serviceDestroyedListener = null;
    this.possibleDeathDefer = null;
  }
  SpawnerJobCore.prototype.destroy = function () {
    if (this.possibleDeathDefer) {
      this.possibleDeathDefer.reject(new lib.Error('SPAWNER_DYING'));
    }
    this.possibleDeathDefer = null;
    this.purgeServiceDestroyedListener();
    this.serviceDestroyedListener = null; //and again
    this.need = null;
    this.satisfier = null;
  };
  SpawnerJobCore.prototype.shouldContinue = function () {
    if (!this.satisfier) {
      return new lib.Error('NO_LANMANAGER_SATISFIER');
    }
    if (!this.satisfier.monitor) {
      return new lib.Error('NO_LANMANAGER_SATISFIER_MONITOR');
    }
    if (!this.satisfier.monitor.sink) {
      return new lib.Error('NO_LANMANAGER_SATISFIER_MONITOR_SPAWNING_SINK');
    }
    if (!this.satisfier.monitor.sink.destroyed) {
      return new lib.Error('LANMANAGER_SATISFIER_MONITOR_SPAWNING_SINK_DESTROYED');
    }
    if (!this.need) {
      return new lib.Error('NO_NEED_TO_SPAWN_SERVICE');
    }
  };
  SpawnerJobCore.prototype.trySpawn = function () {
    //console.log('trying spawn', this.need);
    return this.satisfier.monitor.sink.call('spawn', this.need).then(
      this.onSpawned.bind(this),
      this.onSpawnFailed.bind(this)
    );
  };
  SpawnerJobCore.prototype.onSpawned = function (sink) {
    var ret;
    this.purgeServiceDestroyedListener();
    if (!(sink && sink.destroyed)) {
      return this.trySpawn();
    }
    this.serviceDestroyedListener = sink.destroyed.attach(this.onSpawnFailed.bind(this));
    this.possibleDeathDefer = q.defer();
    ret = this.possibleDeathDefer.promise;
    lib.runNext(this.possibleDeathDefer.resolve.bind(this.possibleDeathDefer, sink), 1000);
    sink = null;
    return ret;
  };
  SpawnerJobCore.prototype.onServiceDied = function () {
    //console.log('service died', this.need);
    if (this.possibleDeathDefer) {
      this.possibleDeathDefer.reject(new lib.Error('SPAWNED_SERVICE_DIED_PREMATURELY'));
    }
    this.possibleDeathDefer = null;
  };
  SpawnerJobCore.prototype.onSpawnFailed = function (reason) {
    console.log('error in spawning', this.need, reason);
    throw reason;
    return this.trySpawn();
  };
  SpawnerJobCore.prototype.purgeServiceDestroyedListener = function () {
    if (this.serviceDestroyedListener) {
      this.serviceDestroyedListener.destroy();
    }
    this.serviceDestroyedListener = null;
  };

  SpawnerJobCore.prototype.steps = [
    'trySpawn'
  ];

  function Satisfier(prophash){
    DestroyableTask.call(this,prophash,'lanmanagerstate');
    this.state = prophash.lanmanagerstate;
    this.needsCollection = null;
    this.myip = null;
    this.monitor = prophash.subservicemonitor;
    this.onMissingModule = prophash.onMissingModule;
    if(!prophash.subservicemonitor.newServiceEvent){
      var e = new lib.Error('NO_NEWSERVICEEVENT_IN_SUBSERVICEMONITOR');
      e.prophash = prophash;
      throw e;
    }
    this.serviceDownListener= prophash.subservicemonitor.serviceDownEvent.attach(this.onServiceDown.bind(this));
    this.subServicesDestroyedListener = prophash.subservicemonitor.sink.destroyed.attach(this.destroy.bind(this));
  }
  lib.inherit(Satisfier,DestroyableTask);
  Satisfier.prototype.__cleanUp = function(){
    if(!this.subServicesDestroyedListener){
      return;
    }
    this.subServicesDestroyedListener.destroy();
    this.subServicesDestroyedListener = null;
    this.serviceDownListener.destroy();
    this.serviceDownListener = null;
    this.onMissingModule = null;
    this.monitor = null;
    this.myip = null;
    this.needsCollection = null;
    this.state = null;
    DestroyableTask.prototype.__cleanUp.call(this);
  };
  Satisfier.prototype.go = function(){
    taskRegistry.run('readState',{
      state: this.state,
      name: 'name',
      cb: this.onMyIP.bind(this)
    });
  };
  Satisfier.prototype.onMyIP = function(myip){
    this.myip = myip;
    if(this.myip){
      taskRegistry.run('acquireSubSinks',{
        state: this.state,
        subinits:[{
          name: 'needs',
          identity: {role:'user',filter:'unsatisfied'},
          propertyhash: {},
          cb:this.takeNeedsSink.bind(this)
        }]
      });
    }
  };
  Satisfier.prototype.onServiceDown = function(servicerecord){
    this.log('service down', servicerecord);
    var deadservicename = servicerecord.instancename;
    this.state.sink.call('notifyServiceDown',deadservicename).done(
      null,
      function(){
        console.error('notifyServiceDown nok',arguments);
    });
    this.log('called notifyServiceDown',deadservicename);
  };
  Satisfier.prototype.takeNeedsSink = function(needssink){
    var stateobj;
    if (!needssink) {
      return;
    }
    if (!this.needsCollection) {
      stateobj = {state: null};
      taskRegistry.run('createNeedsCollection', {stateObject: stateobj});
      this.needsCollection = stateobj.state;
    }
    taskRegistry.run('consumeRemoteServiceNeedingService',{
      sink:needssink,
      myIP:this.myip,
      servicesTable:this.monitor.services,
      newServiceEvent:this.monitor.newServiceEvent,
      onMissingModule:this.onMissingModule,
      needsCollection:this.needsCollection,
      spawner:this.doSpawn.bind(this)
    });
  };
  Satisfier.prototype.doSpawn = function(need,challenge,defer){
    if (!this.log) {
      return;
    }
    this.log('doSpawn',need,challenge);
    (qlib.newSteppedJobOnSteppedInstance(
      new SpawnerJobCore(this, need),
      defer
    ).go());
  };

  Satisfier.prototype.compulsoryConstructionProperties = ['lanmanagerstate','subservicemonitor'];
  return Satisfier;
}

module.exports = createSatisfier;
