'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Comment extends Model {
    static associate(models) {
      Comment.belongsTo(models.User, { foreignKey: 'authorId', as: 'author' });
      Comment.belongsTo(models.Tweet, { foreignKey: 'tweetId', as: 'tweet' });
    }
  }
  Comment.init({
    text: {
      type: DataTypes.STRING(280),
      allowNull: false,
      validate: { notEmpty: true, len: [1, 280] }
    },
    authorId: { type: DataTypes.INTEGER, allowNull: false },
    tweetId: { type: DataTypes.INTEGER, allowNull: false }
  }, { sequelize, modelName: 'Comment' });
  return Comment;
};
