function createUser(execlib,ParentUser){
  var lib = execlib.lib,
      q = lib.q,
      execSuite = execlib.execSuite,
      taskRegistry = execSuite.taskRegistry;

  if(!ParentUser){
    ParentUser = execlib.execSuite.ServicePack.Service.prototype.userFactory.get('user');
  }

  function User(prophash){
    ParentUser.call(this,prophash);
    this.set('ip',prophash.ip);
  }
  ParentUser.inherit(User,require('../methoddescriptors/user'),['haveneeds'],require('../visiblefields/user'));
  User.prototype.__cleanUp = function(){
    ParentUser.prototype.__cleanUp.call(this);
  };
  User.prototype.registerNewService = function(runningservicedescriptor,defer){
    console.log('registerNewService',runningservicedescriptor);
    var needservice = this.__service.subservices.get('needs').subConnect(runningservicedescriptor.instancename,{name:this.get('name'),role:'user'},{}).done(
      this.notifyNeedService.bind(this,defer,runningservicedescriptor),
      defer.reject.bind(defer)
    );
  };
  User.prototype.notifyNeedService = function(defer,runningservicedescriptor,needsink){
    console.log('registerRunning',needsink.modulename,needsink.role);
    needsink.call('registerRunning',runningservicedescriptor).done(
      this.onNeedServiceNotified.bind(this,defer,runningservicedescriptor),
      defer.reject.bind(defer)
    );
  };
  User.prototype.onNeedServiceNotified = function(defer,runningservicedescriptor,result){
    defer.resolve(result);
  };
  User.prototype.registerDeadService = function(deadinstancename,defer){
    console.log(deadinstancename,'is dead');
    defer.resolve('ok');
  };

  return User;
}

module.exports = createUser;
