function createConsumer(execlib){
  var lib = execlib.lib,
      execSuite = execlib.execSuite,
      registry = execSuite.registry,
      taskRegistry = execSuite.taskRegistry,
      Task = execSuite.Task,
      SubServiceExtractor = execSuite.StateSubServiceExtractor,
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
    this.spawnbids = new lib.Map;
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
    this.spawnbids.destroy(); //could reject all remaining defers
    this.spawnbids = null;
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
      this.spawnbids.purge();
      this.myip = null;
      return;
    }
    var state = taskRegistry.run('materializeState',{
      sink: lmsink
    });
    taskRegistry.run('acquireSubSinks',{
      sink: lmsink,
      subinits:[{
        name: 'needs',
        identity: {role:'user',filter:'unsatisfied'},
        propertyhash: {}
      }],
      cb:this.takeNeedsSink.bind(this,lmsink),
      stream: state.state
    });
    taskRegistry.run('readState',{
      sink: lmsink,
      stream: state.state,
      name: 'name',
      cb: this.onMyIP.bind(this,lmsink,state)
    });
  };
  Consumer.prototype.onMyIP = function(lmsink,state,myip){
    this.myip = myip;
  };
  Consumer.prototype.hasIP = function(){
    if(!this.myip){
      console.log('NO, I have no ip');
    }
    return !!this.myip;
  };
  Consumer.prototype.identityForNeed = function(need){
    return {name:this.myip};
  };
  Consumer.prototype.takeNeedsSink = function(lmsink,subname,needssink){
    console.log('subSink',subname);
    if(subname!=='needs'){
      return;
    }
    taskRegistry.run('consumeNeedingService',{
      sink:needssink,
      shouldServeNeeds:this.hasIP.bind(this),
      shouldServeNeed:this.isNeedBiddable.bind(this),
      identityForNeed:this.identityForNeed.bind(this),
      respondToChallenge:this.doSpawn.bind(this)
    });
  };
  Consumer.prototype.isNeedBiddable = function(need){
    var ret = !this.spawnbids.get(need.instancename);
    if(!ret){
      console.trace();
      console.error('How come I check on',need.instancename,'again?!');
    }
    return ret;
  };
  Consumer.prototype.doSpawn = function(need,challenge,defer){
    console.log('doSpawn',need,challenge,defer);
    var servobj={service:null};
    if(this.services.some(function(serv){
      if(serv.instancename===need.instancename){
        servobj.service = serv;
        return true;
      }
    })){
      servobj.service.ipaddress = this.myip;
      defer.resolve(servobj.service);
      return;
    }
    console.log('doSpawn',need,challenge);
    this.spawnbids.add(need.instancename,defer);
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
