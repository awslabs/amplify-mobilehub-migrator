module.exports = {
  name: 'import',
  run: async (context) => {
    await context.importProject(context);
  },
};
