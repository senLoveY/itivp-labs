'use strict';

module.exports = {
  async up(query, Sequelize) {
    await query.sequelize.transaction(async transaction => {
      await query.addColumn('Users', 'status', { type: Sequelize.STRING(120), allowNull: false, defaultValue: '' }, { transaction });
      await query.addColumn('Users', 'avatar', { type: Sequelize.JSONB, allowNull: true }, { transaction });
    });
  },
  async down(query) {
    await query.sequelize.transaction(async transaction => {
      await query.removeColumn('Users', 'avatar', { transaction });
      await query.removeColumn('Users', 'status', { transaction });
    });
  }
};
