function createStorageManipulation (execlib) {
	'use strict';

	var lib = execlib.lib,
		q = lib.q,
		qlib = lib.qlib,
		JobBase = qlib.JobBase;

  function NeedsWriterJob (storagesupersink, needsmap) {
		JobBase.call(this);
		this.supersink = storagesupersink;
		this.needsmap = needsmap;
		this.sink = null;
	}
	lib.inherit(NeedsWriterJob, JobBase);
	NeedsWriterJob.prototype.destroy = function () {
		if (this.sink) {
			this.sink.destroy();
		}
		this.sink = null;
		this.needsmap = null;
		this.supersink = null;
		JobBase.prototype.destroy.call(this);
	};
  function pusher(arry, item, itemname) {
    arry.push(item);
  }
	NeedsWriterJob.prototype.go = function () {
		this.supersink.subConnect('.', {name: 'user', role: 'user'}).then(
			this.onSink.bind(this),
			this.reject.bind(this)
		);
		return this.defer.promise;
	};
	NeedsWriterJob.prototype.onSink = function (sink) {
		var onfs = [];
		this.sink = sink;
    this.needsmap.traverse(pusher.bind(null, onfs));
		/*
		qlib.promise2defer(this.sink.call('write', 'needs', {
			parsermodulename: 'allex_jsonparser',
			modulename: 'allex_jsonparser'
		}, onfs), this.defer);
		*/
		this.sink.call('write', 'needs.runtime', {
			parsermodulename: 'allex_jsonparser',
			modulename: 'allex_jsonparser'
		}, onfs).then(
		(result) => {
			console.log('write result', result);
			this.resolve(result);
		},
		(reason) => {
			console.error('write error', reason);
			this.reject(reason);
		});
	};


	return {
		NeedsWriterJob: NeedsWriterJob
	};
}

module.exports = createStorageManipulation;
