var arrayoperationscreator = require('allex_arrayoperationslowlevellib');
function extendWithNeedsFunctionality (execlib, LMService) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    qlib = lib.qlib,
    execSuite = execlib.execSuite,
    taskRegistry = execSuite.taskRegistry,
    storageManipulation = require('./storagemanipulationcreator')(execlib),
    NeedsWriterJob = storageManipulation.NeedsWriterJob,
    arrayOperations = arrayoperationscreator(lib.extend, lib.readPropertyFromDotDelimitedString, lib.isFunction, lib.Map, lib.AllexJSONizingError);

  function fetchJSON (sink, fname, deflt, defer) {
    taskRegistry.run('fetchOrCreateWithData', {
      sink: sink,
      filename: fname,
      parsermodulename: 'allex_jsonparser',
      data: deflt,
      cb: defer.resolve.bind(defer),
      singleshot: true
    });
  }

  function extenderoradder(doadd, res, need) {
    var needinstancename = need.instancename, toextend;
    if (!needinstancename) {
      return res;
    }
    toextend = arrayOperations.findElementWithProperty(res, 'instancename', need.instancename);
    if (!toextend) {
      if (doadd) {
        res.push(need);
      }
      return res;
    }
    lib.extend(toextend, need);
    return res;
  }

  function extender (res, need) {
    return extenderoradder(false, res, need);
  }

  function adder (res, need) {
    return extenderoradder(true, res, need);
  }

  function onLayersRead (defer, files) {
    var needs = files[0].value,
      needsovl = files[1].value,
      needsrt = files[2].value;
    if (needs === null) {
      console.error('needs could not be JSON.parsed');
      defer.reject(new lib.Error('NO_NEEDS', 'needs could not be JSON.parsed'));
      return;
    }
    if (needsovl === null) {
      console.error('needs.overlay could not be JSON.parsed');
      defer.reject(new lib.Error('NO_NEEDS_OVERLAY', 'needs.overlay could not be JSON.parsed'));
      return;
    }
    if (needsrt === null) {
      console.error('needs.runtime could not be JSON.parsed');
      defer.reject(new lib.Error('NO_NEEDS_RUNTIME', 'needs.runtime could not be JSON.parsed'));
      return;
    }
    needsovl.reduce(extender, needs);
    needsrt.reduce(adder, needs);
    defer.resolve(needs);
  }

  LMService.prototype.readNeedsLayers = execSuite.dependentServiceMethod(['storage_usersink', 'rtstorage_usersink'], [], function (storagesink, rtstoragesink, defer) {
    var dn = q.defer(), dovl = q.defer(), drt = q.defer();
    q.allSettled([
      dn.promise,
      dovl.promise,
      drt.promise
    ]).then(onLayersRead.bind(this, defer));
    fetchJSON(storagesink, 'needs', [{
      modulename: 'allex_timeservice',
      instancename: 'Time',
      propertyhash: {}
    }], dn);
    fetchJSON(rtstoragesink, 'needs.overlay', [], dovl);
    fetchJSON(rtstoragesink, 'needs.runtime', [], drt);
  });

  LMService.prototype.saveOriginalNeeds = execSuite.dependentServiceMethod(['rtstorage_usersink'], [], function (storagesink, defer) {
    qlib.promise2defer( (new NeedsWriterJob(storagesink, this.originalNeeds)).go(), defer);
  });
}

module.exports = extendWithNeedsFunctionality;
