function createLMFollower(execlib){
  'use strict';
  var lib = execlib.lib,
      q = lib.q,
      execSuite = execlib.execSuite,
      MultiDestroyableTask = execSuite.MultiDestroyableTask,
      taskRegistry = execSuite.taskRegistry;
  function LanManagerFollower(prophash){
    MultiDestroyableTask.call(this,prophash,['lanmanagerstate','availablelanservicessink','natsink']);
    this.state = prophash.lanmanagerstate;
    this.availablelanservicessink = prophash.availablelanservicessink;
    this.natsink = prophash.natsink;
    this.subsinkfollower = null;
  }
  lib.inherit(LanManagerFollower,MultiDestroyableTask);
  LanManagerFollower.prototype.__cleanUp = function(){
    this.subsinkfollower = null;
    this.state = null;
    MultiDestroyableTask.prototype.__cleanUp.call(this);
  };
  LanManagerFollower.prototype.go = function(){
    if(!this.subsinkfollower){
      this.subsinkfollower = taskRegistry.run('acquireSubSinks',{
        state: this.state,
        subinits:[{
          name: 'services',
          identity: {role:'user'},
          propertyhash: {},
          cb: this.takeServicesSubSink.bind(this)
        },{
          name: 'nat',
          identity: {role:'user'},
          propertyhash: {},
          cb: this.takeNatSubSink.bind(this)
        }]
      });
    }
  };
  LanManagerFollower.prototype.takeServicesSubSink = function(sink){
    if (!sink) {
      return;
    }
    taskRegistry.run('forwardData',{
      sink:sink,
      childsink:this.availablelanservicessink
    });
  };
  LanManagerFollower.prototype.takeNatSubSink = function(sink){
    if (!sink) {
      return;
    }
    taskRegistry.run('forwardData',{
      sink:sink,
      childsink:this.natsink
    });
  };
  LanManagerFollower.prototype.compulsoryConstructionProperties = ['lanmanagerstate','availablelanservicessink','natsink'];
  return LanManagerFollower;
}

module.exports = createLMFollower;
