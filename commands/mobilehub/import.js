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
    const header = 'amplify mobilehub <subcommand> <projectId>';
    const commands = [
      {
        name: 'import',
        description: 'Imports existing mobile hub resources to be used with amplify',
      },
    ];
    context.amplify.showHelp(header, commands);
    context.print.info('');
  },
};
