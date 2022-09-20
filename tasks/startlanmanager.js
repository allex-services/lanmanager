function createStartLanManager(execlib) {
  /*
  StartLanManager Task expects cb and config in its prophash. Cb is cb.
  config example:
  {
    needs: [{
      modulename: 'allex_someservice',
      instancename: 'instance',
      propertyhash: {
      }
    }],
    nat: [{
      "iaddress": "192.168.1.1",
      "iport": 12345,
      "eaddress": "1.2.3.4",
      "eport": 80
    }],
    boot: {
      portcorrection: 5,
      runtimedirectory: "/whatever"
    },
    subnets: [
      '192.168.1.0/8'
    ]
  }
  */
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    Task = execSuite.Task,
    localhostsubnet = [{
      ip: '127.0.0.1/32',
      role: 'user'
    }];

  function subnetpusher (res, subnet) {
    res.push({ip:subnet, role: 'user'});
    return res;
  }
  function ipstrategies (subnets) {
    if (!lib.isArray(subnets)) {
      return {ip: []};
    }
    return {
      ip: subnets.reduce(subnetpusher, localhostsubnet.slice())
    };
  }

  function portBuilder(conf, port) {
    var ret = lib.extend({}, port);
    if (conf.boot && !isNaN(parseInt(conf.boot.portcorrection))) {
      console.log('correcting', ret, 'by', conf.boot.portcorrection);
      ret.port += conf.boot.portcorrection;
    }
    ret.strategies = ipstrategies(conf.subnets);
    return ret;
  }

  function StartLanManager(prophash){
    Task.call(this, prophash);
    this.config = prophash.config;
    this.cb = prophash.cb;
  }
  StartLanManager.prototype.destroy = function () {
    this.cb = null;
    this.config = null;
    Task.prototype.destroy.call(this);
  };
  StartLanManager.prototype.go = function () {
    var conf = this.config;
    console.log('starting with conf',require('util').inspect(conf, {depth:7}));
    execlib.execSuite.start({
      service:{
        instancename: 'LanManager',
        modulename: 'allex_lanmanagerservice',
        propertyhash: {
          runtimedirectory: conf.boot.runtimedirectory,
          needs: conf.needs,
          nat: conf.nat,
          ipstrategies: (ipstrategies(conf.subnets)).ip,
          httpmonitorport: conf.boot.httpmonitorport
        }
      },
      gate: conf.boot.gate,
      ports: execlib.execSuite.lanManagerPorts.map(portBuilder.bind(null, conf))
    }).done(this.cb);
    conf = null;
  };

  StartLanManager.prototype.compulsoryConstructionProperties = ['config', 'cb'];

  return StartLanManager;
}

module.exports = createStartLanManager;
