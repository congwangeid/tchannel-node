var TChannel = require("./index"),
    metrics = require("metrics"),
    num_clients = parseInt(process.argv[2], 10) || 5,
    num_requests = 20000,
    tests = [],
    versions_logged = false,
    client_options = {
        return_buffers: false
    },
    small_str, large_str, small_buf, large_buf;

function lpad(input, len, chr) {
    var str = input.toString();
    chr = chr || " ";

    while (str.length < len) {
        str = chr + str;
    }
    return str;
}

metrics.Histogram.prototype.print_line = function () {
    var obj = this.printObj();
    
    return lpad(obj.min, 4) + "/" + lpad(obj.max, 4) + "/" + lpad(obj.mean.toFixed(2), 7) + "/" + lpad(obj.p95.toFixed(2), 7);
};

function Test(args) {
    this.args = args;

    this.arg1 = new Buffer(args.command);
    this.arg2 = args.args ? new Buffer(args.args) : null;
    this.arg3 = null;
    
    this.callback = null;
    this.clients = [];
    this.clients_ready = 0;
    this.commands_sent = 0;
    this.commands_completed = 0;
    this.max_pipeline = this.args.pipeline || num_requests;
    this.client_options = args.client_options || client_options;
    
    this.connect_latency = new metrics.Histogram();
    this.ready_latency = new metrics.Histogram();
    this.command_latency = new metrics.Histogram();
}

Test.prototype.run = function (callback) {
    var i;

    this.callback = callback;

    for (i = 0; i < num_clients ; i++) {
        this.new_client(i);
    }
};

Test.prototype.new_client = function (id) {
    var self = this, new_client;
    
    var port = 4041 + id;
    new_client = new TChannel({host: "127.0.0.1", port: port});
    new_client.create_time = Date.now();

    // sending a ping to pre-connect the socket
    new_client.send({host: '127.0.0.1:4040'}, 'ping', null, null, function () {});

    new_client.on("socketClose", function (conn, err) {
        if (err.message !== 'shutdown from quit') {
            console.log('socket close: ' + conn.remoteName + ' ' + err.message);
        }
    });

    new_client.on("identified", function (peer) {
        self.connect_latency.update(Date.now() - new_client.create_time);

        if (! versions_logged) {
            console.log("Client count: " + num_clients + ", node version: " + process.versions.node);
            versions_logged = true;
        }
        self.ready_latency.update(Date.now() - new_client.create_time);
        self.clients_ready++;
        if (self.clients_ready === self.clients.length) {
            self.on_clients_ready();
        }
    });

    self.clients[id] = new_client;
};

Test.prototype.on_clients_ready = function () {
    process.stdout.write(lpad(this.args.descr, 13) + ", " + lpad(this.args.pipeline, 5) + "/" + this.clients_ready + " ");
    this.test_start = Date.now();

    this.fill_pipeline();
};

Test.prototype.fill_pipeline = function () {
    var pipeline = this.commands_sent - this.commands_completed;

    while (this.commands_sent < num_requests && pipeline < this.max_pipeline) {
        this.commands_sent++;
        pipeline++;
        this.send_next();
    }
    
    if (this.commands_completed === num_requests) {
        this.print_stats();
        this.stop_clients();
    }
};

Test.prototype.stop_clients = function () {
    var self = this;
    
    this.clients.forEach(function (client, pos) {
        if (pos === self.clients.length - 1) {
            client.quit(function (err, res) {
                self.callback();
            });
        } else {
            client.quit();
        }
    });
};

Test.prototype.send_next = function () {
    var self = this,
        cur_client = this.commands_sent % this.clients.length,
        start = Date.now();

    this.clients[cur_client].send({host: '127.0.0.1:4040'}, this.arg1, this.arg2, this.arg3, function (err, res1, res2) {
        if (err) {
            throw err;
        }
        self.commands_completed++;
        self.command_latency.update(Date.now() - start);
        self.fill_pipeline();
    });
};

Test.prototype.print_stats = function () {
    var duration = Date.now() - this.test_start;
    
    console.log("min/max/avg/p95: " + this.command_latency.print_line() + " " + lpad(duration, 6) + "ms total, " +
        lpad((num_requests / (duration / 1000)).toFixed(2), 8) + " ops/sec");
};

small_str = "1234";
small_buf = new Buffer(small_str);
large_str = (new Array(4097).join("-"));
large_buf = new Buffer(large_str);
var small_str_set = JSON.stringify(['foo_rand000000000000', small_str]);
var small_buf_set = new Buffer(small_str_set);
var large_str_set = JSON.stringify(['foo_rand000000000001', large_str]);
var large_buf_set = new Buffer(large_str_set);

tests.push(new Test({descr: "PING", command: "ping", args: null, pipeline: 1}));
tests.push(new Test({descr: "PING", command: "ping", args: null, pipeline: 50}));
tests.push(new Test({descr: "PING", command: "ping", args: null, pipeline: 200}));
tests.push(new Test({descr: "PING", command: "ping", args: null, pipeline: 20000}));
tests.push(new Test({descr: "PING", command: "ping", args: null, pipeline: 1}));
tests.push(new Test({descr: "PING", command: "ping", args: null, pipeline: 50}));
tests.push(new Test({descr: "PING", command: "ping", args: null, pipeline: 200}));
tests.push(new Test({descr: "PING", command: "ping", args: null, pipeline: 20000}));

