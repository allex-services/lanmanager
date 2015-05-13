function createConsumer(execlib){
  var lib = execlib.lib,
      execSuite = execlib.execSuite,
      ADS = execSuite.ADS,
      dataSuite = execlib.dataSuite,
      MemoryStorage = dataSuite.MemoryStorage,
      DataManager = dataSuite.DataManager;


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
    if(!this.consumer.needs){
      this.consumer.needs = new DataManager(new MemoryStorage({record:nsink.recordDescriptor}));
    }
    nsink.consumeChannel('s',lib.dummyFunc);
    nsink.consumeChannel('d',this.consumer.needs);
    this.destroy();
  };

  function Consumer(){
    this.needs = null;//
  }
  Consumer.prototype.takeSink = function(sink){
    console.log('lm user sink',sink.clientuser.client.identity.session);
    new NeedsWaiter(this,sink);
  };
  return Consumer;
}

module.exports = createConsumer;
