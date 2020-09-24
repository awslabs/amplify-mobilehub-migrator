// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const { importProject } = require('../extensions/import-project');

async function run(context) {
  try {
    await importProject(context);
  } catch (err) {
    context.print.error(`An error occurred trying to run the command ${err}`);
  }
}

module.exports = {
  run,
};
