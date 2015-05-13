function createConsumer(execlib){
  var lib = execlib.lib,
      execSuite = execlib.execSuite,
      ADS = execSuite.ADS,
      dataSuite = execlib.dataSuite,
      MemoryStorage = dataSuite.MemoryStorage,
      DataDecoder = dataSuite.DataDecoder;


  function NeedsWaiter(consumer,sink){
    this.consumer = consumer;
    this.sink = sink;
    this.waiter = ADS.listenToScalar(['haveneeds'],{rawsetter:this.goToNeeds.bind(this)});
    sink.consumeChannel('s',this.waiter);
  }
  NeedsWaiter.prototype.destroy = function(){
    this.waiter.destroy();
    //this.sink.destroy();
    this.sink = null;
    this.consumer = null;
  };
  NeedsWaiter.prototype.goToNeeds = function(haveneeds){
    console.log('Needs!',haveneeds);
    this.sink.subConnect('needs',{name:'*'},{
    }).done(
      this.onNeedsSink.bind(this)
    );
  };
  NeedsWaiter.prototype.onNeedsSink = function(nsink){
    if(!nsink){
      return;
    }
    this.consumer.takeNeedsSink(nsink);
    this.destroy();
  };

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
    new NeedsWaiter(this,sink);
  };
  Consumer.prototype.takeNeedsSink = function(sink){
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
