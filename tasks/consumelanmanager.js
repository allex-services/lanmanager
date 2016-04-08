function createLMConsumer(execlib){
  'use strict';
  var lib = execlib.lib,
      q = lib.q,
      execSuite = execlib.execSuite,
      DestroyableTask = execSuite.DestroyableTask,
      taskRegistry = execSuite.taskRegistry;
  function LanManagerConsumer(prophash){
    DestroyableTask.call(this,prophash,'lanmanagerstate');
    this.state = prophash.lanmanagerstate;
    this.table = prophash.table;
    this.subsinkfollower = null;
  }
  lib.inherit(LanManagerConsumer,DestroyableTask);
  LanManagerConsumer.prototype.__cleanUp = function(){
    this.subsinkfollower = null;
    this.state = null;
    DestroyableTask.prototype.__cleanUp.call(this);
  };
  LanManagerConsumer.prototype.go = function(){
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
  LanManagerConsumer.prototype.takeServicesSubSink = function(sink){
    taskRegistry.run('materializeQuery',{
      sink:sink,
      continuous: true,
      data:this.table
    });
  };
  LanManagerConsumer.prototype.compulsoryConstructionProperties = ['lanmanagerstate','table'];
  return LanManagerConsumer;
}

module.exports = createLMConsumer;
