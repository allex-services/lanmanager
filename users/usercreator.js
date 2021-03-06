function createUser(execlib,ParentUser){
  'use strict';
  var lib = execlib.lib,
      q = lib.q,
      qlib = lib.qlib,
      execSuite = execlib.execSuite,
      taskRegistry = execSuite.taskRegistry;

  if(!ParentUser){
    ParentUser = execlib.execSuite.ServicePack.Service.prototype.userFactory.get('user');
  }

  function User(prophash){
    ParentUser.call(this,prophash);
  }
  ParentUser.inherit(User,require('../methoddescriptors/user'),['haveneeds','haveservices', 'haveengaged_modules','havenat']);
  User.prototype.destroy = function(){
    console.log('User',this.get('name'),'down, deleting the record');
    this.__service.subservices.get('services').call('delete',{
      op: 'eq',
      field: 'ipaddress',
      value: this.get('name')
    }).done(
      this.reallyDestroy.bind(this)
    );
  };
  User.prototype.reallyDestroy = function(){
    ParentUser.prototype.destroy.call(this);
  };
  User.prototype.notifyServiceDown = function(deadinstancename,defer){
    console.log(deadinstancename,'is dead');
    return qlib.promise2defer(this.__service.subservices.get('services').call('delete',{
      op: 'eq',
      field: 'instancename',
      value: deadinstancename
    }), defer);
  };
  User.prototype.notifyModuleEngaged = function(modulename,defer){
    if(!this.destroyed){
      return;
    }
    var me = this.__service.subservices.get('engaged_modules');
    if(!me){
      lib.runNext(this.notifyModuleEngaged.bind(this,modulename,defer),500);
      return;
    }
    me.call('update',{modulename:modulename},{upsert:true}).done(
      defer.resolve.bind(defer,modulename),
      defer.reject.bind(defer)
    );
  };
  User.prototype.addNeed = function (needobj, defer) {
    qlib.promise2defer(this.__service.addNeed(needobj), defer);
  };
  User.prototype.removeNeed = function (instancename, defer) {
    qlib.promise2defer(this.__service.removeNeed(instancename), defer);
  };

  return User;
}

module.exports = createUser;
