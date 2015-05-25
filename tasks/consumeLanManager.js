function createConsumer(execlib){
  var lib = execlib.lib,
      execSuite = execlib.execSuite,
      taskRegistry = execSuite.taskRegistry,
      Task = execSuite.Task;

  function Consumer(prophash){
    Task.call(this,prophash);
    this.lmTask = taskRegistry.spawn('acquireSink',{
      connectionString: prophash.connectionstring,
      propertyhash: {},
      identity: {ip:{name:'needsmonitor'}},
      onSink: this.startConsumingLM.bind(this)
    });
    this.lmsink = null;
    this.myip = null;
    this.spawningsink = prophash.spawningsink;
    this.spawningsink.consumeChannel('s',lib.dummyFunc);
    this.connectionstring = prophash.connectionstring;
    this.services = [];
    this.spawningsink.extendTo(this);
    this.newServiceEvent = new lib.HookCollection();
    taskRegistry.run('materializeData',{
      sink: this.spawningsink,
      data: this.services,
      onNewRecord: this.onNewService.bind(this),
      onRecordDeletion: this.onServiceDown.bind(this)
    });
  }
  lib.inherit(Consumer,Task);
  Consumer.prototype.destroy = function(){
    if(!this.newServiceEvent){
      return;
    }
    this.newServiceEvent.destruct();
    this.newServiceEvent = null;
    this.services = null;
    this.connectionstring = null;
    this.spawningsink = null;
    this.myip = null;
    this.lmsink = null;
    this.lmTask.destroy();
    this.lmTask = null;
    Task.prototype.destroy.call(this);
  };
  Consumer.prototype.go = function(){
    this.lmTask.go();
  };
  Consumer.prototype.onNewService = function(servicerecord){
    this.log('firing',servicerecord);
    this.newServiceEvent.fire(servicerecord);
  };
  Consumer.prototype.onServiceDown = function(servicerecord/*serviceitempath*/){
    if(!this.lmsink){
      return;
    }
    var deadservicename = servicerecord.instancename;
    this.lmsink.call('notifyServiceDown',deadservicename).done(
      null,
      function(){
        console.error('notifyServiceDown nok',arguments);
    });
    this.log('called notifyServiceDown',deadservicename);
  };
  Consumer.prototype.startConsumingLM = function(lmsink){
    this.lmsink = lmsink;
    if(!lmsink){
      this.myip = null;
      return;
    }
    var state = taskRegistry.run('materializeState',{
      sink: this.lmsink
    });
    taskRegistry.run('readState',{
      sink: this.lmsink,
      stream: state.state,
      name: 'name',
      cb: this.onMyIP.bind(this,state)
    });
  };
  Consumer.prototype.onMyIP = function(state,myip){
    this.myip = myip;
    if(this.myip){
      taskRegistry.run('acquireSubSinks',{
        sink: this.lmsink,
        subinits:[{
          name: 'needs',
          identity: {role:'user',filter:'unsatisfied'},
          propertyhash: {}
        }],
        cb:this.takeNeedsSink.bind(this),
        stream: state.state
      });
    }
  };
  Consumer.prototype.takeNeedsSink = function(subname,needssink){
    this.log('subSink',subname);
    if(subname!=='needs'){
      return;
    }
    taskRegistry.run('consumeRemoteServiceNeedingService',{
      sink:needssink,
      myIP:this.myip,
      servicesTable:this.services,
      newServiceEvent:this.newServiceEvent,
      spawner:this.doSpawn.bind(this)
    });
  };
  Consumer.prototype.doSpawn = function(need,challenge,defer){
    this.log('doSpawn',need,challenge);
    this.spawningsink.call('spawn',{
      modulename:need.modulename,
      instancename:need.instancename
    }).done(
      null,
      function(){
        console.error('spawn nok',arguments);
        defer.resolve.bind(null);
    });
  };
  return Consumer;
}

module.exports = createConsumer;
