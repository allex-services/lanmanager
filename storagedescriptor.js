module.exports = {
  events: true, //will listen to myself
  record:{
    primaryKey: 'instancename',
    fields:[{
      name: 'instancename'
    },{
      name: 'modulename'
    },{
      name: 'propertyhash'
    },{
      name: 'roleremapping'
    },{
      name: 'ipaddress'
    },{
      name: 'tcpport',
      default: 0
    },{
      name: 'httpport',
      default: 0
    },{
      name: 'wsport',
      default: 0
    },{
      name: 'created',
      default: "{{Date.now()}}"
    }]
  }
};