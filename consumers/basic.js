function createConsumer(execlib){
  var lib = execlib.lib,
      execSuite = execlib.execSuite,
      SubServiceExtractor = execSuite.StateSubServiceExtractor,
      StateSource = execSuite.StateSource,
      ADS = execSuite.ADS,
      StreamBlackHole = execSuite.StreamBlackHole,
      dataSuite = execlib.dataSuite,
      MemoryStorage = dataSuite.MemoryStorage,
      DataDecoder = dataSuite.DataDecoder;


  function Consumer(){
    this.ready = new lib.HookCollection();
    this.needs = null;
    this.decoder = null;
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
    this.ready.destruct();
    this.ready = null;
  };
  Consumer.prototype.takeSink = function(sink){
    console.log('lm user sink',sink.clientuser.client.identity.session);
    //new NeedsWaiter(this,sink);
    var initmap = new lib.Map;
    initmap.add('needs',{identity:{role:'user'},propertyhash:{}});
    sink.consumeChannel('s',StateSource.chain([new SubServiceExtractor(sink,initmap,this.takeSubSink.bind(this),true),new StreamBlackHole]));
  };
  Consumer.prototype.takeSubSink = function(subname,sink){
    if(!this.needs){
      this.needs = new MemoryStorage({events:true,record:sink.recordDescriptor});
      this.needs.events.initiated.attach(this.ready.fire.bind(this.ready,this));
      this.decoder = new DataDecoder(this.needs);
    }
    sink.consumeChannel('s',lib.dummyFunc);
    sink.consumeChannel('d',this.decoder);
  };
  return Consumer;
}

module.exports = createConsumer;
