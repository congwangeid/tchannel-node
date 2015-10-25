// Copyright (c) 2015 Uber Technologies, Inc.

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

'use strict';

var bufrw = require('bufrw');

var ObjectPool = require('../lib/object-pool.js');

module.exports.Request = PingRequest;
module.exports.Response = PingResponse;

function PingRequest() {
    var self = this;
    self.type = PingRequest.TypeCode;
}

ObjectPool.setup(PingRequest);

PingRequest.TypeCode = 0xd0;
PingRequest.RW = bufrw.Base(pingReqLength, readPingReqFrom, writePingReqInto);

function pingReqLength(body) {
    return bufrw.LengthResult.just(0);
}

function readPingReqFrom(buffer, offset) {
    var body = PingRequest.alloc();
    return bufrw.ReadResult.just(offset, body);
}

function writePingReqInto(body, buffer, offset) {
    return bufrw.WriteResult.just(offset);
}

function PingResponse() {
    var self = this;
    self.type = PingResponse.TypeCode;
}

ObjectPool.setup(PingResponse);

PingResponse.TypeCode = 0xd1;
PingResponse.RW = bufrw.Base(pingResLength, readPingResFrom, writePingResInto);

function pingResLength(body) {
    return bufrw.LengthResult.just(0);
}

function readPingResFrom(buffer, offset) {
    var body = PingResponse.alloc();
    return bufrw.ReadResult.just(offset, body);
}

function writePingResInto(body, buffer, offset) {
    return bufrw.WriteResult.just(offset);
}
