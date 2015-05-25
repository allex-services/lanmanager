function createConsumer(execlib){
  var lib = execlib.lib,
      execSuite = execlib.execSuite,
      taskRegistry = execSuite.taskRegistry,
      Task = execSuite.Task,
      StateSource = execSuite.StateSource,
      ADS = execSuite.ADS;

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
    this.connectionstring = prophash.connectionstring;
    this.services = [];
    this.spawningsink.extendTo(this);
    this.spawningsink.consumeChannel('s',ADS.listenToScalar(['down',null],{activator:this.onServiceDown.bind(this)}));
    taskRegistry.run('materializeData',{
      sink: this.spawningsink,
      data: this.services,
      onNewRecord: this.onNewService.bind(this)
    });
  }
  lib.inherit(Consumer,Task);
  Consumer.prototype.destroy = function(){
    if(!this.ready){
      return;
    }
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
    var spawnbiddefer = this.spawnbids.remove(servicerecord.instancename);
    if(spawnbiddefer){
      servicerecord.ipaddress = this.myip;
      spawnbiddefer.resolve(servicerecord);
    }
  };
  Consumer.prototype.onServiceDown = function(serviceitempath){
    if(!this.lmsink){
      return;
    }
    var deadservicename = serviceitempath[1];
    this.lmsink.call('notifyServiceDown',deadservicename).done(
      this.onServiceDownReported.bind(this,deadservicename),
      function(){
        console.error('notifyServiceDown nok',arguments);
    });
  };
  Consumer.prototype.onServiceDownReported = function(deadservicename,deletedcount){
    if(deletedcount>0){
      this.spawningsink.call('confirmServiceDown',deadservicename);
    }
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
    console.log('subSink',subname);
    if(subname!=='needs'){
      return;
    }
    taskRegistry.run('consumeRemoteServiceNeedingService',{
      sink:needssink,
      myIP:this.myip,
      servicesTable:this.services,
      spawner:this.doSpawn.bind(this)
    });
  };
  Consumer.prototype.doSpawn = function(need,challenge,defer){
    //console.log('doSpawn',need,challenge);
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
