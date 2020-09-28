#!/usr/bin/env node

const stream = require('stream');
const util = require('util');
const zlib = require('zlib');
const fs = require('fs');

const pipeline = util.promisify(stream.pipeline);

const dropbox_v2_api = require('dropbox-v2-api');
const exitHook = require('async-exit-hook');

const argv = require('yargs')(process.argv.slice(2))
  .command('$0 [path]', 'Pipe stdin to Dropbox path', yargs => {
    yargs.positional('path', {
      describe: 'path to save to',
      type: 'string'
    })
  }, argv => {
    argv.path = '/' + argv.path.replace(/^(\/*)/, '');
  })
  .option('verbose', {
    alias: 'v',
    description: 'Enable verbose output',
    type: 'boolean',
    default: false
  })
  .option('compress', {
    alias: 'z',
    description: 'Enable compression',
    type: 'boolean',
    default: false
  })
  .help()
  .alias('help', 'h')
  .argv;

const dropbox = dropbox_v2_api.authenticate({
  token: process.env.DROPBOX_TOKEN
});

const createUploadStream = (filePath, callback) =>
  dropbox({
    resource: 'files/upload',
    parameters: { path: filePath }
  }, callback);

const upload = async () =>
  new Promise((resolve, reject) => {
    args = [ process.stdin ];
    if (argv.compress) {
      argv.path += '.zip';
      args.push(zlib.createGzip());
    }

    promise = pipeline(
      ...args,
      createUploadStream(argv.path, (error, result) => {
        if (error) promise.then(() => reject(error));
        else promise.then(() => resolve(result));
      })
    ).catch(reject);
  });

(pendingUpload = upload())
  .then(result => {
    if (argv.verbose)
      console.log('SUCCESS', result);
  })
  .catch(error => {
    if (argv.verbose)
      console.error('ERROR', error);
    process.exit(1);
  });

exitHook(exit => pendingUpload.finally(exit));
