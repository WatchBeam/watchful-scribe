const chai = require('chai');
chai.use(require('chai-subset'));

global.expect = chai.expect;
global.assert = chai.assert;
global.sinon = require('sinon');
