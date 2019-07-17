#!/usr/bin/env node
/** *****************************************************************************
 * CLI
 *
 * @author       Isaac Suttell <isaac_suttell@playstation.sony.com>
 * @file         Command Line Interface for the server
 ***************************************************************************** */

const program = require('commander');
const pkg = require(require('path').resolve(`${__dirname}/../package.json`));
const path = require('path');
const Promise = require('bluebird');
const mkdirp = require('mkdirp');
const fs = require('fs');
const { spawn } = require('child_process');
const Create = require('./lib/Create');

const SERVER_ROOT = path.resolve(process.cwd(), './server');

function runCmd(cmd, args, config) {
  return new Promise((resolve, reject) => {
    const command = spawn(cmd, args);

    command.stdout.on('data', data => {
      if (config.verbose) {
        console.log(data.toString());
      }
    });

    command.stderr.on('data', data => {
      if (config.verbose) {
        console.log(data.toString());
      }
    });

    command.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error('Non zero exit code'));
      }
    });
  });
}

function createDirectory(dir) {
  return new Promise((resolve, reject) => {
    mkdirp(dir, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function createDirectories(paths, config) {
  return Promise.each(paths, dir => {
    if (config.verbose) {
      console.log('Creating directory %s', dir);
    }
    return createDirectory(dir);
  });
}

/**
 * Stream a file from one place to another. Supports cross partitions
 * @param  {String} original File path to copy
 * @param  {String} target   Destination of to copy to
 * @return {Promise}
 */
function copyFile(original, target) {
  return new Promise((resolve, reject) => {
    const source = fs.createReadStream(original);
    const dest = fs.createWriteStream(target);

    // Copy
    source.pipe(dest);

    // Complete
    source.on('end', resolve);

    // Error!
    source.on('error', reject);
  });
}

program
  .version(pkg.version)
  .option('-v, --verbose', 'Display some extra details')
  .usage('[options] <name>')
  .action((name, config) => {
    if (typeof name !== 'string' || name.length === 0) {
      program.outputHelp();
      process.exit(0);
    }

    const paths = [
      SERVER_ROOT,
      path.resolve(SERVER_ROOT, './controllers'),
      path.resolve(SERVER_ROOT, './middleware'),
      path.resolve(SERVER_ROOT, './models'),
      path.resolve(SERVER_ROOT, './lib'),
      path.resolve(SERVER_ROOT, './views'),
      path.resolve(process.cwd(), './config'),
    ];

    createDirectories(paths, config)
      .then(() => {
        const filename = path.resolve(process.cwd(), './server/controllers/IndexController.js');

        if (config.verbose) {
          console.log('Creating controller %s', filename);
        }

        return Create.controller(filename, 'IndexController').catch(err => {
          console.log('There was a problem writing %s, skipping...', filename);
          if (config.verbose) {
            console.error(err);
          }
        });
      })
      .then(() => {
        const files = [
          {
            from: path.resolve(__dirname, '../config/default.js'),
            to: path.resolve(process.cwd(), './config/default.js'),
          },
          {
            from: path.resolve(__dirname, './templates/ceres.js'),
            to: path.resolve(process.cwd(), `./${name}.js`),
          },
          {
            from: path.resolve(__dirname, './templates/ceres-run.js'),
            to: path.resolve(process.cwd(), `./${name}-run.js`),
          },
          {
            from: path.resolve(__dirname, './templates/ceres-init.js'),
            to: path.resolve(process.cwd(), `./${name}-init.js`),
          },
        ];

        return Promise.each(files, file => {
          if (config.verbose) {
            console.log('Saving file to %s', file.to);
          }
          return copyFile(file.from, file.to);
        });
      })
      .then(() => {
        const commands = [
          {
            cmd: 'npm',
            args: ['init', '-y'],
          },
          {
            cmd: 'npm',
            args: ['install', 'ceres-framework@latest', '--save'],
          },
          {
            cmd: 'chmod',
            args: ['u+x', path.resolve(process.cwd(), `./${name}.js`)],
          },
        ];

        return Promise.each(commands, item => {
          if (config.verbose) {
            console.log('Running %s %s', item.cmd, item.args.join(' '));
          }
          return runCmd(item.cmd, item.args, config);
        });
      })
      .then(() => {
        console.log('Success');
      })
      .catch(err => {
        console.error(err.stack);
        process.exit(1);
      });
  })
  .parse(process.argv);

if (program.args.length === 0) {
  program.outputHelp();
  process.exit();
}
