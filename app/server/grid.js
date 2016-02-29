"use strict"

class Queue {
  constructor(name) {
    this.name = name
    this.hosts = {}
    this.jobs = {}
    this.name2jobid = {}
    this.nextid = 1

    setInterval(() => this.runJobs(), 1000)
  }

  addHost(host) {
    console.log('Added host', host.id)
    this.hosts[host.id] = new Worker({ id: host.id, master: this, slots: host.slots })
    setImmediate(() => this.runJobs())
  }

  addJob(job) {
    // generate id
    job.id = this.nextid
    this.nextid++

    // status
    job.status = 'pending'
    this.jobs[job.id] = job
    this.name2jobid[job.name] = job.id
    console.log('Added job', job.name, job.id)
    return job.id
  }

  updateJob(id, status) {
    this.jobs[id].status = status
  }

  runJobs() {
    let job = this.nextJob()

    if (job) {
      for (let hostid in this.hosts) {
        let host = this.hosts[hostid]
        job.status = 'scheduled'
        host.runJob(job.id, { slots: job.slots }, job.scripts.run)
        return
      }
    }
  }

  nextJob() {
    var self = this

    function depsdone(deps) {
      if (!deps) return true;
      for (var i in deps) {
        var job = self.jobs[self.name2jobid[deps[i]]];
        if (job.status != 'finished' || !depsdone(job.depends)) {
          return false;
        }
      }
      return true;
    }

    function depsfailed(deps) {
      if (!deps) return false;
      for (var i in deps) {
        var job = self.jobs[self.name2jobid[deps[i]]];
        if (job.status == 'failed' || job.status == 'canceled' || depsfailed(job.depends)) {
          return true;
        }
      }
      return false;
    }

    var jobs = Object.keys(this.jobs).map(key => this.jobs[key])
      .filter(job => job.status == 'pending')
      .filter(job => depsdone(job.depends))
      .filter(job => !depsfailed(job.depends))
      .sort((a, b) => b.priority - a.priority)

    // take priority
    console.log('Available jobs')
    console.log(jobs.map(job => [job.id, job.name, job.status, job.priority, job.depends]))

    return jobs[0]
  }
}

class Worker {
  constructor(options) {
    options = options || {}
    this.master = options.master
    this.id = options.id
    this.slots = options.slots || 1
    this.jobs = {}
  }

  runJob(id, res, spec) {
    if (!id) throw Error('No job id');
    if (this.jobs[id]) throw Error('Duplicate job id');
    if (!spec) throw Error('No spec');
    if (!spec.cmd) throw Error('Missing command to execute');

    var self = this;

    function stillExists() {
      return !!self.jobs[id];
    }

    function progress(p) {
      if (!stillExists()) return;
      if (self.master) self.master.updateJob(id, 'running', p);
    }

    function done(success, state) {
      if (!stillExists()) return;
      delete self.jobs[id];
      if (self.master) self.master.updateJob(id, state);
    }

    self.jobs[id] = {
      id: id,
      resources: res,
      spec: spec,
      script: this.execute(spec, progress, done)
    }
  }

  execute(spec, progress, done) {
    var child_process = require('child_process')
    var fs = require('fs');

    //console.log('running ' + spec.name)

    // run script via bash
    var script = child_process.spawn('bash', ['-c', spec.cmd]);
    var canceled = false;

    // write stdout, stderr to files
    if (spec.stdout) script.stdout.pipe(fs.createWriteStream(spec.stdout));
    if (spec.stderr) script.stderr.pipe(fs.createWriteStream(spec.stderr));

    // watch how long it takes
    var timedOut = false, timeoutTimer = null;
    if (spec.timeout > 0) {
      timeoutTimer = setTimeout(function() {
        if (!script) return; // already finished
        timedOut = true;
        script.kill();
      }, spec.timeout);
    }

    // report progress
    var progressTimer = null;
    if (spec.progress && spec.progress.interval > 0) {
      var lastid = 0;
      progressTimer = setInterval(function() {
        if (!script) return; // already finished
        //console.log('checking progress for ' + spec.name)
        var currid = lastid;
        child_process.exec(spec.progress.cmd, { timeout: spec.progress.timeout || 0 }, function(err, stdout) {
          if (!script) return; // already finished
          if (currid != lastid) return;
          lastid++;
          progress && progress(!err ? stdout : null);
        });
      }, spec.progress.interval);
    }

    function onDone(code) {
      if (progressTimer) clearInterval(progressTimer)
      if (timeoutTimer) clearTimeout(timeoutTimer)
      var status = 'finished';
      if (code === null) status = 'error';
      if (timedOut) status = 'timeout';
      if (canceled) status = 'canceled';
      script = null;
      done && done(code === 0, status)
    }

    script.once('error', function(err) {
      //console.log('job '+spec.name+' error ' + err)
      onDone(null);
    });
    script.once('exit', function(code, signal) {
      //console.log('job '+spec.name+' exited with code ' + code + ' ' + signal)
      onDone(code);
    });

    return {
      cancel: function() {
        canceled = true;
        script.kill();
      }
    };
  }
}

var queue = new Queue('main')
queue.addHost({ id: 'h1', host: 'localhost', slots: 2 })
//queue.addHost({ id: 'h2', host: 'localhost2', slots: 4 })

queue.addJob({
  name: 'tokenize-src',
  priority: 0,
  slots: 1,
  scripts: {
    run: {
      cmd: 'echo started && sleep 3 && echo yolo',
      stdout: 'tokenize-src.stdout.txt', stderr: 'tokenize-src.stderr.txt',
      exit: { success: 0 },
      timeout: 5000
    },
    progress: {
      interval: 1000
    }
  }
})

queue.addJob({
  name: 'tokenize-trg',
  priority: 1,
  slots: 1,
  scripts: {
    run: {
      cmd: 'echo started && sleep 3 && echo yolo',
      stdout: 'tokenize-trg.stdout.txt', stderr: 'tokenize-trg.stderr.txt',
      exit: { success: 0 },
      timeout: 5000
    },
    progress: {
      interval: 1000
    }
  }
})

queue.addJob({
  name: 'fastalign',
  priority: 0,
  slots: 2,
  depends: ['tokenize-src', 'tokenize-trg'],
  scripts: {
    run: {
      cmd: 'echo started && sleep 3 && echo yolo',
      stdout: 'fast-align.stdout.txt', stderr: 'fast-align.stderr.txt',
      exit: { success: 0 },
      timeout: 5000
    }
  }
})

queue.addJob({
  name: 'fastalign-inverse',
  priority: 0,
  slots: 2,
  depends: ['tokenize-src', 'tokenize-trg'],
  scripts: {
    run: {
      cmd: 'echo started && sleep 3 && echo yolo',
      stdout: 'fast-align-inverse.stdout.txt', stderr: 'fast-align-inverse.stderr.txt',
      exit: { success: 0 },
      timeout: 5000
    }
  }
})
