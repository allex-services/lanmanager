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
  }
  ParentUser.inherit(User,require('../methoddescriptors/user'),['haveneeds','haveservices']);
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
    this.__service.subservices.get('services').call('delete',{
      op: 'eq',
      field: 'instancename',
      value: deadinstancename
    }).done(
      defer.resolve.bind(defer),
      defer.reject.bind(defer),
      defer.notify.bind(defer)
    );
  };

  return User;
}

module.exports = createUser;
