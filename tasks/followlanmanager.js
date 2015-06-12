function createLMFollower(execlib){
  'use strict';
  var lib = execlib.lib,
      q = lib.q,
      execSuite = execlib.execSuite,
      MultiDestroyableTask = execSuite.MultiDestroyableTask,
      taskRegistry = execSuite.taskRegistry;
  function LanManagerFollower(prophash){
    MultiDestroyableTask.call(this,prophash,['lanmanagerstate','sink']);
    this.state = prophash.lanmanagerstate;
    this.sink = prophash.sink;
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
        }]
      });
    }
  };
  LanManagerFollower.prototype.takeServicesSubSink = function(sink){
    taskRegistry.run('forwardData',{
      sink:sink,
      childsink:this.sink
    });
  };
  LanManagerFollower.prototype.compulsoryConstructionProperties = ['lanmanagerstate','sink'];
  return LanManagerFollower;
}

module.exports = createLMFollower;
