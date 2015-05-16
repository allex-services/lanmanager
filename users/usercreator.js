function createUser(execlib,ParentUser){

  if(!ParentUser){
    ParentUser = execlib.execSuite.ServicePack.Service.prototype.userFactory.get('user');
  }

  function User(prophash){
    ParentUser.call(this,prophash);
  }
  ParentUser.inherit(User,require('../methoddescriptors/user'));
  User.prototype.__cleanUp = function(){
    ParentUser.prototype.__cleanUp.call(this);
  };
  User.prototype.registerPorts = function(portsdescriptor,defer){
    console.log(this.get('name'),'registerPorts',portsdescriptor,defer);
    defer.resolve({ok:portsdescriptor});
  };
  User.prototype.test = function(instancename,defer){
    console.log(this.get('name'),'test',instancename,'?');
    defer.resolve({ok:instancename});
  };
  User.stateFilter = ['haveneeds'];

  return User;
}

module.exports = createUser;
