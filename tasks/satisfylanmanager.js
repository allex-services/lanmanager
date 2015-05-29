function createSatisfier(execlib){
  var lib = execlib.lib,
      execSuite = execlib.execSuite,
      taskRegistry = execSuite.taskRegistry,
      DestroyableTask = execSuite.DestroyableTask;

  function Satisfier(prophash){
    DestroyableTask.call(this,prophash,'lanmanagerstate');
    this.state = prophash.lanmanagerstate;
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
          propertyhash: {}
        }],
        cb:this.takeNeedsSink.bind(this),
      });
    }
  };
  Satisfier.prototype.onServiceDown = function(servicerecord){
    var deadservicename = servicerecord.instancename;
    this.state.sink.call('notifyServiceDown',deadservicename).done(
      null,
      function(){
        console.error('notifyServiceDown nok',arguments);
    });
    this.log('called notifyServiceDown',deadservicename);
  };
  Satisfier.prototype.takeNeedsSink = function(subname,needssink){
    this.log('subSink',subname);
    if(subname!=='needs'){
      return;
    }
    taskRegistry.run('consumeRemoteServiceNeedingService',{
      sink:needssink,
      myIP:this.myip,
      servicesTable:this.monitor.services,
      newServiceEvent:this.monitor.newServiceEvent,
      onMissingModule:this.onMissingModule,
      spawner:this.doSpawn.bind(this)
    });
  };
  Satisfier.prototype.doSpawn = function(need,challenge,defer){
    this.log('doSpawn',need,challenge);
    this.monitor.sink.call('spawn',{
      modulename:need.modulename,
      instancename:need.instancename
    }).done(
      null,
      function(){
        console.error('spawn nok',arguments);
        defer.resolve.bind(null);
    });
  };
  Satisfier.prototype.compulsoryConstructionProperties = ['lanmanagerstate','subservicemonitor'];
  return Satisfier;
}

module.exports = createSatisfier;
