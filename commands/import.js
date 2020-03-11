// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
async function run(context) {
  try {
    await context.importProject(context);
  } catch (err) {
    context.print.error(`An error occured trying to run the command ${err}`);
  }
}

module.exports = {
  run,
};
