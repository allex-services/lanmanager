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
      portcorrection: 5
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
    Task = execSuite.Task;

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
    function ipstrategies(){
      var _subnets = [{
        ip: '127.0.0.1/32',
        role: 'user'
      }];
      conf.subnets.forEach(function(subnet){
        _subnets.push({ip:subnet,role:'user'});
      });
      return {
        ip: _subnets
      };
    }
    console.log('starting with conf',conf);
    execlib.execSuite.lanManagerPorts.forEach(function(port){
      if (conf.boot && !isNaN(parseInt(conf.boot.portcorrection))) {
        console.log('correcting', port, 'by', conf.boot.portcorrection);
        port.port += conf.boot.portcorrection;
      }
      port.strategies = ipstrategies();
    });
    console.log('ports to open',require('util').inspect(execlib.execSuite.lanManagerPorts,{depth:null}));
    execlib.execSuite.start({
      service:{
        instancename: 'LanManager',
        modulename: 'allex_lanmanagerservice',
        propertyhash: {
          needs: conf.needs,
          nat: conf.nat,
          ipstrategies: (ipstrategies()).ip
        }
      },
      ports: execlib.execSuite.lanManagerPorts
    }).done(this.cb);
  };

  StartLanManager.prototype.compulsoryConstructionProperties = ['config', 'cb'];

  return StartLanManager;
}

module.exports = createStartLanManager;
