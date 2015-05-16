function createConsumer(execlib){
  var lib = execlib.lib,
      execSuite = execlib.execSuite,
      registry = execSuite.registry,
      taskRegistry = execSuite.taskRegistry,
      SubServiceExtractor = execSuite.StateSubServiceExtractor,
      StateSource = execSuite.StateSource,
      ADS = execSuite.ADS,
      dataSuite = execlib.dataSuite,
      MemoryStorage = dataSuite.MemoryStorage,
      DataDecoder = dataSuite.DataDecoder;


  function Consumer(prophash){
    this.lmTask = taskRegistry.spawn('acquireSink',{
      connectionString: prophash.connectionstring,
      propertyhash: {},
      identity: {ip:{name:'needsmonitor'}},
      onSink: this.takeLMSink.bind(this)
    });
    this.spawningsink = prophash.spawningsink;
    this.ports = prophash.ports;
    this.connectionstring = prophash.connectionstring;
    this.myip = null;
    this.needs = null;
    this.decoder = null;
    this.spawningsink.extendTo(this);
  }
  Consumer.prototype.destroy = function(){
    if(!this.ready){
      return;
    }
    if(this.decoder){
      this.decoder.destroy();
      this.decoder = null;
    }
    this.decoder = null;
    if(this.needs){
      this.needs.destroy();
      this.needs = null;
    }
    this.needs = null;
    this.connectionstring = null;
    this.spawningsink = null;
  };
  Consumer.prototype.go = function(){
    this.lmTask.go();
    /*
    registry.spawn({},this.connectionstring,{ip:{name:'needsmonitor'}}).done(
    this.takeLMSink.bind(this),
    function(){
      console.log('No Lan Manager',arguments);
    });
    */
  };
  Consumer.prototype.takeLMSink = function(lmsink){
    lmsink.call('registerPorts',this.ports).done(
      this.startConsumingLM.bind(this,lmsink)
    );
  };
  Consumer.prototype.startConsumingLM = function(lmsink){
    var initmap = new lib.Map;
    initmap.add('needs',{identity:{role:'user'},propertyhash:{}});
    lmsink.consumeChannel('s',StateSource.chain([
      new SubServiceExtractor(lmsink,initmap,this.takeNeedsSink.bind(this,lmsink),true),
      ADS.listenToScalar(['name'],{rawsetter:this.onName.bind(this)})
    ]));
  };
  Consumer.prototype.onName = function(name){
    this.myip = name;
  };
  Consumer.prototype.takeNeedsSink = function(lmsink,subname,needssink){
    if(subname!=='needs'){
      return;
    }
    if(!this.needs){
      this.needs = new MemoryStorage({events:true,record:needssink.recordDescriptor});
      this.spawningsink.extendTo(this.needs.events.initiated.attach(this.needsReady.bind(this,lmsink,needssink)));
      this.decoder = new DataDecoder(this.needs);
    }
    needssink.consumeChannel('s',lib.dummyFunc);
    needssink.consumeChannel('d',this.decoder);
  };
  Consumer.prototype.needsReady = function(lmsink,needssink){
    var data = this.needs.data;
    if(!(data && data.length)){
      return;
    }
    this.serveNeed(lmsink,needssink,data[0]);
  };
  Consumer.prototype.serveNeed = function(lmsink,needssink,need){
    try{
      registry.register(need.modulename);
      needssink.subConnect(need.instancename,{},{}).done(
        this.doBid.bind(this,lmsink,needssink,need),
        function(){
          console.error('nok',arguments);
        }
      );
    }
    catch(e){
      console.log(e.stack);
      console.error(e);
    }
  };
  Consumer.prototype.doBid = function(lmsink,needssink,need,needsink){
    needsink.call('bid',{}).done(
      this.doSpawn.bind(this,lmsink,needssink,need,needsink),
      function(){
        console.error('nok bid',arguments);
    });
  };
  Consumer.prototype.doSpawn = function(lmsink,needssink,need,needsink,challenge){
    console.log('doSpawn',need,needsink,challenge);
    if(!challenge.c){
      return;
    }
    this.spawningsink.call('spawn',{
      modulename:need.modulename,
      instancename:need.instancename
    }).done(
      this.onSpawned.bind(this,lmsink,needssink,need,challenge.bid,needsink),
      function(){
        console.error('spawn nok',arguments);
    });
  };
  Consumer.prototype.onSpawned = function(lmsink,needssink,need,bidticket,needsink,spawnedsink){
    lmsink.call('test',need.instancename).done(function(){
      console.log('test ok',arguments);
    },function(){
      console.error('test nok',arguments);
    });
    /*
    needsink.call('respond',bidticket,{pid:spawnedsink.pid}).done(function(){
      console.log('respond answer',arguments);
    },function(){
      console.log('respond nok',arguments);
    });
    */
  };
  return Consumer;
}

module.exports = createConsumer;
