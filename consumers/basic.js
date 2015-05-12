function createTester(execlib){
  var lib = execlib.lib,
      execSuite = execlib.execSuite,
      ADS = execSuite.ADS;

  function NeedsTerminal(sink){
  }
  NeedsTerminal.prototype.takeSink = function(sink){
    console.log('needs user sink',sink.clientuser.client.identity.session);
    sink.consumeChannel('s',function(){
      console.log('needs state',arguments);
    });
    sink.consumeChannel('d',this.onData.bind(this));
    lib.runNext(lib.dummyFunc,15000);
  };
  NeedsTerminal.prototype.onData = function(item){
    console.log('need',item);
  };


  function NeedsWaiter(sink){
    this.sink = sink;
    this.waiter = ADS.listenToScalar(['haveneeds'],{activator:this.goToNeeds.bind(this)});
    sink.consumeChannel('s',this.waiter);
  }
  NeedsWaiter.prototype.destroy = function(){
    this.waiter.destroy();
    //this.sink.destroy();
  };
  NeedsWaiter.prototype.goToNeeds = function(){
    console.log('Needs!');
    this.sink.subConnect('needs',{name:'*'},{
    }).done(
      this.onNeedsSink.bind(this)
    );
  };
  NeedsWaiter.prototype.onNeedsSink = function(nsink){
    var nt = new NeedsTerminal;
    nt.takeSink(nsink);
    this.destroy();
  };

  function Tester(){
  }
  Tester.prototype.takeSink = function(sink){
    console.log('lm user sink',sink.clientuser.client.identity.session);
    new NeedsWaiter(sink);
  };
  return Tester;
}

module.exports = createTester;
