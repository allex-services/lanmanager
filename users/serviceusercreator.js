function createServiceUser(execlib,ParentUser){
  'use strict';

  if(!ParentUser){
    ParentUser = execlib.execSuite.ServicePack.Service.prototype.userFactory.get('user');
  }

  var lib = execlib.lib,
    q = lib.q,
    qlib = lib.qlib;

  function ServiceUser(prophash){
    ParentUser.call(this,prophash);
  }
  ParentUser.inherit(ServiceUser,require('../methoddescriptors/serviceuser'));
  ServiceUser.prototype.__cleanUp = function(){
    ParentUser.prototype.__cleanUp.call(this);
  };

  return ServiceUser;
}

module.exports = createServiceUser;