tests.push(new Test({descr: "SET small str", command: "set", args: small_str_set, pipeline: 1}));
tests.push(new Test({descr: "SET small str", command: "set", args: small_str_set, pipeline: 50}));
tests.push(new Test({descr: "SET small str", command: "set", args: small_str_set, pipeline: 200}));
tests.push(new Test({descr: "SET small str", command: "set", args: small_str_set, pipeline: 20000}));
tests.push(new Test({descr: "SET small str", command: "set", args: small_str_set, pipeline: 1}));
tests.push(new Test({descr: "SET small str", command: "set", args: small_str_set, pipeline: 50}));
tests.push(new Test({descr: "SET small str", command: "set", args: small_str_set, pipeline: 200}));
tests.push(new Test({descr: "SET small str", command: "set", args: small_str_set, pipeline: 20000}));

tests.push(new Test({descr: "SET small buf", command: "set", args: small_buf_set, pipeline: 1}));
tests.push(new Test({descr: "SET small buf", command: "set", args: small_buf_set, pipeline: 50}));
tests.push(new Test({descr: "SET small buf", command: "set", args: small_buf_set, pipeline: 200}));
tests.push(new Test({descr: "SET small buf", command: "set", args: small_buf_set, pipeline: 20000}));
tests.push(new Test({descr: "SET small buf", command: "set", args: small_buf_set, pipeline: 1}));
tests.push(new Test({descr: "SET small buf", command: "set", args: small_buf_set, pipeline: 50}));
tests.push(new Test({descr: "SET small buf", command: "set", args: small_buf_set, pipeline: 200}));
tests.push(new Test({descr: "SET small buf", command: "set", args: small_buf_set, pipeline: 20000}));

tests.push(new Test({descr: "GET small str", command: "get", args: "foo_rand000000000000", pipeline: 1}));
tests.push(new Test({descr: "GET small str", command: "get", args: "foo_rand000000000000", pipeline: 50}));
tests.push(new Test({descr: "GET small str", command: "get", args: "foo_rand000000000000", pipeline: 200}));
tests.push(new Test({descr: "GET small str", command: "get", args: "foo_rand000000000000", pipeline: 20000}));
tests.push(new Test({descr: "GET small str", command: "get", args: "foo_rand000000000000", pipeline: 1}));
tests.push(new Test({descr: "GET small str", command: "get", args: "foo_rand000000000000", pipeline: 50}));
tests.push(new Test({descr: "GET small str", command: "get", args: "foo_rand000000000000", pipeline: 200}));
tests.push(new Test({descr: "GET small str", command: "get", args: "foo_rand000000000000", pipeline: 20000}));

tests.push(new Test({descr: "SET large str", command: "set", args: large_str_set, pipeline: 1}));
tests.push(new Test({descr: "SET large str", command: "set", args: large_str_set, pipeline: 50}));
tests.push(new Test({descr: "SET large str", command: "set", args: large_str_set, pipeline: 200}));
tests.push(new Test({descr: "SET large str", command: "set", args: large_str_set, pipeline: 20000}));
tests.push(new Test({descr: "SET large str", command: "set", args: large_str_set, pipeline: 1}));
tests.push(new Test({descr: "SET large str", command: "set", args: large_str_set, pipeline: 50}));
tests.push(new Test({descr: "SET large str", command: "set", args: large_str_set, pipeline: 200}));
tests.push(new Test({descr: "SET large str", command: "set", args: large_str_set, pipeline: 20000}));

tests.push(new Test({descr: "SET large buf", command: "set", args: large_buf_set, pipeline: 1}));
tests.push(new Test({descr: "SET large buf", command: "set", args: large_buf_set, pipeline: 50}));
tests.push(new Test({descr: "SET large buf", command: "set", args: large_buf_set, pipeline: 200}));
tests.push(new Test({descr: "SET large buf", command: "set", args: large_buf_set, pipeline: 20000}));
tests.push(new Test({descr: "SET large buf", command: "set", args: large_buf_set, pipeline: 1}));
tests.push(new Test({descr: "SET large buf", command: "set", args: large_buf_set, pipeline: 50}));
tests.push(new Test({descr: "SET large buf", command: "set", args: large_buf_set, pipeline: 200}));
tests.push(new Test({descr: "SET large buf", command: "set", args: large_buf_set, pipeline: 20000}));

tests.push(new Test({descr: "GET large str", command: "get", args: 'foo_rand000000000001', pipeline: 1}));
tests.push(new Test({descr: "GET large str", command: "get", args: 'foo_rand000000000001', pipeline: 50}));
tests.push(new Test({descr: "GET large str", command: "get", args: 'foo_rand000000000001', pipeline: 200}));
tests.push(new Test({descr: "GET large str", command: "get", args: 'foo_rand000000000001', pipeline: 20000}));
tests.push(new Test({descr: "GET large str", command: "get", args: 'foo_rand000000000001', pipeline: 1}));
tests.push(new Test({descr: "GET large str", command: "get", args: 'foo_rand000000000001', pipeline: 50}));
tests.push(new Test({descr: "GET large str", command: "get", args: 'foo_rand000000000001', pipeline: 200}));
tests.push(new Test({descr: "GET large str", command: "get", args: 'foo_rand000000000001', pipeline: 20000}));


function next() {
    var test = tests.shift();
    if (test) {
        test.run(function () {
            next();
        });
    } else {
        console.log("End of tests.");
        process.exit(0);
    }
}

next();
