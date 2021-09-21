function createUser(execlib,ParentUser){
  'use strict';
  var lib = execlib.lib,
      q = lib.q,
      qlib = lib.qlib,
      execSuite = execlib.execSuite,
      taskRegistry = execSuite.taskRegistry,
      UserSession;

  if(!ParentUser){
    ParentUser = execlib.execSuite.ServicePack.Service.prototype.userFactory.get('user');
  }

  var ParentUserSession = ParentUser.prototype.getSessionCtor('.');

  function UserSession (user,session,gate) {
    ParentUserSession.call(this,user,session,gate);
    this.user.deleteMyNeeds();
  }
  ParentUserSession.inherit(UserSession,{});

  function User(prophash){
    ParentUser.call(this,prophash);
  }
  ParentUser.inherit(User,require('../methoddescriptors/user'),['haveneeds','haveservices', 'haveengaged_modules','havenat']);
  User.prototype.startTheDyingProcedure = function (exception) {
    this.deleteMyNeeds().done(
      this.baseStartTheDyingProcedure.bind(this, exception)
    );
  };
  User.prototype.baseStartTheDyingProcedure = function (exception) {
    ParentUser.prototype.startTheDyingProcedure.call(this, exception);
  };
  User.prototype.deleteMyNeeds = function () {
    return this.__service.subservices.get('services').call('delete',{
      op: 'eq',
      field: 'ipaddress',
      value: this.get('name')
    });
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

  User.prototype.getSessionCtor = execSuite.userSessionFactoryCreator(UserSession);

  return User;
}

module.exports = createUser;
