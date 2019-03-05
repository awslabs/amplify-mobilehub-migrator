// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
module.exports = {
  name: 'import',
  run: async (context) => {
    try {
      await context.importProject(context);
    } catch (e) {
      context.print.error(`An error occured trying to run the command ${e.message}`);
    }
  },
};
